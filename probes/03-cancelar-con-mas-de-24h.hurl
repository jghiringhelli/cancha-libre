# Criterio 3: cancelar con más de 24 h → 200 y reembolso: true.
# La reserva es en 2030: sobran las 24 h de anticipación (regla 3 del archivo raíz).
POST {{host}}/reservas
{
  "canchaId": "{{newUuid}}",
  "clienteId": "juan",
  "inicio": "2030-01-12T18:00:00Z",
  "fin": "2030-01-12T19:00:00Z",
  "precio": 100
}
HTTP 201
[Captures]
cancha: jsonpath "$.canchaId"
reserva: jsonpath "$.id"

DELETE {{host}}/reservas/{{reserva}}
HTTP 200
[Asserts]
jsonpath "$.reembolso" == true

# Cancelada, ya no figura entre las confirmadas de la cancha.
GET {{host}}/canchas/{{cancha}}/reservas
HTTP 200
[Asserts]
jsonpath "$" count == 0
