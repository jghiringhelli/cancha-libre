# F-004 — Reprogramar una reserva (el QUÉ, escrito antes del código)

**Qué:** el cliente puede mover su reserva confirmada a otro día y hora, en la misma cancha.

**Reglas**
1. Se puede reprogramar hasta dos horas antes del inicio original. Con menos, no.
2. La seña ya pagada vale para la fecha nueva; no se cobra otra.
3. La fecha nueva respeta la regla 1 del archivo raíz (no superposición), sin contar la reserva que se está moviendo.
4. Una reserva reprogramada, si después se cancela, NO reembolsa la seña, aunque falten más de 24 horas. Así nadie usa la reprogramación como atajo al reembolso.
5. Se avisa al cliente con la fecha nueva.

**Fuera:** no se cambia de cancha ni de precio; para eso, cancelar y reservar de nuevo.

**Criterios de aceptación**
- [x] reprogramar a un horario libre devuelve la reserva con inicio y fin nuevos, mismo pagoId, estado CONFIRMADA
- [x] reprogramar a un horario que se pisa con otra reserva confirmada de la cancha → SUPERPOSICION_DE_RESERVA
- [x] reprogramar la reserva sobre su propio horario corrido (18–19 a 18:30–19:30) funciona
- [x] con menos de dos horas para el inicio original → error ANTICIPACION_INSUFICIENTE
- [x] una reserva reprogramada que se cancela con más de 24 h → no hay reembolso
- [x] una reserva cancelada o inexistente no se puede reprogramar → RESERVA_INEXISTENTE
- [x] se envía una notificación con la fecha nueva
