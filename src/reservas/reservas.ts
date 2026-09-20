// El corazón del sistema. Reglas 1-3 y 5 del archivo raíz viven acá.
// Este módulo conoce SOLO interfaces ajenas (regla 4 — la defiende el gate).
import type { PagosPort } from '../pagos/PagosPort';
import type { NotificacionesPort } from '../notificaciones/NotificacionesPort';
import type { RepositorioReservas } from './repositorio';
import type { GeneradorDeIds } from './GeneradorDeIdsPort';

export interface Reserva {
  id: string;
  canchaId: string;
  clienteId: string;
  inicio: Date;
  fin: Date;
  precio: number;
  pagoId: string;      // seña cobrada — sin esto no hay reserva (regla 2)
  estado: 'CONFIRMADA' | 'CANCELADA';
}

export class ErrorDeReserva extends Error {
  constructor(public codigo: 'SUPERPOSICION_DE_RESERVA' | 'SENA_RECHAZADA' | 'RANGO_INVALIDO' | 'RESERVA_INEXISTENTE' | 'ANTICIPACION_EXCESIVA') {
    super(codigo);
  }
}

interface Dependencias {
  repositorio: RepositorioReservas;
  ids: GeneradorDeIds;                 // F-007: los ids vienen de afuera, nunca de un contador del proceso
  pagos: PagosPort;
  notificaciones: NotificacionesPort;
  ahora?: () => Date;                 // inyectable para tests deterministas
}

/** Regla 5 (F-008): no se reserva con más de 30 días de anticipación. El número sale de ADR 0005:
 *  si cambia, cambia el ADR primero (guardarraíl §4b). El borde es inclusivo: 30 días exactos vale. */
const DIAS_MAXIMOS_DE_ANTICIPACION = 30;
const MILISEGUNDOS_POR_DIA = 86_400_000;

/** Dos rangos se pisan si uno empieza antes de que el otro termine.
 *  Los bordes exactos NO se pisan: fin 19:00 e inicio 19:00 conviven. */
function seSuperponen(aInicio: Date, aFin: Date, bInicio: Date, bFin: Date): boolean {
  return aInicio < bFin && bInicio < aFin;
}

export function moduloReservas(deps: Dependencias) {
  const ahora = deps.ahora ?? (() => new Date());

  return {
    /** Regla 1 (no superposición) + Regla 2 (sin seña no hay reserva) + Regla 5 (anticipación máxima). */
    async crearReserva(datos: { canchaId: string; clienteId: string; inicio: Date; fin: Date; precio: number }): Promise<Reserva> {
      if (datos.fin <= datos.inicio) throw new ErrorDeReserva('RANGO_INVALIDO');

      // Se rechaza antes de tocar nada: ni repositorio, ni cobro, ni aviso.
      const diasDeAnticipacion = (datos.inicio.getTime() - ahora().getTime()) / MILISEGUNDOS_POR_DIA;
      if (diasDeAnticipacion > DIAS_MAXIMOS_DE_ANTICIPACION) throw new ErrorDeReserva('ANTICIPACION_EXCESIVA');

      const existentes = await deps.repositorio.listarPorCancha(datos.canchaId);
      const pisada = existentes.some(r =>
        r.estado === 'CONFIRMADA' && seSuperponen(datos.inicio, datos.fin, r.inicio, r.fin));
      if (pisada) throw new ErrorDeReserva('SUPERPOSICION_DE_RESERVA');

      const cobro = await deps.pagos.cobrarSena(datos.clienteId, datos.precio);
      if (!cobro.ok) throw new ErrorDeReserva('SENA_RECHAZADA');

      const reserva: Reserva = {
        id: deps.ids.nuevoId(),
        ...datos,
        pagoId: cobro.pagoId,
        estado: 'CONFIRMADA',
      };
      await deps.repositorio.guardar(reserva);

      // Regla del módulo notificaciones: el aviso nunca tumba la operación.
      await deps.notificaciones
        .notificar(datos.clienteId, `Reserva confirmada: cancha ${datos.canchaId}, seña $${cobro.monto}`)
        .catch(() => {});

      return reserva;
    },

    /** Regla 3: +24h de anticipación → reembolso de seña; si no, sin reembolso. */
    async cancelarReserva(reservaId: string): Promise<{ reembolsada: boolean }> {
      const reserva = await deps.repositorio.buscarPorId(reservaId);
      if (!reserva || reserva.estado !== 'CONFIRMADA') throw new ErrorDeReserva('RESERVA_INEXISTENTE');

      const horasDeAnticipacion = (reserva.inicio.getTime() - ahora().getTime()) / 3_600_000;
      const corresponde = horasDeAnticipacion > 24;
      const reembolsada = corresponde ? (await deps.pagos.reembolsar(reserva.pagoId)).ok : false;

      await deps.repositorio.guardar({ ...reserva, estado: 'CANCELADA' });
      await deps.notificaciones
        .notificar(reserva.clienteId, reembolsada
          ? 'Reserva cancelada: te reembolsamos la seña'
          : 'Reserva cancelada: por la anticipación, la seña no se reembolsa')
        .catch(() => {});

      return { reembolsada };
    },
  };
}
