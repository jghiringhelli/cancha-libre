# 0001 — Tres módulos: reservas, pagos, notificaciones

**Estado:** vigente · **Fecha:** día 0 del proyecto

## Escenario
Hay que partir el sistema en piezas antes de escribir código (paso 2 del método: Acotado).

## Opciones
1. Un solo módulo "app" (rápido de arrancar, imposible de acotar después).
2. Tres módulos por responsabilidad de negocio: reservas / pagos / notificaciones.
3. Micro-módulos por entidad (cancha, cliente, reserva, pago…) — demasiado para el tamaño real.

## Decisión y porqué
La 2. Reservas es el negocio; pagos y notificaciones son servicios que el negocio consume, y
cada uno tiene un motivo distinto para cambiar (proveedor de pagos, canal de aviso). Tres
módulos es lo mínimo que deja practicar interfaces reales sin inventar complejidad.
