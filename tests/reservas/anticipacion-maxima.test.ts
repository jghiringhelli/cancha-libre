// F-008, regla 5 del archivo raíz: no se reserva con más de 30 días de anticipación (ADR 0005).
// El reloj se inyecta (`ahora`) para que el test no dependa del día en que se corre.
import { describe, test, expect } from 'vitest';
import { moduloReservas } from '../../src/reservas/reservas';
import { repositorioEnMemoria } from '../../src/reservas/repositorio';
import { generadorUuid } from '../../src/reservas/generadorUuid';
import { proveedorSimulado } from '../../src/pagos/proveedorSimulado';
import { porConsola } from '../../src/notificaciones/porConsola';

const AHORA = new Date(Date.UTC(2026, 8, 20, 12));
const DIA = 86_400_000;
const enDias = (dias: number, horas = 0) => new Date(AHORA.getTime() + dias * DIA + horas * 3_600_000);

function armar() {
  const repositorio = repositorioEnMemoria();
  const pagos = proveedorSimulado();
  const avisos = porConsola({ silencioso: true });
  const reservas = moduloReservas({ repositorio, ids: generadorUuid(), pagos, notificaciones: avisos.port, ahora: () => AHORA });
  return { reservas, repositorio, historial: avisos.historial };
}

const base = { canchaId: 'cancha-1', clienteId: 'juan', precio: 100 };

describe('regla 5: no se reserva con más de 30 días de anticipación', () => {
  test('a 31 días se rechaza con ANTICIPACION_EXCESIVA, sin tocar nada', async () => {
    const { reservas, repositorio, historial } = armar();
    await expect(
      reservas.crearReserva({ ...base, inicio: enDias(31), fin: enDias(31, 1) }),
    ).rejects.toThrow('ANTICIPACION_EXCESIVA');
    expect(await repositorio.listarPorCancha('cancha-1')).toHaveLength(0);
    expect(historial).toHaveLength(0);
  });

  test('a 30 días y un segundo también se rechaza: el límite es "más de 30"', async () => {
    const { reservas } = armar();
    const inicio = new Date(enDias(30).getTime() + 1_000);
    await expect(
      reservas.crearReserva({ ...base, inicio, fin: enDias(30, 1) }),
    ).rejects.toThrow('ANTICIPACION_EXCESIVA');
  });

  test('a 30 días exactos se confirma: el borde es inclusivo', async () => {
    const { reservas } = armar();
    const r = await reservas.crearReserva({ ...base, inicio: enDias(30), fin: enDias(30, 1) });
    expect(r.estado).toBe('CONFIRMADA');
  });

  test('dentro de la ventana (una semana) se confirma', async () => {
    const { reservas, repositorio } = armar();
    const r = await reservas.crearReserva({ ...base, inicio: enDias(7), fin: enDias(7, 1) });
    expect(r.estado).toBe('CONFIRMADA');
    expect(await repositorio.listarPorCancha('cancha-1')).toHaveLength(1);
  });

  test('la anticipación se mide contra el reloj inyectado, no contra el del sistema', async () => {
    // Mismo pedido, reloj adelantado 10 días: lo que estaba a 35 días ahora está a 25 y entra.
    const repositorio = repositorioEnMemoria();
    const armarCon = (ahora: Date) => moduloReservas({
      repositorio, ids: generadorUuid(), pagos: proveedorSimulado(),
      notificaciones: porConsola({ silencioso: true }).port, ahora: () => ahora,
    });
    const pedido = { ...base, inicio: enDias(35), fin: enDias(35, 1) };
    await expect(armarCon(AHORA).crearReserva(pedido)).rejects.toThrow('ANTICIPACION_EXCESIVA');
    const r = await armarCon(enDias(10)).crearReserva(pedido);
    expect(r.estado).toBe('CONFIRMADA');
  });
});
