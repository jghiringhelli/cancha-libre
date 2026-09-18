# Cómo instalar el gate (5 minutos, de verdad)

El gate es un script de ~15 líneas ([`.githooks/gate-componible.sh`](.githooks/gate-componible.sh))
que revisa una regla del proyecto y, si está violada, **rechaza el commit**. Así se instala:

## Opción A — git puro (sin dependencias)
```bash
# 1. Decile a git que los hooks viven en .githooks/
git config core.hooksPath .githooks

# 2. Creá el hook de pre-commit que llama al gate
printf '#!/bin/sh\nsh "$(git rev-parse --show-toplevel)/ejemplos/cancha-libre/.githooks/gate-componible.sh"\n' > .githooks/pre-commit
chmod +x .githooks/pre-commit .githooks/gate-componible.sh
```
Listo: a partir de ahora, `git commit` corre el gate primero. Si falla, el commit no entra.

## Opción B — si tu proyecto ya usa Husky
```bash
npx husky add .husky/pre-commit "sh .githooks/gate-componible.sh"
```

## Probarlo sin commitear
```bash
npm run gate
```

## Cómo escribir TU gate
La receta del script: (1) definí la regla como algo buscable (un import prohibido, un patrón,
un archivo que falta), (2) buscalo con `grep`, (3) si aparece, imprimí DÓNDE está y salí con
`exit 1`. Empezá por la regla que tu equipo más rompe — una sola — y dejá el trinquete girar.
