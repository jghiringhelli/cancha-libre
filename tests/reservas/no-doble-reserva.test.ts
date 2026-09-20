// El contrato: dos reservas no pueden pisarse.
// Este test se escribe primero — y se lo mira fallar. (Curso: paso 4, Verificable)
import { describe, test, expect, beforeEach } from 'vitest';
import { moduloReservas, ErrorDeReserva } from '../../src/reservas/reservas';
import { repositorioEnMemoria } from '../../src/reservas/repositorio';
import { generadorUuid } from '../../src/reservas/generadorUuid';
import { proveedorSimulado } from '../../src/pagos/proveedorSimulado';
import { porConsola } from '../../src/notificaciones/porConsola';

const sabado = (hora: number, minutos = 0) => new Date(2026, 8, 19, hora, minutos);

function armarModulo() {
  return moduloReservas({
    repositorio: repositorioEnMemoria(),
    ids: generadorUuid(),
    pagos: proveedorSimulado(),
    notificaciones: porConsola({ silencioso: true }).port,
  });
}

const base = { canchaId: 'cancha-1', clienteId: 'juan', precio: 100 };

describe('regla 1: nunca dos reservas superpuestas en la misma cancha', () => {
  let reservas: ReturnType<typeof armarModulo>;
  beforeEach(() => { reservas = armarModulo(); });

  test('rechaza una reserva que se superpone parcialmente', async () => {
    await reservas.crearReserva({ ...base, inicio: sabado(18), fin: sabado(19) });
    await expect(
      reservas.crearReserva({ ...base, clienteId: 'pedro', inicio: sabado(18, 30), fin: sabado(19, 30) }),
    ).rejects.toThrow('SUPERPOSICION_DE_RESERVA');
  });

  test('rechaza el mismo horario exacto', async () => {
    await reservas.crearReserva({ ...base, inicio: sabado(18), fin: sabado(19) });
    await expect(
      reservas.crearReserva({ ...base, clienteId: 'pedro', inicio: sabado(18), fin: sabado(19) }),
    ).rejects.toThrow('SUPERPOSICION_DE_RESERVA');
  });

  test('rechaza una reserva que envuelve a otra', async () => {
    await reservas.crearReserva({ ...base, inicio: sabado(18), fin: sabado(19) });
    await expect(
      reservas.crearReserva({ ...base, clienteId: 'pedro', inicio: sabado(17), fin: sabado(20) }),
    ).rejects.toThrow('SUPERPOSICION_DE_RESERVA');
  });

  test('los bordes exactos NO se pisan: fin 19:00 e inicio 19:00 conviven', async () => {
    await reservas.crearReserva({ ...base, inicio: sabado(18), fin: sabado(19) });
    const segunda = await reservas.crearReserva({ ...base, clienteId: 'pedro', inicio: sabado(19), fin: sabado(20) });
    expect(segunda.estado).toBe('CONFIRMADA');
  });

  test('la misma hora en OTRA cancha no es superposición', async () => {
    await reservas.crearReserva({ ...base, inicio: sabado(18), fin: sabado(19) });
    const otra = await reservas.crearReserva({ ...base, canchaId: 'cancha-2', clienteId: 'pedro', inicio: sabado(18), fin: sabado(19) });
    expect(otra.estado).toBe('CONFIRMADA');
  });

  test('una reserva CANCELADA libera el horario', async () => {
    const r = await reservas.crearReserva({ ...base, inicio: sabado(18), fin: sabado(19) });
    await reservas.cancelarReserva(r.id);
    const nueva = await reservas.crearReserva({ ...base, clienteId: 'pedro', inicio: sabado(18), fin: sabado(19) });
    expect(nueva.estado).toBe('CONFIRMADA');
  });

  test('un rango invertido se rechaza antes de tocar nada', async () => {
    await expect(
      reservas.crearReserva({ ...base, inicio: sabado(19), fin: sabado(18) }),
    ).rejects.toThrow('RANGO_INVALIDO');
  });
});
