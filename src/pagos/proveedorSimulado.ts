// Implementación del curso: un proveedor simulado en memoria.
// Cambiar esto por MercadoPago/Stripe no toca NADA fuera de esta carpeta.
import type { PagosPort, ResultadoDeCobro } from './PagosPort';

export function proveedorSimulado(opciones?: { rechazarTodo?: boolean }): PagosPort {
  const pagos = new Map<string, 'COBRADO' | 'REEMBOLSADO'>();
  let secuencia = 0;

  return {
    async cobrarSena(_clienteId, precioReserva): Promise<ResultadoDeCobro> {
      if (opciones?.rechazarTodo) return { ok: false, motivo: 'RECHAZADO' };
      const monto = Math.round(precioReserva * 0.3);
      const pagoId = `pago-${++secuencia}`;
      pagos.set(pagoId, 'COBRADO');
      return { ok: true, pagoId, monto };
    },

    async reembolsar(pagoId) {
      if (pagos.get(pagoId) !== 'COBRADO') return { ok: false };
      pagos.set(pagoId, 'REEMBOLSADO');
      return { ok: true };
    },

    async estadoDePago(pagoId) {
      return pagos.get(pagoId) ?? 'INEXISTENTE';
    },
  };
}
