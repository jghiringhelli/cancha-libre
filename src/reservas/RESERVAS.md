# Módulo `reservas` — la rama del árbol

**Qué hace:** crear y cancelar reservas de una cancha, haciendo cumplir las reglas 1–3 y 5 del
[archivo raíz](../../CANCHA-LIBRE.md).

**Qué conoce:** SOLO las interfaces `PagosPort` y `NotificacionesPort`, y sus propias
`RepositorioReservas` y `GeneradorDeIds`. Jamás una implementación ajena (regla 4, defendida por el gate).

**No fabrica ids:** los pide al generador inyectado (`GeneradorDeIds.nuevoId()`, UUID). Un id que
salga de un contador del proceso se pisa al reiniciar — pasó (ADR 0004) y lo frena `gate-ids.sh`.

**Su contrato principal:** `crearReserva` rechaza con `SUPERPOSICION_DE_RESERVA` cualquier
reserva que se pise con otra de la misma cancha (los bordes exactos NO se pisan: una reserva
que termina 19:00 y otra que empieza 19:00 conviven). Si el cobro de la seña falla, la
reserva NO queda registrada.

**Anticipación máxima (F-008):** `crearReserva` rechaza con `ANTICIPACION_EXCESIVA` toda reserva
cuyo inicio está a más de 30 días del momento del pedido (30 exactos vale). Lo hace antes de tocar
nada: ni repositorio, ni cobro, ni aviso. El número sale de ADR 0005 y vive con nombre
(`DIAS_MAXIMOS_DE_ANTICIPACION`); se mide con el mismo reloj inyectable (`ahora`) que la cancelación.

**Cancelación:** `cancelarReserva` — con más de 24 h de anticipación reembolsa la seña; con
menos, no. Siempre notifica al cliente.
