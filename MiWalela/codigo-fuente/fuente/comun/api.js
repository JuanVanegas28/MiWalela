/**
 * Cliente de la «API» del campus en la versión sin servidor.
 * Tiene las mismas funciones que la versión con PHP (get, post, subir, url…),
 * pero en lugar de viajar por internet, las atiende el motor local (carpeta local/).
 */
import { ErrorApi } from '../local/util.js';
import { porId } from '../local/contenido.js';

export { ErrorApi };

function calcularRaiz() {
  const s = document.currentScript;
  if (s && s.src) return new URL('../../', s.src).href;
  return new URL(window.MIWALELA_RAIZ || './', location.href).href;
}
export const RAIZ = calcularRaiz();

let servidor = () => Promise.reject(new ErrorApi('El campus no terminó de cargar.', 500));
export function configurar(fn) { servidor = fn; }
export function fijarCsrf() { /* no se necesita sin servidor */ }

export const get = (ruta, params) => servidor('GET', ruta, params || {});
export const post = (ruta, datos) => servidor('POST', ruta, datos || {});

/** «Sube» un FormData: los campos van como datos y el archivo (foto) aparte. */
export async function subir(ruta, formData, alProgreso) {
  const datos = {};
  let archivo = null;
  formData.forEach((v, k) => { if (typeof Blob !== 'undefined' && v instanceof Blob) archivo = v; else datos[k] = v; });
  if (alProgreso) alProgreso(40);
  const r = await servidor('POST', ruta, datos, archivo);
  if (alProgreso) alProgreso(100);
  return r;
}

/** URL absoluta de un recurso (assets/…, data:, blob:, https:). */
export function url(ruta) {
  if (!ruta) return '';
  if (/^(https?:|data:|blob:|file:)/i.test(ruta)) return ruta;
  return new URL(String(ruta).replace(/^\/+/, ''), RAIZ).href;
}

/** En la versión sin servidor el PDF de la guía se abre directo desde su archivo. */
export function urlApi(ruta, params = {}) {
  if (ruta === 'guia/pdf') {
    const g = porId('guias', params.id);
    return g && g.pdf ? url(g.pdf) + (params.ver ? '#ver' : '') : '#';
  }
  return '#';
}
