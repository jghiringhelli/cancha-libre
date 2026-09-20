// El corazón del sistema. Reglas 1-3 del archivo raíz viven acá.
// Este módulo conoce SOLO interfaces ajenas (regla 4 — la defiende el gate).
import type { PagosPort } from '../pagos/PagosPort';
import type { NotificacionesPort } from '../notificaciones/NotificacionesPort';
import type { RepositorioReservas } from './repositorio';

export interface Reserva {
  id: string;
  canchaId: string;
  clienteId: string;
  inicio: Date;
  fin: Date;
  precio: number;
  pagoId: string;      // seña cobrada — sin esto no hay reserva (regla 2)
  estado: 'CONFIRMADA' | 'CANCELADA';
  reprogramada: boolean; // F-004 regla 4: si fue movida, al cancelar no hay reembolso
}

export class ErrorDeReserva extends Error {
  constructor(public codigo: 'SUPERPOSICION_DE_RESERVA' | 'SENA_RECHAZADA' | 'RANGO_INVALIDO' | 'RESERVA_INEXISTENTE' | 'ANTICIPACION_INSUFICIENTE') {
    super(codigo);
  }
}

// Números de negocio: cada uno sale de su registro, no se inventa acá (archivo raíz §4b).
const HORAS_PARA_REEMBOLSO = 24;      // archivo raíz, regla 3: "más de 24 horas" → reembolso
const HORAS_PARA_REPROGRAMAR = 2;     // F-004, regla 1: "hasta dos horas antes" → se puede mover

interface Dependencias {
  repositorio: RepositorioReservas;
  pagos: PagosPort;
  notificaciones: NotificacionesPort;
  ahora?: () => Date;                 // inyectable para tests deterministas
}

/** Dos rangos se pisan si uno empieza antes de que el otro termine.
 *  Los bordes exactos NO se pisan: fin 19:00 e inicio 19:00 conviven. */
function seSuperponen(aInicio: Date, aFin: Date, bInicio: Date, bFin: Date): boolean {
  return aInicio < bFin && bInicio < aFin;
}

/** La única forma de mostrar una fecha en un aviso (archivo raíz §4b: nada de concatenar horas). */
function formatearFecha(fecha: Date): string {
  return fecha.toISOString();
}

export function moduloReservas(deps: Dependencias) {
  const ahora = deps.ahora ?? (() => new Date());
  let secuencia = 0;

  /** Horas entre ahora y un instante; negativo si ya pasó. */
  const horasHasta = (instante: Date) => (instante.getTime() - ahora().getTime()) / 3_600_000;

  /** Regla 1: ¿el rango se pisa con alguna reserva CONFIRMADA de la cancha?
   *  `ignorarId` deja afuera la reserva que se está moviendo (F-004 regla 3). */
  async function hayPisada(canchaId: string, inicio: Date, fin: Date, ignorarId?: string): Promise<boolean> {
    const existentes = await deps.repositorio.listarPorCancha(canchaId);
    return existentes.some(r =>
      r.id !== ignorarId && r.estado === 'CONFIRMADA' && seSuperponen(inicio, fin, r.inicio, r.fin));
  }

  return {
    /** Regla 1 (no superposición) + Regla 2 (sin seña no hay reserva). */
    async crearReserva(datos: { canchaId: string; clienteId: string; inicio: Date; fin: Date; precio: number }): Promise<Reserva> {
      if (datos.fin <= datos.inicio) throw new ErrorDeReserva('RANGO_INVALIDO');

      if (await hayPisada(datos.canchaId, datos.inicio, datos.fin)) throw new ErrorDeReserva('SUPERPOSICION_DE_RESERVA');

      const cobro = await deps.pagos.cobrarSena(datos.clienteId, datos.precio);
      if (!cobro.ok) throw new ErrorDeReserva('SENA_RECHAZADA');

      const reserva: Reserva = {
        id: `reserva-${++secuencia}`,
        ...datos,
        pagoId: cobro.pagoId,
        estado: 'CONFIRMADA',
        reprogramada: false,
      };
      await deps.repositorio.guardar(reserva);

      // Regla del módulo notificaciones: el aviso nunca tumba la operación.
      await deps.notificaciones
        .notificar(datos.clienteId, `Reserva confirmada: cancha ${datos.canchaId}, seña $${cobro.monto}`)
        .catch(() => {});

      return reserva;
    },

    /** Regla 3: +24h de anticipación → reembolso de seña; si no, sin reembolso.
     *  F-004 regla 4: una reserva reprogramada nunca reembolsa, sin importar la anticipación. */
    async cancelarReserva(reservaId: string): Promise<{ reembolsada: boolean }> {
      const reserva = await deps.repositorio.buscarPorId(reservaId);
      if (!reserva || reserva.estado !== 'CONFIRMADA') throw new ErrorDeReserva('RESERVA_INEXISTENTE');

      const corresponde = !reserva.reprogramada && horasHasta(reserva.inicio) > HORAS_PARA_REEMBOLSO;
      const reembolsada = corresponde ? (await deps.pagos.reembolsar(reserva.pagoId)).ok : false;

      await deps.repositorio.guardar({ ...reserva, estado: 'CANCELADA' });
      await deps.notificaciones
        .notificar(reserva.clienteId, reembolsada
          ? 'Reserva cancelada: te reembolsamos la seña'
          : reserva.reprogramada
            ? 'Reserva cancelada: por haber sido reprogramada, la seña no se reembolsa'
            : 'Reserva cancelada: por la anticipación, la seña no se reembolsa')
        .catch(() => {});

      return { reembolsada };
    },

    /** F-004: mover una reserva CONFIRMADA a otro día y hora, en la misma cancha.
     *  Regla 1: hasta 2 h antes del inicio original. Regla 2: la seña ya pagada vale, no se cobra otra.
     *  Regla 3: el rango nuevo no se pisa con otra confirmada (sin contar esta misma). Regla 5: se avisa. */
    async reprogramarReserva(reservaId: string, nuevo: { inicio: Date; fin: Date }): Promise<Reserva> {
      const reserva = await deps.repositorio.buscarPorId(reservaId);
      if (!reserva || reserva.estado !== 'CONFIRMADA') throw new ErrorDeReserva('RESERVA_INEXISTENTE');

      if (nuevo.fin <= nuevo.inicio) throw new ErrorDeReserva('RANGO_INVALIDO');
      if (horasHasta(reserva.inicio) < HORAS_PARA_REPROGRAMAR) throw new ErrorDeReserva('ANTICIPACION_INSUFICIENTE');

      if (await hayPisada(reserva.canchaId, nuevo.inicio, nuevo.fin, reserva.id)) throw new ErrorDeReserva('SUPERPOSICION_DE_RESERVA');

      // Misma cancha, mismo precio, mismo pagoId: solo cambian las fechas (y queda marcada como reprogramada).
      const movida: Reserva = { ...reserva, inicio: nuevo.inicio, fin: nuevo.fin, reprogramada: true };
      await deps.repositorio.guardar(movida);

      await deps.notificaciones
        .notificar(reserva.clienteId,
          `Reserva reprogramada: cancha ${reserva.canchaId}, nuevo horario ${formatearFecha(nuevo.inicio)} a ${formatearFecha(nuevo.fin)}`)
        .catch(() => {});

      return movida;
    },
  };
}
