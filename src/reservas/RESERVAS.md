# Módulo `reservas` — la rama del árbol

**Qué hace:** crear y cancelar reservas de una cancha, haciendo cumplir las reglas 1–3 del
[archivo raíz](../../CANCHA-LIBRE.md).

**Qué conoce:** SOLO las interfaces `PagosPort` y `NotificacionesPort`, y su propio
`RepositorioReservas`. Jamás una implementación ajena (regla 4, defendida por el gate).

**Su contrato principal:** `crearReserva` rechaza con `SUPERPOSICION_DE_RESERVA` cualquier
reserva que se pise con otra de la misma cancha (los bordes exactos NO se pisan: una reserva
que termina 19:00 y otra que empieza 19:00 conviven). Si el cobro de la seña falla, la
reserva NO queda registrada.

**Cancelación:** `cancelarReserva` — con más de 24 h de anticipación reembolsa la seña; con
menos, no. Siempre notifica al cliente.
