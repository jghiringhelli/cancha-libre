# Criterio 2: crear una segunda reserva que se pisa → 409, y el listado sigue con una.
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

# Superposición parcial: 18:30–19:30 se pisa con 18:00–19:00 (las variables *Corrido, en fechas.ts).
POST {{host}}/reservas
{
  "canchaId": "{{cancha}}",
  "clienteId": "pedro",
  "inicio": "{{inicioCorrido}}",
  "fin": "{{finCorrido}}",
  "precio": 100
}
HTTP 409
[Asserts]
jsonpath "$.error" == "SUPERPOSICION_DE_RESERVA"

GET {{host}}/canchas/{{cancha}}/reservas
HTTP 200
[Asserts]
jsonpath "$" count == 1
jsonpath "$[0].id" == "{{reserva}}"
jsonpath "$[0].clienteId" == "juan"
