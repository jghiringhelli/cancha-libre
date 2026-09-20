// F-004: reprogramar una reserva. Un test por criterio de aceptación de
// docs/features/F-004-reprogramar.md — escritos antes del código, y mirados fallar.
import { describe, test, expect, beforeEach } from 'vitest';
import { moduloReservas } from '../../src/reservas/reservas';
import { repositorioEnMemoria } from '../../src/reservas/repositorio';
import { proveedorSimulado } from '../../src/pagos/proveedorSimulado';
import { porConsola } from '../../src/notificaciones/porConsola';

// Sábado 19/9/2026. El reloj del módulo está fijo a las 10:00 de ese día
// (inyectado), así que "18:00" siempre está a 8 h de anticipación.
const sabado = (hora: number, minutos = 0) => new Date(2026, 8, 19, hora, minutos);
const domingo = (hora: number, minutos = 0) => new Date(2026, 8, 20, hora, minutos);
const AHORA = sabado(10);

function armar(ahora: () => Date = () => AHORA) {
  const repositorio = repositorioEnMemoria();
  const pagos = proveedorSimulado();
  const avisos = porConsola({ silencioso: true });
  const reservas = moduloReservas({ repositorio, pagos, notificaciones: avisos.port, ahora });
  return { reservas, repositorio, pagos, historial: avisos.historial };
}

const base = { canchaId: 'cancha-1', clienteId: 'juan', precio: 100 };

describe('F-004: reprogramar una reserva', () => {
  let m: ReturnType<typeof armar>;
  beforeEach(() => { m = armar(); });

  test('reprogramar a un horario libre devuelve la reserva con inicio y fin nuevos, mismo pagoId, CONFIRMADA', async () => {
    const original = await m.reservas.crearReserva({ ...base, inicio: sabado(18), fin: sabado(19) });

    const movida = await m.reservas.reprogramarReserva(original.id, { inicio: sabado(20), fin: sabado(21) });

    expect(movida.id).toBe(original.id);
    expect(movida.inicio).toEqual(sabado(20));
    expect(movida.fin).toEqual(sabado(21));
    expect(movida.pagoId).toBe(original.pagoId);
    expect(movida.estado).toBe('CONFIRMADA');
    // Regla 2: la seña ya pagada vale; no se cobró otra.
    expect(await m.pagos.estadoDePago(original.pagoId)).toBe('COBRADO');
    expect(await m.pagos.estadoDePago('pago-2')).toBe('INEXISTENTE');
    // Y el repositorio guarda la versión movida, no la vieja.
    expect(await m.repositorio.buscarPorId(original.id)).toEqual(movida);
  });

  test('reprogramar a un horario que se pisa con otra reserva confirmada de la cancha → SUPERPOSICION_DE_RESERVA', async () => {
    const mia = await m.reservas.crearReserva({ ...base, inicio: sabado(18), fin: sabado(19) });
    await m.reservas.crearReserva({ ...base, clienteId: 'pedro', inicio: sabado(20), fin: sabado(21) });

    await expect(
      m.reservas.reprogramarReserva(mia.id, { inicio: sabado(20, 30), fin: sabado(21, 30) }),
    ).rejects.toThrow('SUPERPOSICION_DE_RESERVA');
    // La reserva no se movió.
    expect((await m.repositorio.buscarPorId(mia.id))?.inicio).toEqual(sabado(18));
  });

  test('reprogramar la reserva sobre su propio horario corrido (18–19 a 18:30–19:30) funciona', async () => {
    const mia = await m.reservas.crearReserva({ ...base, inicio: sabado(18), fin: sabado(19) });

    const movida = await m.reservas.reprogramarReserva(mia.id, { inicio: sabado(18, 30), fin: sabado(19, 30) });

    expect(movida.inicio).toEqual(sabado(18, 30));
    expect(movida.fin).toEqual(sabado(19, 30));
    expect(movida.estado).toBe('CONFIRMADA');
  });

  test('con menos de dos horas para el inicio original → ANTICIPACION_INSUFICIENTE', async () => {
    const mia = await m.reservas.crearReserva({ ...base, inicio: sabado(18), fin: sabado(19) });
    // Mismo repositorio, otro reloj: son las 16:30, faltan 1 h 30 para el inicio original.
    const reservasTarde = moduloReservas({
      repositorio: m.repositorio, pagos: m.pagos, notificaciones: porConsola({ silencioso: true }).port,
      ahora: () => sabado(16, 30),
    });

    await expect(
      reservasTarde.reprogramarReserva(mia.id, { inicio: sabado(20), fin: sabado(21) }),
    ).rejects.toThrow('ANTICIPACION_INSUFICIENTE');
    expect((await m.repositorio.buscarPorId(mia.id))?.inicio).toEqual(sabado(18));
  });

  test('una reserva reprogramada que se cancela con más de 24 h → no hay reembolso', async () => {
    const mia = await m.reservas.crearReserva({ ...base, inicio: sabado(18), fin: sabado(19) });
    await m.reservas.reprogramarReserva(mia.id, { inicio: domingo(18), fin: domingo(19) }); // 32 h de anticipación

    const resultado = await m.reservas.cancelarReserva(mia.id);

    expect(resultado.reembolsada).toBe(false);
    expect(await m.pagos.estadoDePago(mia.pagoId)).toBe('COBRADO');
    expect((await m.repositorio.buscarPorId(mia.id))?.estado).toBe('CANCELADA');
  });

  test('una reserva cancelada no se puede reprogramar → RESERVA_INEXISTENTE', async () => {
    const mia = await m.reservas.crearReserva({ ...base, inicio: domingo(18), fin: domingo(19) });
    await m.reservas.cancelarReserva(mia.id);

    await expect(
      m.reservas.reprogramarReserva(mia.id, { inicio: domingo(20), fin: domingo(21) }),
    ).rejects.toThrow('RESERVA_INEXISTENTE');
  });

  test('una reserva inexistente no se puede reprogramar → RESERVA_INEXISTENTE', async () => {
    await expect(
      m.reservas.reprogramarReserva('no-existe', { inicio: sabado(20), fin: sabado(21) }),
    ).rejects.toThrow('RESERVA_INEXISTENTE');
  });

  test('se envía una notificación con la fecha nueva', async () => {
    const mia = await m.reservas.crearReserva({ ...base, inicio: sabado(18), fin: sabado(19) });
    const nuevoInicio = domingo(18);

    await m.reservas.reprogramarReserva(mia.id, { inicio: nuevoInicio, fin: domingo(19) });

    const aviso = m.historial.find(a => a.clienteId === 'juan' && a.mensaje.includes('reprogramada'));
    expect(aviso).toBeDefined();
    expect(aviso!.mensaje).toContain(nuevoInicio.toISOString());
  });
});
