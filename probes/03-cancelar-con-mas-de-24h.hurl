# Criterio 3: cancelar con más de 24 h → 200 y reembolso: true.
# {{inicio}} está a una semana (fechas.ts): sobran las 24 h de anticipación (regla 3) y entra en la ventana de 30 días (F-008).
POST {{host}}/reservas
{
  "canchaId": "{{newUuid}}",
  "clienteId": "juan",
  "inicio": "{{inicio}}",
  "fin": "{{fin}}",
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
