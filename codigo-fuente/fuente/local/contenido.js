/**
 * Contenido del campus (lo que crea la profe): viene de datos/contenido.js.
 * Cuando la profe toca «Ver en el campus» en su panel, este navegador usa su borrador sin publicar.
 */
import { porOrden } from './util.js';
import { leerBorrador } from './borrador.js';

export const CLAVE_PREVIA = 'miwalela:previa';
export const TABLAS_CONTENIDO = ['niveles', 'insignias', 'cursos', 'sesiones', 'guias', 'guia_recuerda', 'guia_pasos', 'retos', 'clases_vivo', 'retos_semana'];

let enUso = null;
let vistaPrevia = false;

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

/** El panel trabaja sobre su borrador; el campus sobre lo publicado (o el borrador en vista previa). */
export function usarContenido(c, { previa = false } = {}) {
  enUso = normalizar(c);
  vistaPrevia = previa;
}

export async function prepararVistaPrevia() {
  let pedida = false;
  try { pedida = window.localStorage.getItem(CLAVE_PREVIA) === '1'; } catch { /* nada */ }
  if (!pedida) return false;
  const b = await leerBorrador();
  if (!b || !b.contenido) {
    try { window.localStorage.removeItem(CLAVE_PREVIA); } catch { /* nada */ }
    return false;
  }
  usarContenido(b.contenido, { previa: true });
  return true;
}

export const esVistaPrevia = () => vistaPrevia;

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
