// La interfaz de pagos: el enchufe, no el aparato.
// El resto del sistema conoce SOLO esto (regla 4 del archivo raíz).

export type ResultadoDeCobro =
  | { ok: true; pagoId: string; monto: number }
  | { ok: false; motivo: 'RECHAZADO' | 'PROVEEDOR_CAIDO' };

export interface PagosPort {
  /** Cobra la seña (30% del precio, redondeado). */
  cobrarSena(clienteId: string, precioReserva: number): Promise<ResultadoDeCobro>;
  /** Devuelve la seña de un pago previo. */
  reembolsar(pagoId: string): Promise<{ ok: boolean }>;
  /** Estado actual de un pago. */
  estadoDePago(pagoId: string): Promise<'COBRADO' | 'REEMBOLSADO' | 'INEXISTENTE'>;
}
