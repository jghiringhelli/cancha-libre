// El almacenamiento de reservas, detrás de una interfaz (ver docs/decisiones/0003).
// En el curso: en memoria. En producción sería una base de datos — mismo contrato.
import type { Reserva } from './reservas';

export interface RepositorioReservas {
  guardar(reserva: Reserva): Promise<void>;
  eliminar(reservaId: string): Promise<void>;
  buscarPorId(reservaId: string): Promise<Reserva | undefined>;
  listarPorCancha(canchaId: string): Promise<Reserva[]>;
}

export function repositorioEnMemoria(): RepositorioReservas {
  const reservas = new Map<string, Reserva>();
  return {
    async guardar(reserva) { reservas.set(reserva.id, reserva); },
    async eliminar(reservaId) { reservas.delete(reservaId); },
    async buscarPorId(reservaId) { return reservas.get(reservaId); },
    async listarPorCancha(canchaId) {
      return [...reservas.values()].filter(r => r.canchaId === canchaId);
    },
  };
}
