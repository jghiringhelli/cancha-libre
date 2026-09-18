// El proveedor simulado cumple el contrato de PagosPort.
import { describe, test, expect } from 'vitest';
import { proveedorSimulado } from '../../src/pagos/proveedorSimulado';

describe('proveedorSimulado cumple PagosPort', () => {
  test('cobra la seña y la reporta como COBRADO', async () => {
    const pagos = proveedorSimulado();
    const cobro = await pagos.cobrarSena('juan', 100);
    expect(cobro.ok).toBe(true);
    if (cobro.ok) {
      expect(cobro.monto).toBe(30);
      expect(await pagos.estadoDePago(cobro.pagoId)).toBe('COBRADO');
    }
  });

  test('reembolsa solo pagos cobrados, una sola vez', async () => {
    const pagos = proveedorSimulado();
    const cobro = await pagos.cobrarSena('juan', 100);
    if (!cobro.ok) throw new Error('el cobro debía funcionar');
    expect((await pagos.reembolsar(cobro.pagoId)).ok).toBe(true);
    expect((await pagos.reembolsar(cobro.pagoId)).ok).toBe(false);
    expect(await pagos.estadoDePago(cobro.pagoId)).toBe('REEMBOLSADO');
  });

  test('un pago desconocido es INEXISTENTE', async () => {
    const pagos = proveedorSimulado();
    expect(await pagos.estadoDePago('nada')).toBe('INEXISTENTE');
  });
});
