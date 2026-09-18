# 0002 — La seña es el 30%, redondeado a entero

**Estado:** vigente · **Fecha:** día 0 del proyecto

## Escenario
¿Cuánto se cobra al reservar? Sin seña, la gente reserva y no viene (regla de negocio real de
cualquier cancha).

## Opciones
1. Pago total por adelantado — espanta clientes.
2. Sin seña — no-shows.
3. Seña del 30%, redondeada a entero (sin centavos).

## Decisión y porqué
La 3. Es la práctica común de las canchas del rubro; el redondeo evita manejar centavos en
todo el sistema. El porcentaje vive en el módulo `pagos` (es SU regla): si mañana cambia al
50%, reservas ni se entera.
