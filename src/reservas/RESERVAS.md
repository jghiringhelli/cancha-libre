# Módulo `reservas` — la rama del árbol

**Qué hace:** crear, cancelar y reprogramar reservas de una cancha, haciendo cumplir las
reglas 1–3 del [archivo raíz](../../CANCHA-LIBRE.md) y la feature
[F-004](../../docs/features/F-004-reprogramar.md).

**Qué conoce:** SOLO las interfaces `PagosPort` y `NotificacionesPort`, y su propio
`RepositorioReservas`. Jamás una implementación ajena (regla 4, defendida por el gate).

**Su contrato principal:** `crearReserva` rechaza con `SUPERPOSICION_DE_RESERVA` cualquier
reserva que se pise con otra de la misma cancha (los bordes exactos NO se pisan: una reserva
que termina 19:00 y otra que empieza 19:00 conviven). Si el cobro de la seña falla, la
reserva NO queda registrada.

**Cancelación:** `cancelarReserva` — con más de 24 h de anticipación reembolsa la seña; con
menos, no. Una reserva **reprogramada** no reembolsa nunca, aunque falten más de 24 h
(F-004 regla 4: que nadie use la reprogramación como atajo al reembolso). Siempre notifica
al cliente.

**Reprogramación (F-004):** `reprogramarReserva(reservaId, { inicio, fin })` mueve una reserva
CONFIRMADA a otro día y hora, en la misma cancha y al mismo precio. Devuelve la reserva con
las fechas nuevas, el **mismo `pagoId`** (la seña ya pagada vale; no se cobra otra) y
`reprogramada: true`. Rechaza con:
- `RESERVA_INEXISTENTE` si no existe o está cancelada;
- `RANGO_INVALIDO` si el fin nuevo no es posterior al inicio nuevo;
- `ANTICIPACION_INSUFICIENTE` si faltan menos de 2 h para el inicio original (exactamente 2 h
  todavía se puede);
- `SUPERPOSICION_DE_RESERVA` si el horario nuevo se pisa con otra confirmada de la cancha —
  sin contar la reserva que se está moviendo, por eso correrla sobre su propio horario
  (18–19 → 18:30–19:30) funciona.

Siempre avisa al cliente con el horario nuevo. Cambiar de cancha o de precio queda fuera:
para eso, cancelar y reservar de nuevo.

Tests: `tests/reservas/reprogramar.test.ts` (uno por criterio de aceptación de F-004).
