// La interfaz de notificaciones. Una sola función: avisar.
export interface NotificacionesPort {
  notificar(clienteId: string, mensaje: string): Promise<void>;
}
