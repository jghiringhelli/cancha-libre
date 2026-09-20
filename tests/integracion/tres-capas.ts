// F-006, regla 4: la verificación en tres capas, capturada como test de integración ejecutable
// contra cualquier entorno. Solo cambian dos variables:
//   HOST     a dónde pegan los probes         (default http://localhost:3000)
//   DB_PATH  la base que ese servidor está usando (default cancha.db)
//
//   (a) la base ANTES: cuántas reservas hay.
//   (b) los probes Hurl contra HOST: de cada pedido tomamos qué se pidió y qué respondió (status,
//       ids capturados), y armamos la historia que cuenta HTTP.
//   (c) la base DESPUÉS: la cuenta subió exactamente en las creadas, cada creada está con el estado
//       que dijo HTTP, cada cancelada quedó CANCELADA, y lo que dio 404 no existe.
// Si las tres capas no cuentan la misma historia, falla con assert (un test sin expect no es un test).
//
// No arranca ni apaga el servidor: se corre contra uno andando. `npm run integracion`.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const HOST = process.env.HOST ?? 'http://localhost:3000';
const DB_PATH = process.env.DB_PATH ?? 'cancha.db';
const PROBES = 'probes';

// Lo que Hurl imprime con --json (una línea JSON por archivo). Solo los campos que usamos.
interface ResultadoHurl {
  filename: string;
  success: boolean;
  entries: {
    calls: { request: { method: string; url: string }; response: { status: number } }[];
    captures: { name: string; value: string }[];
  }[];
}

interface Fila { id: string; estado: string }

function capa(letra: string, mensaje: string) { console.log(`[capa ${letra}] ${mensaje}`); }

function abrirBase(): DatabaseSync {
  assert.ok(existsSync(DB_PATH), `no existe la base ${DB_PATH}: ¿el servidor en ${HOST} está andando con ese DB_PATH?`);
  return new DatabaseSync(DB_PATH, { readOnly: true });
}

function contarReservas(db: DatabaseSync): number {
  return (db.prepare('select count(*) as n from reservas').get() as { n: number }).n;
}

function buscar(db: DatabaseSync, id: string): Fila | undefined {
  return db.prepare('select id, estado from reservas where id = ?').get(id) as Fila | undefined;
}

// ---------- (a) la base antes ----------
const antes = (() => { const db = abrirBase(); const n = contarReservas(db); db.close(); return n; })();
capa('a', `base ${DB_PATH}: ${antes} reservas antes de los probes`);

// ---------- (b) los probes contra HOST ----------
const archivos = readdirSync(PROBES).filter(a => a.endsWith('.hurl')).sort().map(a => join(PROBES, a));
assert.ok(archivos.length > 0, `no hay probes en ${PROBES}/`);

const hurl = spawnSync('hurl', ['--json', '--variable', `host=${HOST}`, ...archivos], { encoding: 'utf8' });
assert.ok(!hurl.error, `no pude ejecutar hurl: ${hurl.error?.message}`);
const resultados = hurl.stdout.trim().split('\n').filter(Boolean).map(l => JSON.parse(l) as ResultadoHurl);
assert.equal(resultados.length, archivos.length, `hurl devolvió ${resultados.length} resultados para ${archivos.length} probes\n${hurl.stderr}`);

// La historia que cuenta HTTP: qué reservas dijo haber creado, cuáles canceló y cuáles no encontró.
const creadas: { id: string; probe: string }[] = [];
const canceladas: { id: string; probe: string }[] = [];
const inexistentes: { id: string; probe: string }[] = [];
let rechazadas = 0;
const RUTA_RESERVA = /\/reservas\/([^/?]+)$/;

for (const r of resultados) {
  assert.ok(r.success, `el probe ${r.filename} falló contra ${HOST}\n${hurl.stderr}`);
  for (const entry of r.entries) {
    const capturas = Object.fromEntries(entry.captures.map(c => [c.name, c.value]));
    for (const { request, response } of entry.calls) {
      const ruta = new URL(request.url).pathname;
      if (request.method === 'POST' && ruta === '/reservas') {
        if (response.status === 201) {
          assert.ok(capturas.reserva, `${r.filename}: un POST /reservas dio 201 pero el probe no captura "reserva" — sin id no puedo contrastarlo con la base`);
          creadas.push({ id: capturas.reserva, probe: r.filename });
          capa('b', `${r.filename}: POST /reservas → 201 ${capturas.reserva}`);
        } else {
          rechazadas++;
          capa('b', `${r.filename}: POST /reservas → ${response.status} (no debe quedar en la base)`);
        }
      }
      const cancelar = request.method === 'DELETE' && RUTA_RESERVA.exec(ruta);
      if (cancelar) {
        const id = decodeURIComponent(cancelar[1]!);
        if (response.status === 200) { canceladas.push({ id, probe: r.filename }); capa('b', `${r.filename}: DELETE /reservas/${id} → 200`); }
        if (response.status === 404) { inexistentes.push({ id, probe: r.filename }); capa('b', `${r.filename}: DELETE /reservas/${id} → 404`); }
      }
    }
  }
}
capa('b', `${resultados.length} probes en verde contra ${HOST}: ${creadas.length} creadas, ${rechazadas} rechazadas, ${canceladas.length} canceladas, ${inexistentes.length} inexistentes`);

// ---------- (c) la base después ----------
const db = abrirBase();
const despues = contarReservas(db);
assert.equal(despues, antes + creadas.length,
  `la base tiene ${despues} reservas; HTTP contó ${antes} + ${creadas.length} creadas = ${antes + creadas.length}`);
capa('c', `base ${DB_PATH}: ${despues} reservas después = ${antes} antes + ${creadas.length} creadas por HTTP (las ${rechazadas} rechazadas no sumaron)`);

const idsCanceladas = new Set(canceladas.map(c => c.id));
for (const { id, probe } of creadas) {
  const estado = buscar(db, id)?.estado;
  assert.ok(estado, `${probe}: HTTP dijo haber creado ${id}, pero no está en la base`);
  const esperado = idsCanceladas.has(id) ? 'CANCELADA' : 'CONFIRMADA';
  assert.equal(estado, esperado, `${probe}: ${id} está ${estado} en la base; por HTTP debería estar ${esperado}`);
  capa('c', `${id} está en la base con estado ${estado} — coincide con HTTP`);
}
for (const { id, probe } of canceladas) {
  assert.ok(creadas.some(c => c.id === id) || buscar(db, id)?.estado === 'CANCELADA',
    `${probe}: HTTP canceló ${id} pero la base no la tiene CANCELADA`);
}
for (const { id, probe } of inexistentes) {
  assert.equal(buscar(db, id), undefined, `${probe}: HTTP dio 404 para ${id}, pero la base la tiene`);
  capa('c', `${id} no está en la base — coincide con el 404`);
}
db.close();

console.log(`✓ integracion: las tres capas cuentan la misma historia (${HOST}, ${DB_PATH})`);
