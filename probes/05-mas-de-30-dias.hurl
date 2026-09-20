# F-008: crear una reserva a más de 30 días → 400 ANTICIPACION_EXCESIVA, y la cancha sigue sin reservas.
# {{inicioLejano}} está a 45 días: lo calcula fechas.ts al correr (ADR 0005).
# La cancha es fija (nunca se le crea nada, así que el listado es 0 aunque la base persista entre corridas).
POST {{host}}/reservas
{
  "canchaId": "cancha-f008-lejana",
  "clienteId": "juan",
  "inicio": "{{inicioLejano}}",
  "fin": "{{finLejano}}",
  "precio": 100
}
HTTP 400
[Asserts]
jsonpath "$.error" == "ANTICIPACION_EXCESIVA"

# Rechazada antes de tocar nada: no quedó registrada.
GET {{host}}/canchas/cancha-f008-lejana/reservas
HTTP 200
[Asserts]
jsonpath "$" count == 0
