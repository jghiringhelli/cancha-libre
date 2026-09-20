// `npm run probes`: corre los .hurl sueltos contra un servidor andando (HOST, default localhost:3000).
// Existe porque las fechas se calculan al correr (F-008, ver fechas.ts); Hurl solo recibe variables.
// No reemplaza a `npm run integracion`, que además contrasta con la base.
import { spawnSync } from 'node:child_process';
import { variablesHurl } from './fechas.ts';

const HOST = process.env.HOST ?? 'http://localhost:3000';
const resultado = spawnSync('hurl', ['--test', ...variablesHurl(HOST), 'probes'], { stdio: 'inherit' });
if (resultado.error) { console.error(`no pude ejecutar hurl: ${resultado.error.message}`); process.exit(1); }
process.exit(resultado.status ?? 1);
