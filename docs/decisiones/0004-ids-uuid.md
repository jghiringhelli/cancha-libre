# 0004 — Los identificadores son UUID inyectados, nunca un contador del proceso

**Estado:** vigente · **Fecha:** 2026-09-20 (F-007)

## Escenario
El test de integración de F-006 (`npm run integracion`, tres capas) encontró un defecto real: con el
servidor reiniciado sobre una base poblada, HTTP dijo haber creado 3 reservas y la base siguió con 3
filas. La reserva nueva recibió el id `reserva-1` y **sobrescribió** la fila de otro cliente (el
`guardar()` de SQLite hace insert-o-update por id, como debe). Causa: `reservas` armaba el id con un
contador en memoria (`reserva-${++secuencia}`) que arranca en cero en cada proceso. `pagos` hacía lo
mismo con `pago-${++secuencia}`.

La consulta a la especificación — ¿qué restricción, si hubiera estado escrita, habría descartado esa
decisión? — da esta: **ningún identificador que se persista puede depender del estado de un proceso.**
Mientras el estado vivía solo en memoria (ADR 0003) el contador no dolía; al persistir (F-006) pasó a
ser un defecto. La premisa de F-005 ("se pierde al reiniciar") dejó de ser cierta y nadie revisó qué
más dependía de ella.

## Opciones
1. Seguir con el contador pero inicializarlo desde la base (`max(id)` al arrancar) — sigue siendo
   estado de proceso: dos servidores sobre la misma base vuelven a chocar, y cada reinicio es una
   carrera contra la base.
2. `autoincrement` de SQLite — ata el id a una implementación concreta del repositorio: `reservas`
   tendría que guardar primero y preguntar el id después, y el repositorio en memoria (el de los
   tests) tendría que imitarlo. Cambia el contrato de `RepositorioReservas` por un detalle de
   almacenamiento.
3. `crypto.randomUUID()`, entregado a `reservas` por una interfaz inyectada (`GeneradorDeIds`), como
   ya recibe pagos y notificaciones. Único sin coordinación: sobrevive reinicios y a dos servidores
   sobre la misma base. Viene con Node; sin dependencias.

## Decisión y porqué
La 3. Es la única que cumple la restricción tal como quedó escrita — no depende de ningún proceso ni
de ninguna base — y la única que no obliga a `reservas` a conocer cómo se guarda. Se hizo en el orden
del guardarraíl: **primero la interfaz** (`src/reservas/GeneradorDeIdsPort.ts`), después el código.
`reservas` ya no fabrica ids: pide `nuevoId()`. La implementación (`src/reservas/generadorUuid.ts`)
es el único lugar de `src/` que los fabrica; el proveedor simulado de pagos usa `randomUUID()`
directo porque el id del pago es del proveedor (un MercadoPago real devolvería el suyo).

Lo que queda para que no vuelva a pasar:
- **Test de regresión** (`tests/reservas/ids-que-no-se-pisan.test.ts`): dos módulos sobre el mismo
  repositorio no repiten ids; reiniciar (módulo nuevo, misma base SQLite) y crear no toca ninguna fila
  existente. Con el contador, los dos fallan.
- **Gate que frena** (`.githooks/gate-ids.sh`, parte de `npm run gate`): un id armado con
  `++secuencia`, `contador++` o `Date.now()` en `src/`, fuera del generador, rechaza el commit.
- **Pre-commit** (`.githooks/pre-commit`): corre los gates y `npm test`, con la regresión adentro.
- Guardarraíl nuevo en el archivo raíz (§4b), con este ADR como evidencia.

Fuera: migrar los ids viejos (`reserva-N`, `pago-N`) y ordenar por id — los UUID no tienen orden y no
hace falta que lo tengan.
