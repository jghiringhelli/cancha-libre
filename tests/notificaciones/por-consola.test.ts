// La implementación de consola cumple NotificacionesPort y guarda historial.
import { describe, test, expect } from 'vitest';
import { porConsola } from '../../src/notificaciones/porConsola';

describe('porConsola cumple NotificacionesPort', () => {
  test('registra cada aviso en el historial', async () => {
    const { port, historial } = porConsola({ silencioso: true });
    await port.notificar('juan', 'hola');
    await port.notificar('pedro', 'chau');
    expect(historial).toHaveLength(2);
    expect(historial[0]).toEqual({ clienteId: 'juan', mensaje: 'hola' });
  });
});
