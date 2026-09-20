# CANCHA LIBRE — reservas de canchas de fútbol 5

> Archivo raíz del árbol sentinela. Tu asistente de IA (el que uses) lee esto al arrancar
> cada sesión — si tu herramienta busca otro nombre de archivo, copiá este contenido ahí.

## 1. Qué es este sistema
Una API de reservas de canchas de fútbol 5: crear reservas, cobrar la seña, cancelar con o
sin reembolso, y avisar al cliente. Proyecto ejemplo del curso "GS en la práctica"
(PragmaWorks) — chico a propósito, real en sus reglas. Hoy: tres módulos de negocio, una API
HTTP (`node:http`) y persistencia en SQLite (`node:sqlite`), sin dependencias de runtime.

## 2. Cómo está organizado (dónde vive cada cosa)
Tres módulos, cada uno con su carpeta, su documento y su interfaz. **Los módulos se hablan
SOLO por interfaces** (los `*Port.ts`).

| Módulo | Qué hace | Su documento | Su interfaz |
|---|---|---|---|
| `src/reservas/` | crear/cancelar reservas, la regla de superposición, la anticipación máxima | [`RESERVAS.md`](src/reservas/RESERVAS.md) | usa las otras dos; publica `RepositorioReservas` y `GeneradorDeIds` para que `api` las implemente |
| `src/pagos/` | cobrar señas y reembolsar (proveedor externo simulado) | [`PAGOS.md`](src/pagos/PAGOS.md) | [`PagosPort.ts`](src/pagos/PagosPort.ts) |
| `src/notificaciones/` | avisar al cliente (confirmación, cancelación) | [`NOTIFICACIONES.md`](src/notificaciones/NOTIFICACIONES.md) | [`NotificacionesPort.ts`](src/notificaciones/NotificacionesPort.ts) |
| `src/api/` — **no es un módulo**, es donde se arma el sistema | `servidor.ts` (HTTP) y `repositorioSqlite.ts`; conoce las implementaciones y se las inyecta a `reservas` | [F-005](docs/features/F-005-api-http.md), [F-006](docs/features/F-006-persistencia-sqlite.md) | ninguna: implementa las de `reservas` |

Ruteo del resto:
- `docs/features/F-NNN-*.md` — el QUÉ de cada feature, escrito antes del código: [F-005 API](docs/features/F-005-api-http.md) · [F-006 SQLite + tres capas](docs/features/F-006-persistencia-sqlite.md) · [F-007 ids que no se pisan](docs/features/F-007-ids-que-no-se-pisan.md) · [F-008 anticipación máxima](docs/features/F-008-anticipacion-maxima.md).
- `docs/decisiones/NNNN-*.md` — ADRs: [0001 tres módulos](docs/decisiones/0001-tres-modulos.md) · [0002 seña 30%](docs/decisiones/0002-sena-30-por-ciento.md) · [0003 repositorio detrás de interfaz](docs/decisiones/0003-almacenamiento-en-memoria.md) (memoria en tests; SQLite en la API desde F-006) · [0004 ids UUID](docs/decisiones/0004-ids-uuid.md) · [0005 anticipación máxima 30 días](docs/decisiones/0005-anticipacion-maxima-30-dias.md).
- `tests/<módulo>/` — unitarios (vitest, repositorio en memoria). `tests/integracion/tres-capas.ts` — contra el servidor andando.
- `probes/*.hurl` — un probe por criterio de aceptación de F-005 (y uno de F-008); los corre `integracion`. Las fechas las calcula `probes/fechas.ts` al correr (dentro de la ventana de 30 días); `probes/correr.ts` es `npm run probes`.
- `.githooks/` — `gate-componible.sh`, `gate-ids.sh`, `pre-commit`. Cómo se instalan: [`COMO-INSTALAR-EL-GATE.md`](COMO-INSTALAR-EL-GATE.md).

## 2b. Estándares
- TypeScript estricto, ESM, corre sin compilar (`node --experimental-transform-types`): **Node 24+**.
- Sin dependencias de runtime: solo `node:*` (`http`, `sqlite`, `crypto`). Dev: vitest, typescript.
- Código, comentarios y documentos en español; los nombres del dominio son los de §2.
- Fechas: ISO 8601 en UTC, un solo lugar que parsea (`new Date(iso)`); nunca strings armados.
- Cada feature nace como el QUÉ en `docs/features/` (reglas, fuera, criterios de aceptación
  verificables) **antes** del código. Cada decisión con alternativas, un ADR.
- Un defecto encontrado deja tres cosas: test de regresión, gate que lo frena, ADR con la evidencia
  (y su fila en §4b). Es el trinquete: lo que ya salió mal no puede volver a entrar.

## 3. Reglas que no se negocian
1. **Nunca dos reservas superpuestas en la misma cancha** (el contrato vive en
   `tests/reservas/no-doble-reserva.test.ts`).
