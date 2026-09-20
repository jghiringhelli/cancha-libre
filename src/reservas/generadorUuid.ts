// La implementación del generador: crypto.randomUUID() (viene con Node; sin dependencias).
// Es el ÚNICO lugar de src/ que fabrica ids de reserva. El gate (.githooks/gate-ids.sh) frena
// cualquier otro id armado con un contador de proceso — ver docs/decisiones/0004-ids-uuid.md.
import { randomUUID } from 'node:crypto';
import type { GeneradorDeIds } from './GeneradorDeIdsPort';

export function generadorUuid(): GeneradorDeIds {
  return { nuevoId: () => randomUUID() };
}
