/**
 * Empaqueta el código fuente (módulos en codigo-fuente/fuente) en dos archivos clásicos
 * que funcionan incluso abriendo index.html con doble clic:
 *   campus/assets/js/campus.js  y  campus/assets/js/panel.js
 *
 * Uso:  npm install   y luego   npm run construir
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
let esbuild;
esbuild = require('esbuild');

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, '../campus');
// Lista de archivos que vienen con el campus (el panel avisa cuáles nuevos hay que copiar).
const incluidos = [];
const recorrer = (dir) => fs.readdirSync(path.join(raiz, dir), { withFileTypes: true }).forEach((e) => {
  const rel = dir + '/' + e.name;
  if (e.isDirectory()) recorrer(rel); else incluidos.push(rel);
});
['assets/img', 'assets/media'].forEach(recorrer);
fs.writeFileSync(path.join(aqui, 'fuente/local/archivos-incluidos.js'),
  '/* Generado por codigo-fuente/construir.mjs: archivos que vienen con el campus. */\nexport const ARCHIVOS_INCLUIDOS = ' + JSON.stringify(incluidos.sort(), null, 1) + ';\n');

const comunes = { bundle: true, format: 'iife', target: ['es2020'], charset: 'utf8', legalComments: 'none', logLevel: 'info' };

await esbuild.build({ ...comunes, entryPoints: [path.join(aqui, 'fuente/campus/app.js')], outfile: path.join(raiz, 'assets/js/campus.js'), minify: !process.argv.includes('--legible') });
await esbuild.build({ ...comunes, entryPoints: [path.join(aqui, 'fuente/admin/app.js')], outfile: path.join(raiz, 'assets/js/panel.js'), minify: !process.argv.includes('--legible') });
