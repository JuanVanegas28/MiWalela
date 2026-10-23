/**
 * Empaqueta el código fuente (módulos en codigo-fuente/fuente) en dos archivos clásicos
 * que funcionan incluso abriendo index.html con doble clic:
 *   campus/assets/js/campus.js  y  campus/assets/js/panel.js
 *
 * Uso (desde la raíz del repositorio):  npm install   y luego   npm run build
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let esbuild;
esbuild = require('esbuild');

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, '../campus');
const comunes = { bundle: true, format: 'iife', target: ['es2020'], charset: 'utf8', legalComments: 'none', logLevel: 'info' };

await esbuild.build({ ...comunes, entryPoints: [path.join(aqui, 'fuente/campus/app.js')], outfile: path.join(raiz, 'assets/js/campus.js'), minify: !process.argv.includes('--legible') });
await esbuild.build({ ...comunes, entryPoints: [path.join(aqui, 'fuente/admin/app.js')], outfile: path.join(raiz, 'assets/js/panel.js'), minify: !process.argv.includes('--legible') });
