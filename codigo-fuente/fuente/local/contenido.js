/**
 * Contenido del campus (lo que crea la profe): viene de datos/contenido.js
 * y, si la profe lo editó en su panel en este navegador, de su versión guardada.
 */
import { porOrden } from './util.js';
import { leerBorrador } from './borrador.js';
import { prepararMedios } from './medios.js';
export const TABLAS_CONTENIDO = ['niveles', 'insignias', 'cursos', 'sesiones', 'guias', 'guia_recuerda', 'guia_pasos', 'retos', 'clases_vivo', 'retos_semana'];

let enUso = null;

export function normalizar(c) {
  if (!c) return null;
  TABLAS_CONTENIDO.forEach((t) => { if (!Array.isArray(c[t])) c[t] = []; });
  c.ajustes = c.ajustes || {};
  c.secuencias = c.secuencias || {};
  return c;
}

export function publicado() {
  return window.MIWALELA_CONTENIDO || null;
}

export function usarContenido(c) {
  enUso = normalizar(c);
}

/** El campus usa lo que la profe guardó en su panel (si es más reciente que lo publicado). */
export async function prepararContenidoCampus() {
  const b = await leerBorrador().catch(() => null);
  const pub = publicado();
  if (b && b.contenido) {
    const fechaPub = (pub && pub.publicado_en) || '';
    const conocida = [b.base || '', b.exportado_en || ''].sort().pop();
    if (b.cambios || !(fechaPub > conocida)) usarContenido(b.contenido);
  }
  await prepararMedios(contenido());
}

export function contenido() {
  if (!enUso) enUso = normalizar(publicado());
  return enUso;
}

export const tabla = (nombre) => (contenido() || {})[nombre] || [];
export const porId = (nombre, id) => tabla(nombre).find((f) => f.id === Number(id)) || null;
export const ordenada = (nombre, filtro = () => true) => tabla(nombre).filter(filtro).sort(porOrden);

export function ajuste(clave, defecto = null) {
  const a = (contenido() || {}).ajustes || {};
  return Object.prototype.hasOwnProperty.call(a, clave) && a[clave] !== null ? String(a[clave]) : defecto;
}
