# CANCHA LIBRE — reservas de canchas de fútbol 5

> Archivo raíz del árbol sentinela. Tu asistente de IA (el que uses) lee esto al arrancar
> cada sesión — si tu herramienta busca otro nombre de archivo, copiá este contenido ahí.

## 1. Qué es este sistema
Una API de reservas de canchas de fútbol 5: crear reservas, cobrar la seña, cancelar con o
sin reembolso, y avisar al cliente. Proyecto ejemplo del curso "GS en la práctica"
(PragmaWorks) — chico a propósito, real en sus reglas.

## 2. Cómo está organizado
Tres módulos, cada uno con su carpeta, su documento y su interfaz. **Los módulos se hablan
SOLO por interfaces** (los `*Port.ts`).

| Módulo | Qué hace | Su documento | Su interfaz |
|---|---|---|---|
| `src/reservas/` | crear/cancelar reservas, la regla de superposición | [`RESERVAS.md`](src/reservas/RESERVAS.md) | usa las otras dos |
| `src/pagos/` | cobrar señas y reembolsar (proveedor externo simulado) | [`PAGOS.md`](src/pagos/PAGOS.md) | [`PagosPort.ts`](src/pagos/PagosPort.ts) |
| `src/notificaciones/` | avisar al cliente (confirmación, cancelación) | [`NOTIFICACIONES.md`](src/notificaciones/NOTIFICACIONES.md) | [`NotificacionesPort.ts`](src/notificaciones/NotificacionesPort.ts) |

Los tests viven en `tests/`, espejando los módulos. Las decisiones, en `docs/decisiones/`.

## 3. Reglas que no se negocian
1. **Nunca dos reservas superpuestas en la misma cancha** (el contrato vive en
   `tests/reservas/no-doble-reserva.test.ts`).
2. **Nunca una reserva confirmada sin seña cobrada** (30% del precio).
3. Cancelación con más de 24 horas de anticipación → se reembolsa la seña; con menos, no.
4. `reservas` no conoce implementaciones de pagos ni de notificaciones: solo sus interfaces
   (lo hace cumplir el gate: `.githooks/gate-componible.sh`).

## 4. Fuera de alcance (una línea, no una lista)
Reservas y nada más: sin torneos ni ligas, sin indumentaria ni buffet, sin usuarios/roles ni
autenticación, y sin procesar tarjetas (los pagos los hace un proveedor externo — acá solo se
registra el estado; en el curso, simulado). Si no está en §2, no existe.

> **Esto es scope, no un guardarraíl.** Decirle a un modelo moderno "no manejes torneos" casi no le
> aporta: no los iba a inventar solo. Y una lista larga de "lo que no somos" ensucia el archivo raíz
> sin hacer más segura ni una sesión. Lo que sí le sirve está en §4b.

## 4b. Guardarraíles (lo que ya salió mal, con nombre)
Reglas técnicas con su motivo y su salida de emergencia. **Un guardarraíl se gana con un tropiezo:**
si no podés escribir por qué está, no va. El gemelo enfermo (`../cancha-libre-legacy/`) es la fuente
de casi todos estos — ahí están las consecuencias, verificables en el código.

| Regla | Por qué está (la evidencia) | A menos que |
|---|---|---|
| El estado de las reservas no vive en una variable global compartida: pasa por `RepositorioReservas` | ADR 0003 — cambiar en memoria por Postgres no puede obligar a tocar las reglas de negocio | sea un caché **dentro** de un módulo, que no cruza la frontera |
| `reservas` importa `*Port.ts`, nunca una implementación | es la regla 4, y la hace cumplir `.githooks/gate-componible.sh` en cada commit | nunca por atajo: si la interfaz no alcanza, **primero** se cambia la interfaz |
| Una sola forma de parsear y comparar fechas. Nada de armar horas concatenando strings | en el gemelo, `hora+1+':00'` produce **"24:00"**, una hora que no existe | nunca |
| Un test sin `expect` no es un test | en el gemelo, `tests/test.js` imprime "todo ok" sin afirmar nada: dio permiso para no mirar durante meses | nunca |
| Los números de negocio (seña, horas de cancelación) salen de su decisión registrada, no inline | en el gemelo conviven **tres** versiones de la seña y una constante de cancelación muerta que nadie confirmó | nunca: si el número cambia, cambia el registro primero |

## 5. Cómo correrlo
```bash
npm install
npm test          # toda la suite
npm run gate      # el chequeo de componibilidad, a mano
```
Gate en cada commit: ver [`COMO-INSTALAR-EL-GATE.md`](COMO-INSTALAR-EL-GATE.md).
