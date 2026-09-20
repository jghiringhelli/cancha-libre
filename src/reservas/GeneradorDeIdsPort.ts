// La interfaz del generador de identificadores: el enchufe, no el aparato.
// F-007 / ADR 0004: reservas NO fabrica ids — los recibe por acá, como recibe pagos y notificaciones.
// Ningún identificador que se persista puede depender del estado de un proceso.
export interface GeneradorDeIds {
  /** Un id nuevo, único aunque el servidor se reinicie o haya dos servidores sobre la misma base. */
  nuevoId(): string;
}
