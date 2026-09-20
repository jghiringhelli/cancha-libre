// F-006: RepositorioReservas sobre SQLite (docs/features/F-006-persistencia-sqlite.md).
// Vive acá, al lado del servidor que la enchufa, y no en src/reservas: reservas no cambia — sigue
// conociendo solo la interfaz (ADR 0003: mismo contrato, otra implementación).
// Sin dependencias nuevas: node:sqlite viene con Node 24. Archivo por DB_PATH, default cancha.db.
import { DatabaseSync } from 'node:sqlite';
import type { Reserva } from '../reservas/reservas.ts';
import type { RepositorioReservas } from '../reservas/repositorio.ts';

// Una fila = una reserva. Las fechas van como ISO 8601 en UTC y vuelven con new Date(iso):
// la misma y única forma de parsear fechas que usa la API (guardarraíl §4b).
interface Fila {
  id: string;
  cancha_id: string;
  cliente_id: string;
  inicio: string;
  fin: string;
  precio: number;
  pago_id: string;
  estado: Reserva['estado'];
}

const ESQUEMA = `
  create table if not exists reservas (
    id         text primary key,
    cancha_id  text not null,
    cliente_id text not null,
    inicio     text not null,
    fin        text not null,
    precio     real not null,
    pago_id    text not null,
    estado     text not null check (estado in ('CONFIRMADA', 'CANCELADA'))
  );
  create index if not exists reservas_por_cancha on reservas (cancha_id);
`;

function aReserva(fila: Fila): Reserva {
  return {
    id: fila.id,
    canchaId: fila.cancha_id,
    clienteId: fila.cliente_id,
    inicio: new Date(fila.inicio),
    fin: new Date(fila.fin),
    precio: fila.precio,
    pagoId: fila.pago_id,
    estado: fila.estado,
  };
}

export function repositorioSqlite(rutaArchivo: string): RepositorioReservas & { cerrar(): void } {
  const db = new DatabaseSync(rutaArchivo);
  db.exec(ESQUEMA);

  // guardar() sirve para crear y para actualizar (cancelar guarda la misma reserva con otro estado):
  // insert o update según exista el id.
  const guardar = db.prepare(`
    insert into reservas (id, cancha_id, cliente_id, inicio, fin, precio, pago_id, estado)
    values (?, ?, ?, ?, ?, ?, ?, ?)
    on conflict (id) do update set
      cancha_id = excluded.cancha_id, cliente_id = excluded.cliente_id,
      inicio = excluded.inicio, fin = excluded.fin, precio = excluded.precio,
      pago_id = excluded.pago_id, estado = excluded.estado
  `);
  const eliminar = db.prepare('delete from reservas where id = ?');
  const buscarPorId = db.prepare('select * from reservas where id = ?');
  const listarPorCancha = db.prepare('select * from reservas where cancha_id = ? order by inicio');

  return {
    async guardar(r) {
      guardar.run(r.id, r.canchaId, r.clienteId, r.inicio.toISOString(), r.fin.toISOString(), r.precio, r.pagoId, r.estado);
    },
    async eliminar(reservaId) { eliminar.run(reservaId); },
    async buscarPorId(reservaId) {
      const fila = buscarPorId.get(reservaId) as Fila | undefined;
      return fila && aReserva(fila);
    },
    async listarPorCancha(canchaId) {
      return (listarPorCancha.all(canchaId) as Fila[]).map(aReserva);
    },
    cerrar() { db.close(); },
  };
}
