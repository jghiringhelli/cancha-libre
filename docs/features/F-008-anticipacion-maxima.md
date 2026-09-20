# F-008 — No se reserva con más de treinta días de anticipación (el QUÉ)

**Qué:** una regla de negocio nueva en `reservas`: una reserva cuyo inicio está a **más de 30 días** del
momento en que se pide se rechaza con `ANTICIPACION_EXCESIVA`. Es la regla 5 del archivo raíz.

**Reglas**
1. **DEBE**: `crearReserva` rechaza con `ANTICIPACION_EXCESIVA` toda reserva con `inicio - ahora > 30 días`.
   Exactamente 30 días es válido; lo que se rechaza es *más de* 30.
2. **DEBE**: el rechazo pasa **antes** de tocar nada: no se consulta el repositorio, no se cobra la seña, no
   se avisa al cliente. Igual que `RANGO_INVALIDO`.
3. El número (30) no vive inline: sale de su decisión registrada (ADR 0005), como manda el guardarraíl del
   archivo raíz. Si cambia, cambia el ADR primero.
4. La anticipación se mide con el mismo reloj inyectable que ya usa la cancelación (`ahora`), en
   milisegundos sobre `Date`: una sola forma de comparar fechas, nada de strings.
5. La API traduce el código a **400** (es un pedido inválido tal como vino, como `RANGO_INVALIDO`;
   no es un conflicto con otra reserva, que sería 409).

**Fuera:** anticipación mínima (reservar "para dentro de cinco minutos" sigue valiendo), límites por
cancha o por cliente, y cualquier configuración por variable de entorno.

**Lo que arrastra:** los probes y el test de F-007 usaban fechas fijas en 2030 porque "cualquier fecha
futura sirve". Esa premisa deja de ser cierta (guardarraíl §4b: una premisa que cambia se revisa): las
fechas de los probes se calculan al correrlos (`probes/fechas.ts`, dentro de la ventana) y el test de F-007
fija su reloj con `ahora`.

**Criterios de aceptación**
- [ ] test unitario: a 31 días → `ANTICIPACION_EXCESIVA`; el repositorio queda vacío y no hay cobro
- [ ] test unitario: a 30 días exactos → `CONFIRMADA` (el borde es inclusivo)
- [ ] probe Hurl: `POST /reservas` a más de 30 días → 400 `ANTICIPACION_EXCESIVA`, y la cancha sigue sin reservas
- [ ] `npm test`, `npm run gate` y `npm run integracion` en verde; `docs/decisiones/0005-*.md` escrito