2. **Nunca una reserva confirmada sin seña cobrada** (30% del precio).
3. Cancelación con más de 24 horas de anticipación → se reembolsa la seña; con menos, no.
4. `reservas` no conoce implementaciones de pagos ni de notificaciones: solo sus interfaces
   (lo hace cumplir el gate: `.githooks/gate-componible.sh`).
5. **No se reserva con más de 30 días de anticipación** (error `ANTICIPACION_EXCESIVA`; el número
   sale de ADR 0005; el contrato vive en `tests/reservas/anticipacion-maxima.test.ts`).

## 4. Fuera de alcance (una línea, no una lista)
Reservas y nada más: sin torneos ni ligas, sin indumentaria ni buffet, sin usuarios/roles ni
autenticación, y sin procesar tarjetas (los pagos los hace un proveedor externo — acá solo se
registra el estado; en el curso, simulado). Si no está en §2, no existe.

> Esto es scope, no un guardarraíl: a un modelo moderno "no manejes torneos" casi no le aporta. Lo que
> sí le sirve está en §4b.

## 4b. Guardarraíles (lo que ya salió mal, con nombre)
Reglas técnicas con su motivo y su salida de emergencia. **Un guardarraíl se gana con un tropiezo:**
si no podés escribir por qué está, no va. El gemelo enfermo (`../cancha-libre-legacy/`) es la fuente
de casi todos estos — ahí están las consecuencias, verificables en el código.

| Regla | Por qué está (la evidencia) | A menos que |
|---|---|---|
| El estado de las reservas no vive en una variable global compartida: pasa por `RepositorioReservas` | ADR 0003 — y ya rindió: F-006 cambió memoria por SQLite sin tocar `src/reservas/` | sea un caché **dentro** de un módulo, que no cruza la frontera |
| `reservas` importa `*Port.ts`, nunca una implementación | es la regla 4, y la hace cumplir `.githooks/gate-componible.sh` en cada commit | nunca por atajo: si la interfaz no alcanza, **primero** se cambia la interfaz |
| Una sola forma de parsear y comparar fechas. Nada de armar horas concatenando strings | en el gemelo, `hora+1+':00'` produce **"24:00"**, una hora que no existe | nunca |
| Un test sin `expect` no es un test | en el gemelo, `tests/test.js` imprime "todo ok" sin afirmar nada: dio permiso para no mirar durante meses | nunca |
| Los números de negocio (seña, horas de cancelación, días de anticipación) salen de su decisión registrada, no inline | en el gemelo conviven **tres** versiones de la seña y una constante de cancelación muerta que nadie confirmó | nunca: si el número cambia, cambia el registro primero |
| Ningún identificador que se persista depende del estado de un proceso: los ids los da un generador inyectado (`GeneradorDeIds`, UUID), nunca un contador ni `Date.now()` | ADR 0004 — tras reiniciar el servidor, `reserva-${++secuencia}` volvió a dar `reserva-1` y **pisó la fila de otro cliente**; lo encontró `npm run integracion` y lo frena `.githooks/gate-ids.sh` | nunca |
| Una premisa que deja de ser cierta se revisa: qué más dependía de ella | F-005 decía "se pierde al reiniciar"; F-006 lo cambió y nadie revisó los ids → ADR 0004. Y otra vez en F-008: "cualquier fecha futura sirve" dejó de valer con la ventana de 30 días, y los probes y el test de F-007 reservaban en 2030 | nunca |

## 5. Herramientas: cuándo cuál
Requisitos: Node 24+ (`node:sqlite`), `hurl` en el PATH para probes e integración; `sqlite3` CLI solo
para mirar la base a mano.

| Momento | Comando | Qué cubre |
|---|---|---|
| Mientras codeás, a cada cambio | `npm test` | unitarios (vitest), en memoria, sin servidor, segundos |
| Antes de commitear | `npm run gate` | los dos gates. El `pre-commit` corre gates + `npm test` solo |
| Tocaste `src/api/`, `probes/` o la persistencia | terminal 1: `npm run api` · terminal 2: `npm run integracion` | probes Hurl contra `HOST` + base antes/después en `DB_PATH` (mismo valor en ambas terminales) |
| Iterar solo sobre HTTP, sin mirar la base | `npm run probes` (servidor andando; `HOST` si no es el 3000) | los `.hurl` sueltos; no reemplaza a `integracion` |
| Cerrar una feature que persiste | reiniciar el servidor con base poblada y correr `integracion` otra vez | el caso que falló en F-007 |

Orden de trabajo. Feature nueva: el QUÉ (`docs/features`) → interfaz si hace falta → código → tests
→ integración si toca API/base. Defecto encontrado: test de regresión en rojo → arreglo → gate → ADR →
fila en §4b. Nunca al revés, y nunca "arreglar" un gate o un test para que pase.
