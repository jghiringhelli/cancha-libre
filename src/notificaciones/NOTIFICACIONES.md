# Módulo `notificaciones` — la rama del árbol

**Qué hace:** avisar al cliente cuando su reserva se confirma o se cancela.

**Qué publica:** la interfaz [`NotificacionesPort.ts`](NotificacionesPort.ts) — una función:
`notificar(clienteId, mensaje)`. La implementación del curso escribe por consola y guarda un
historial en memoria (`porConsola.ts`); mandar emails o WhatsApp de verdad queda fuera de
alcance.

**Regla propia:** notificar nunca puede tumbar una operación de reservas — si falla, se
registra y se sigue (el aviso es importante; la reserva, más).
