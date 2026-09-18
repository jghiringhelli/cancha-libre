#!/bin/sh
# gate: componible — reservas solo puede conocer interfaces ajenas (regla 4 del archivo raíz).
# Corre en cada commit (ver COMO-INSTALAR-EL-GATE.md) o a mano: npm run gate
PROHIBIDOS='pagos/proveedorSimulado|notificaciones/porConsola'
VIOLACIONES=$(grep -rnE "from '.*(${PROHIBIDOS})'" src/reservas/ 2>/dev/null)

if [ -n "$VIOLACIONES" ]; then
  echo "✗ gate: componible — reservas importa una implementación ajena:"
  echo "$VIOLACIONES" | sed 's/^/    /'
  echo "  (solo puede conocer PagosPort / NotificacionesPort — el enchufe, no el aparato)"
  echo "✗ COMMIT RECHAZADO"
  exit 1
fi
echo "✓ gate: componible"
