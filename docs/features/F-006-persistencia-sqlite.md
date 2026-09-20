# F-006 — Persistencia en SQLite y verificación en tres capas (el QUÉ)

**Qué:** las reservas se guardan en una base SQLite, para que el sistema tenga estado real que se pueda mirar
desde afuera, y la verificación de F-005 pase a hacerse en tres capas: la base antes, los pedidos HTTP con el
log del servidor, y la base después.

**Reglas**
1. No se cambia el módulo `reservas`. Se agrega una implementación de `RepositorioReservas` sobre SQLite y el
   servidor la usa en lugar de la de memoria.
2. Sin dependencias nuevas: `node:sqlite` (viene con Node 24). Archivo por variable `DB_PATH`, default `cancha.db`.
3. La verificación se hace contra el sistema andando y **en tres capas**: (a) consultar la base con la CLI
   `sqlite3` antes; (b) disparar los probes Hurl y leer el log del servidor; (c) consultar la base después y
   confirmar que lo que dice la respuesta HTTP, lo que dice el log y lo que quedó guardado cuentan la misma historia.
4. Esa verificación **queda capturada como test de integración** ejecutable contra cualquier entorno:
   `npm run integracion` corre los probes contra `HOST` (default `http://localhost:3000`) y después comprueba la
   base (`DB_PATH`). Tiene que poder correr igual en local y en staging, cambiando solo esas dos variables.

**Fuera:** migraciones, concurrencia, cualquier otro recurso.

**Criterios de aceptación**
- [ ] `npm test` sigue en verde (18) y el gate en verde; `src/reservas` sin cambios
- [ ] antes de los probes, `sqlite3 cancha.db "select count(*) from reservas"` da 0; después, la cuenta y los estados coinciden con lo que devolvieron los probes (confirmadas y canceladas)
- [ ] `npm run integracion` pasa en local, y su salida dice explícitamente qué verificó en cada capa
- [ ] reiniciar el servidor no pierde las reservas
