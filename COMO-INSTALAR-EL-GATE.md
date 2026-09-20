# Cómo instalar el gate (5 minutos, de verdad)

Un gate es un script de ~15 líneas que revisa una regla del proyecto y, si está violada, **rechaza el
commit**. Hay dos, uno por regla, y cada uno nació de algo que salió mal:

| Gate | Regla | De dónde sale |
|---|---|---|
| [`gate-componible.sh`](.githooks/gate-componible.sh) | `reservas` importa solo `*Port.ts`, nunca una implementación ajena | regla 4 del archivo raíz |
| [`gate-ids.sh`](.githooks/gate-ids.sh) | ningún id se arma con un contador de proceso ni con `Date.now()` | F-007 / ADR 0004: un reinicio pisó la fila de otro cliente |

El hook de pre-commit ([`.githooks/pre-commit`](.githooks/pre-commit)) corre los dos gates **y**
`npm test`, con el test de regresión adentro. Así se instala:

## Opción A — git puro (sin dependencias)
```bash
# Decile a git que los hooks viven en .githooks/ (el hook ya está versionado ahí)
git config core.hooksPath .githooks
```
Listo: a partir de ahora, `git commit` corre los gates y la suite primero. Si algo falla, el commit no entra.

## Opción B — si tu proyecto ya usa Husky
```bash
npx husky add .husky/pre-commit "sh .githooks/pre-commit"
```

## Probarlo sin commitear
```bash
npm run gate      # los dos gates
npm test          # la suite
```

## Cómo escribir TU gate
La receta del script: (1) definí la regla como algo buscable (un import prohibido, un patrón,
un archivo que falta), (2) buscalo con `grep`, (3) si aparece, imprimí DÓNDE está y salí con
`exit 1`. Empezá por la regla que tu equipo más rompe — una sola — y dejá el trinquete girar.
