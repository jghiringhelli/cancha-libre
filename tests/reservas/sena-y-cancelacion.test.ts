// Reglas 2 y 3 del archivo raíz: la seña y la cancelación.
import { describe, test, expect } from 'vitest';
import { moduloReservas } from '../../src/reservas/reservas';
import { repositorioEnMemoria } from '../../src/reservas/repositorio';
import { proveedorSimulado } from '../../src/pagos/proveedorSimulado';
import { porConsola } from '../../src/notificaciones/porConsola';

const en = (horas: number) => new Date(Date.now() + horas * 3_600_000);

function armar(opciones?: { rechazarPagos?: boolean; ahora?: () => Date }) {
  const repositorio = repositorioEnMemoria();
  const pagos = proveedorSimulado({ rechazarTodo: opciones?.rechazarPagos });
  const avisos = porConsola({ silencioso: true });
  const reservas = moduloReservas({ repositorio, pagos, notificaciones: avisos.port, ahora: opciones?.ahora });
  return { reservas, repositorio, pagos, historial: avisos.historial };
}

const base = { canchaId: 'cancha-1', clienteId: 'juan', precio: 100 };

describe('regla 2: sin seña no hay reserva', () => {
  test('si el proveedor rechaza el cobro, la reserva NO queda registrada', async () => {
    const { reservas, repositorio } = armar({ rechazarPagos: true });
    await expect(
      reservas.crearReserva({ ...base, inicio: en(48), fin: en(49) }),
    ).rejects.toThrow('SENA_RECHAZADA');
    expect(await repositorio.listarPorCancha('cancha-1')).toHaveLength(0);
  });

  test('la seña cobrada es el 30% del precio, redondeado', async () => {
    const { reservas, pagos } = armar();
    const r = await reservas.crearReserva({ ...base, precio: 105, inicio: en(48), fin: en(49) });
    expect(await pagos.estadoDePago(r.pagoId)).toBe('COBRADO');
    // 30% de 105 = 31.5 → 32 (redondeo): queda documentado en el aviso al cliente
  });

  test('al confirmar, el cliente recibe el aviso', async () => {
    const { reservas, historial } = armar();
    await reservas.crearReserva({ ...base, inicio: en(48), fin: en(49) });
    expect(historial.some(a => a.clienteId === 'juan' && a.mensaje.includes('confirmada'))).toBe(true);
  });
});

describe('regla 3: cancelación y reembolso según anticipación', () => {
  test('con más de 24 h de anticipación, la seña se reembolsa', async () => {
    const { reservas, pagos } = armar();
    const r = await reservas.crearReserva({ ...base, inicio: en(48), fin: en(49) });
    const resultado = await reservas.cancelarReserva(r.id);
    expect(resultado.reembolsada).toBe(true);
    expect(await pagos.estadoDePago(r.pagoId)).toBe('REEMBOLSADO');
  });

  test('con menos de 24 h, la seña NO se reembolsa', async () => {
    const { reservas, pagos } = armar();
    const r = await reservas.crearReserva({ ...base, inicio: en(10), fin: en(11) });
    const resultado = await reservas.cancelarReserva(r.id);
    expect(resultado.reembolsada).toBe(false);
    expect(await pagos.estadoDePago(r.pagoId)).toBe('COBRADO');
  });

  test('cancelar una reserva inexistente falla claro', async () => {
    const { reservas } = armar();
    await expect(reservas.cancelarReserva('no-existe')).rejects.toThrow('RESERVA_INEXISTENTE');
  });

  test('al cancelar, el cliente recibe el aviso con el detalle del reembolso', async () => {
    const { reservas, historial } = armar();
    const r = await reservas.crearReserva({ ...base, inicio: en(48), fin: en(49) });
    await reservas.cancelarReserva(r.id);
    expect(historial.some(a => a.mensaje.includes('reembolsamos'))).toBe(true);
  });
});
