# 0003 — Almacenamiento: en memoria, detrás de una interfaz

**Estado:** vigente · **Fecha:** día 0 del proyecto

## Escenario
Dónde guardar las reservas. Este proyecto es el ejemplo de un curso: tiene que correr con
`npm test` en cualquier máquina, sin instalar nada.

## Opciones
1. Postgres — lo que usaríamos en producción; exige instalación y credenciales.
2. SQLite — más liviano, pero sigue siendo una dependencia y archivos que versionar.
3. En memoria, detrás de la interfaz `RepositorioReservas`.

## Decisión y porqué
La 3 — y no es la "mejor" base de datos: es la más simple que cumple el objetivo del curso
(que cualquiera lo corra en un minuto). Eso también se escribe: elegimos simple a sabiendas.
La interfaz es lo que hace honesta esta decisión: producción cambiaría `repositorioEnMemoria`
por un `repositorioPostgres` que cumpla el MISMO contrato, y ni reservas ni los tests de
reglas de negocio se enteran.
