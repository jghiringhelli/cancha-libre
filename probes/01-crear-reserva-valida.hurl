# Criterio 1: crear una reserva válida → 201, y aparece en el listado de la cancha.
# La cancha es un uuid nuevo por corrida: el estado vive en memoria y así cada probe es independiente.
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
[Asserts]
jsonpath "$.id" exists
jsonpath "$.estado" == "CONFIRMADA"
jsonpath "$.pagoId" exists
jsonpath "$.clienteId" == "juan"

GET {{host}}/canchas/{{cancha}}/reservas
HTTP 200
[Asserts]
jsonpath "$" count == 1
jsonpath "$[0].id" == "{{reserva}}"
jsonpath "$[0].estado" == "CONFIRMADA"
