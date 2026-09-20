# 0005 — La anticipación máxima para reservar es de 30 días

**Estado:** vigente · **Fecha:** 2026-09-20 (F-008)

## Escenario
¿Hasta cuándo se puede reservar para adelante? Sin tope, un cliente bloquea el sábado a la noche de
todo el año con una seña chica por turno, y la cancha pierde la agenda (y los clientes que sí van a
venir). Es la regla que aplican las canchas del rubro: la agenda se abre una ventana corta.

## Opciones
1. Sin tope — es lo que había: los probes reservaban en 2030 y el sistema decía que sí.
2. Ventana fija de 30 días, medida desde el momento del pedido — un mes es lo que se acostumbra
   en el rubro: cubre "el sábado que viene" y "el cumpleaños del mes que viene".
3. Ventana más larga (60/90 días) — para un torneo o un evento; fuera de alcance (§4: reservas y
   nada más).
4. Ventana configurable por cancha o por variable de entorno — un número más que nadie confirma
   (en el gemelo, así nació la constante de cancelación muerta).

## Decisión y porqué
La 2. Un número, escrito acá, y en el código con nombre (`DIAS_MAXIMOS_DE_ANTICIPACION` en
`src/reservas/reservas.ts`, con referencia a este ADR). El borde es inclusivo: exactamente 30 días es
válido, lo que se rechaza es *más de* 30. La regla vive en `reservas` porque es SU regla (como la
superposición), no en la API: cualquier cliente del módulo la cumple sin saber que existe.

Lo que arrastró: la premisa "cualquier fecha futura sirve para probar" dejó de ser cierta. Los probes
Hurl pasan a calcular sus fechas al correr (`probes/fechas.ts`), dentro de la ventana; el test de
F-007 fija su reloj con `ahora`. Si mañana el número cambia, cambia este ADR primero, después la
constante, y los probes no se enteran.
