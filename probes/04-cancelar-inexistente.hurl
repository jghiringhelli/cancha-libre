# Criterio 4: cancelar una inexistente → 404.
DELETE {{host}}/reservas/no-existe
HTTP 404
[Asserts]
jsonpath "$.error" == "RESERVA_INEXISTENTE"
