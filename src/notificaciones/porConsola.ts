// Implementación del curso: consola + historial en memoria (para los tests).
// Regla propia del módulo: notificar NUNCA tumba la operación que avisa.
import type { NotificacionesPort } from './NotificacionesPort';

export function porConsola(opciones?: { silencioso?: boolean }) {
  const historial: { clienteId: string; mensaje: string }[] = [];

  const port: NotificacionesPort = {
    async notificar(clienteId, mensaje) {
      historial.push({ clienteId, mensaje });
      if (!opciones?.silencioso) console.log(`[aviso a ${clienteId}] ${mensaje}`);
    },
  };

  return { port, historial };
}
