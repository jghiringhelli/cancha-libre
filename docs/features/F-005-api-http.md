# F-005 — Exponer las reservas por HTTP (el QUÉ)

**Qué:** una API HTTP mínima sobre el módulo `reservas`, para que se pueda probar el sistema andando, no solo con tests unitarios.

**Reglas**
1. No se cambia el módulo `reservas`: la API solo lo llama. Regla 4 del archivo raíz sigue: la API conoce implementaciones (pagos simulado, notificaciones por consola) y se las inyecta; `reservas` no.
2. Endpoints: `POST /reservas` (crea; 201 con la reserva; 409 si se pisa; 402 si la seña es rechazada; 400 si el rango es inválido — y, desde F-008, 400 `ANTICIPACION_EXCESIVA` a más de 30 días), `DELETE /reservas/:id` (cancela; 200 con `{reembolso: true|false}`; 404 si no existe), `GET /canchas/:id/reservas` (lista las confirmadas).
3. Sin dependencias nuevas: `node:http` y nada más. Puerto por variable `PORT`, default 3000.
4. Estado en memoria (el repositorio que ya existe). Se pierde al reiniciar: está bien para este práctico.

**Fuera:** autenticación, usuarios, persistencia, cualquier otro recurso.

**Criterios de aceptación** (se verifican contra el servidor andando, con Hurl)
- [ ] crear una reserva válida → 201, y aparece en el listado de la cancha
- [ ] crear una segunda reserva que se pisa → 409, y el listado sigue con una
- [ ] cancelar con más de 24 h → 200 y `reembolso: true`
- [ ] cancelar una inexistente → 404
- [ ] `npm run api` levanta el servidor; `npm run probes` corre las pruebas Hurl contra él
