# F-007 — Los identificadores no se pisan (el QUÉ, nacido de un defecto)

**De dónde sale:** el test de integración de F-006 encontró que, tras reiniciar el servidor, una reserva nueva
recibió el id `reserva-1` y **sobrescribió** la fila de otro cliente. Causa: `reservas` genera ids con un contador
en memoria (`reserva-${++secuencia}`), que arranca en cero en cada proceso. Lo mismo pasa con `pago-N`.

**La consulta a la especificación:** ¿qué restricción, si hubiera estado escrita, habría descartado esa decisión?
Esta: *ningún identificador que se persista puede depender del estado de un proceso.*

**Reglas**
1. **DEBE**: todo id de reserva y de pago es único aunque el servidor se reinicie, y aunque haya dos servidores
   sobre la misma base. Se genera con `crypto.randomUUID()` (viene con Node; sin dependencias).
2. `reservas` no fabrica ids: los recibe de un generador inyectado por su interfaz, como recibe pagos y
   notificaciones. **Primero se cambia la interfaz, después el código** (guardarraíl del archivo raíz).
3. **DEBE**: un defecto encontrado queda como test de regresión: reiniciar el servidor y crear una reserva no
   toca ninguna fila existente.
4. **DEBE**: queda un gate que frena. Dos partes: (a) `npm run gate` falla si en `src/` hay un id que se arma
   con un contador de proceso (`++secuencia`, `contador++`, `Date.now()` como id) fuera del generador; (b) el
   hook de pre-commit corre `npm test` (con la regresión adentro) además del gate de componibilidad.
5. Queda registrada la decisión (ADR 0004): el defecto, la regla, por qué UUID.

**Fuera:** migrar ids viejos; ordenar por id.

**Criterios de aceptación**
- [ ] tests de regresión: dos instancias del módulo sobre el mismo repositorio no producen ids repetidos; y `crearReserva` después de "reiniciar" (nuevo módulo, mismo repositorio SQLite) no modifica filas existentes
- [ ] `npm run gate` en verde en el estado final, y **en rojo** si alguien vuelve a poner un contador como id (probarlo rompiéndolo a propósito y revirtiendo)
- [ ] `npm run integracion` pasa después de un reinicio con base poblada (el caso que fallaba)
- [ ] `npm test` en verde; `docs/decisiones/0004-*.md` escrito
