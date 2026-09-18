# Módulo `pagos` — la rama del árbol

**Qué hace:** cobrar señas y reembolsarlas contra un proveedor de pagos. En el curso, el
proveedor es simulado (`proveedorSimulado.ts`) — procesar tarjetas de verdad está fuera de
alcance (archivo raíz §4).

**Qué publica:** la interfaz [`PagosPort.ts`](PagosPort.ts) — tres funciones: `cobrarSena`,
`reembolsar`, `estadoDePago`. **Eso es todo lo que el resto del sistema puede conocer.**

**Regla propia:** la seña es el 30% del precio de la reserva, redondeado a entero.
