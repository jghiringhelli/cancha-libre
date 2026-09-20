// F-007, regla 3: el defecto queda como test de regresión.
// Lo que pasó: tras reiniciar el servidor, una reserva nueva recibió `reserva-1` y sobrescribió la fila
// de otro cliente, porque el id salía de un contador en memoria que arranca en cero en cada proceso.
// La restricción que lo descarta: ningún identificador que se persista depende del estado de un proceso.
import { describe, test, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { moduloReservas } from '../../src/reservas/reservas';
import { repositorioEnMemoria, type RepositorioReservas } from '../../src/reservas/repositorio';
import { generadorUuid } from '../../src/reservas/generadorUuid';
import { repositorioSqlite } from '../../src/api/repositorioSqlite';
import { proveedorSimulado } from '../../src/pagos/proveedorSimulado';
import { porConsola } from '../../src/notificaciones/porConsola';

const en = (horas: number) => new Date(Date.UTC(2030, 0, 12, horas));

// Cada llamada es "un proceso": módulo nuevo, contador (si lo hubiera) en cero. El repositorio es lo único compartido.
function arrancarProceso(repositorio: RepositorioReservas) {
  return moduloReservas({
    repositorio,
    ids: generadorUuid(),
    pagos: proveedorSimulado(),
    notificaciones: porConsola({ silencioso: true }).port,
  });
}

describe('F-007: los identificadores no se pisan', () => {
  test('dos instancias del módulo sobre el mismo repositorio no producen ids repetidos', async () => {
    const repositorio = repositorioEnMemoria();
    const servidorA = arrancarProceso(repositorio);
    const servidorB = arrancarProceso(repositorio);

    const ids: string[] = [];
    for (let hora = 8; hora < 13; hora++) {
      ids.push((await servidorA.crearReserva({ canchaId: 'cancha-1', clienteId: 'juan', inicio: en(hora), fin: en(hora + 1), precio: 100 })).id);
      ids.push((await servidorB.crearReserva({ canchaId: 'cancha-2', clienteId: 'pedro', inicio: en(hora), fin: en(hora + 1), precio: 100 })).id);
    }

    expect(new Set(ids).size).toBe(ids.length);
    expect(await repositorio.listarPorCancha('cancha-1')).toHaveLength(5);
    expect(await repositorio.listarPorCancha('cancha-2')).toHaveLength(5);
  });

  describe('reiniciar el servidor (módulo nuevo, mismo repositorio SQLite)', () => {
    const carpeta = mkdtempSync(join(tmpdir(), 'cancha-libre-f007-'));
    const rutaDb = join(carpeta, 'reinicio.db');
    afterEach(() => rmSync(carpeta, { recursive: true, force: true }));

    test('crearReserva después del reinicio no modifica ninguna fila existente', async () => {
      // Proceso 1: se puebla la base y se apaga.
      const antesDelReinicio = repositorioSqlite(rutaDb);
      const proceso1 = arrancarProceso(antesDelReinicio);
      const dePedro = await proceso1.crearReserva({ canchaId: 'cancha-1', clienteId: 'pedro', inicio: en(18), fin: en(19), precio: 100 });
      const deAna = await proceso1.crearReserva({ canchaId: 'cancha-1', clienteId: 'ana', inicio: en(19), fin: en(20), precio: 100 });
      await proceso1.cancelarReserva(deAna.id);
      const filasAntes = await antesDelReinicio.listarPorCancha('cancha-1');
      antesDelReinicio.cerrar();
      expect(filasAntes).toHaveLength(2);

      // Proceso 2: mismo archivo, módulo nuevo. Con el contador, esta reserva salía `reserva-1` y pisaba la de pedro.
      const despuesDelReinicio = repositorioSqlite(rutaDb);
      const proceso2 = arrancarProceso(despuesDelReinicio);
      const deJuan = await proceso2.crearReserva({ canchaId: 'cancha-1', clienteId: 'juan', inicio: en(20), fin: en(21), precio: 100 });

      const filasDespues = await despuesDelReinicio.listarPorCancha('cancha-1');
      despuesDelReinicio.cerrar();

      expect(filasDespues).toHaveLength(filasAntes.length + 1);
      for (const fila of filasAntes) {
        expect(filasDespues.find(f => f.id === fila.id)).toEqual(fila);
      }
      expect(deJuan.id).not.toBe(dePedro.id);
      expect(filasDespues.find(f => f.id === deJuan.id)?.clienteId).toBe('juan');
    });
  });
});
