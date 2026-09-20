// F-005: la API HTTP mínima sobre el módulo reservas (docs/features/F-005-api-http.md).
// F-006: las reservas persisten en SQLite (docs/features/F-006-persistencia-sqlite.md).
// Acá se arma el sistema: la API conoce las implementaciones y se las inyecta a reservas.
// reservas sigue conociendo solo interfaces (regla 4 del archivo raíz).
// Sin dependencias nuevas: node:http y node:sqlite. Se corre con `npm run api`.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { moduloReservas, ErrorDeReserva } from '../reservas/reservas.ts';
import { repositorioSqlite } from './repositorioSqlite.ts';
import { proveedorSimulado } from '../pagos/proveedorSimulado.ts';
import { porConsola } from '../notificaciones/porConsola.ts';

const rutaDb = process.env.DB_PATH ?? 'cancha.db';
const repositorio = repositorioSqlite(rutaDb);
const reservas = moduloReservas({
  repositorio,
  pagos: proveedorSimulado(),
  notificaciones: porConsola().port,
});

// Cada código del módulo tiene su status HTTP (regla 2 de F-005).
const STATUS_POR_CODIGO: Record<ErrorDeReserva['codigo'], number> = {
  RANGO_INVALIDO: 400,
  SENA_RECHAZADA: 402,
  RESERVA_INEXISTENTE: 404,
  SUPERPOSICION_DE_RESERVA: 409,
};

class ErrorHttp extends Error {
  constructor(public status: number, public codigo: string) { super(codigo); }
}

// El log dice lo mismo que la respuesta (F-006, capa b): método, ruta, status y lo esencial del cuerpo.
function resumen(cuerpo: unknown): string {
  if (Array.isArray(cuerpo)) return `${cuerpo.length} confirmadas`;
  if (cuerpo && typeof cuerpo === 'object') {
    return Object.entries(cuerpo)
      .filter(([clave]) => ['id', 'estado', 'reembolso', 'error'].includes(clave))
      .map(([clave, valor]) => `${clave}=${valor}`)
      .join(' ');
  }
  return '';
}

function responder(req: IncomingMessage, res: ServerResponse, status: number, cuerpo: unknown) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(cuerpo));
  console.log(`${req.method} ${req.url} → ${status} ${resumen(cuerpo)}`);
}

async function leerJson(req: IncomingMessage): Promise<unknown> {
  const partes: Buffer[] = [];
  for await (const parte of req) partes.push(parte as Buffer);
  const texto = Buffer.concat(partes).toString('utf8');
  try { return texto ? JSON.parse(texto) : {}; }
  catch { throw new ErrorHttp(400, 'JSON_INVALIDO'); }
}

// Una sola forma de parsear fechas en toda la API (guardarraíl §4b): ISO 8601 → Date.
function fechaIso(valor: unknown): Date {
  if (typeof valor !== 'string') throw new ErrorHttp(400, 'RANGO_INVALIDO');
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) throw new ErrorHttp(400, 'RANGO_INVALIDO');
  return fecha;
}

function texto(valor: unknown, campo: string): string {
  if (typeof valor !== 'string' || valor === '') throw new ErrorHttp(400, `FALTA_${campo.toUpperCase()}`);
  return valor;
}

function numero(valor: unknown, campo: string): number {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) throw new ErrorHttp(400, `FALTA_${campo.toUpperCase()}`);
  return valor;
}

async function crearReserva(req: IncomingMessage, res: ServerResponse) {
  const cuerpo = await leerJson(req) as Record<string, unknown>;
  const reserva = await reservas.crearReserva({
    canchaId: texto(cuerpo.canchaId, 'canchaId'),
    clienteId: texto(cuerpo.clienteId, 'clienteId'),
    inicio: fechaIso(cuerpo.inicio),
    fin: fechaIso(cuerpo.fin),
    precio: numero(cuerpo.precio, 'precio'),
  });
  responder(req, res, 201, reserva);
}

async function cancelarReserva(req: IncomingMessage, res: ServerResponse, reservaId: string) {
  const { reembolsada } = await reservas.cancelarReserva(reservaId);
  responder(req, res, 200, { reembolso: reembolsada });
}

async function listarConfirmadas(req: IncomingMessage, res: ServerResponse, canchaId: string) {
  const todas = await repositorio.listarPorCancha(canchaId);
  responder(req, res, 200, todas.filter(r => r.estado === 'CONFIRMADA'));
}

const RUTA_RESERVA = /^\/reservas\/([^/]+)$/;
const RUTA_CANCHA = /^\/canchas\/([^/]+)\/reservas$/;

async function enrutar(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const ruta = url.pathname;

  if (req.method === 'POST' && ruta === '/reservas') return crearReserva(req, res);

  const reserva = RUTA_RESERVA.exec(ruta);
  if (req.method === 'DELETE' && reserva) return cancelarReserva(req, res, decodeURIComponent(reserva[1]!));

  const cancha = RUTA_CANCHA.exec(ruta);
  if (req.method === 'GET' && cancha) return listarConfirmadas(req, res, decodeURIComponent(cancha[1]!));

  throw new ErrorHttp(404, 'RUTA_INEXISTENTE');
}

const servidor = createServer((req, res) => {
  enrutar(req, res).catch((error: unknown) => {
    if (error instanceof ErrorDeReserva) return responder(req, res, STATUS_POR_CODIGO[error.codigo], { error: error.codigo });
    if (error instanceof ErrorHttp) return responder(req, res, error.status, { error: error.codigo });
    console.error(error);
    responder(req, res, 500, { error: 'ERROR_INTERNO' });
  });
});

const puerto = Number(process.env.PORT) || 3000;
servidor.listen(puerto, () => {
  console.log(`cancha-libre: API escuchando en http://localhost:${puerto} — reservas en ${rutaDb}`);
});
