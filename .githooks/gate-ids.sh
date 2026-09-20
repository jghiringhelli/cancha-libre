#!/bin/sh
# gate: ids persistentes — ningún id que se persista depende del estado de un proceso (F-007 / ADR 0004).
# Nació de un defecto: tras reiniciar el servidor, `reserva-${++secuencia}` volvió a dar reserva-1 y pisó
# la fila de otro cliente. Frena cualquier id armado con un contador de proceso o con Date.now() en src/,
# fuera del único generador (src/reservas/generadorUuid.ts). Corre en cada commit o a mano: npm run gate
GENERADOR='src/reservas/generadorUuid.ts'
CONTADOR='\+\+[[:space:]]*[A-Za-z_][A-Za-z0-9_]*|[A-Za-z_][A-Za-z0-9_]*[[:space:]]*\+\+|Date\.now\(\)'
ES_ID='(\bid\b|Id\b)'

# Una línea que arma un id Y usa un contador/Date.now(). Se ignoran los comentarios de línea.
VIOLACIONES=$(grep -rnE --include='*.ts' "${ES_ID}" src/ 2>/dev/null \
  | grep -v "^${GENERADOR}:" \
  | grep -vE '^[^:]+:[0-9]+:[[:space:]]*//' \
  | grep -E "${CONTADOR}")

if [ -n "$VIOLACIONES" ]; then
  echo "✗ gate: ids persistentes — hay un id que sale de un contador de proceso o de Date.now():"
  echo "$VIOLACIONES" | sed 's/^/    /'
  echo "  (un contador arranca en cero en cada proceso: tras reiniciar, pisa filas ajenas — ADR 0004)"
  echo "  (los ids se piden al generador inyectado: GeneradorDeIds.nuevoId(), implementado en ${GENERADOR})"
  echo "✗ COMMIT RECHAZADO"
  exit 1
fi
echo "✓ gate: ids persistentes"
