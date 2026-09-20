# Cancha Libre — el proyecto del curso GS Core

Reservas de canchas de fútbol 5. Chico a propósito, real en sus reglas. Es el proyecto sobre el que se
demuestran los prácticos del curso **GS Core** de PragmaWorks (Especificación Generativa):
**pragmaworks.dev/curso** (alias de `/course`).

## Bajalo y seguí

```bash
git clone https://github.com/jghiringhelli/cancha-libre
cd cancha-libre
npm install
npm test        # 18 tests en verde
npm run gate    # el chequeo de componibilidad
```

Después, abrí `CANCHA-LIBRE.md`: es el archivo raíz, el que tu asistente lee al arrancar cada sesión.
Si tu herramienta busca otro nombre (`AGENTS.md`, `CLAUDE.md`), copiá ese contenido ahí.

## Los prácticos (cada uno tiene su receta en el sitio)

| # | Práctico | Receta |
|---|---|---|
| 1 | Dar vuelta el orden en diez minutos | pragmaworks.dev/curso/p1 |
| 2 | Hacé que la IA pruebe tu app viva | pragmaworks.dev/curso/p2 |
| 3 | Un DEBE, un gate, una vuelta del trinquete | pragmaworks.dev/curso/p3 |
| 4 | Tu sentinela en quince minutos | pragmaworks.dev/curso/p4 |
| 5 | Calificá tu spec | pragmaworks.dev/curso/p5 |

Cada práctico tiene su punto de partida marcado en el repo, por si no hiciste el anterior o querés arrancar limpio:

```bash
git checkout p1-inicio   # = main, el proyecto limpio (P1 y P2 arrancan de acá)
git checkout p3-inicio   # lo que quedó al terminar P2 (API + SQLite + integración)
git checkout p4-inicio   # lo que quedó al terminar P3 (ids UUID, gate, hook)
git checkout p5-inicio   # lo que quedó al terminar P4 (raíz auditado, F-008)
git checkout pN-hecho    # el estado al terminar el práctico N, para comparar con el tuyo
```
La progresión entera está en la rama `practicos`; `main` queda siempre limpio. Para volver a un estado
limpio dentro de un práctico: `git checkout . && git clean -fd`.

Tu resultado no va a ser idéntico al del video: depende del modelo, del prompt y del asistente que uses.
Debería ser parecido. Si no lo es, eso también enseña: fijate qué asumió el tuyo.

## El gemelo enfermo
La versión con los defectos típicos (`cancha-libre-legacy`) se usa en el curso YouTube "El rescate del legacy".

---
PragmaWorks · Juan Carlos Ghiringhelli · MIT
