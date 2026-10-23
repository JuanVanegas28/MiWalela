/**
 * Dónde se guarda todo en este dispositivo:
 * - Cuentas, progreso, estrellas, insignias, preguntas…  → localStorage (texto JSON)
 * - Fotos de las creaciones                               → IndexedDB (con respaldo en localStorage)
 * - La sesión abierta                                     → localStorage si marcaron «Recordarme», si no sessionStorage
 */
import { ErrorApi } from './util.js';

const CLAVE = 'miwalela:campus:v1';
const CLAVE_SESION = 'miwalela:sesion';
const CLAVE_SESION_PROFE = 'miwalela:sesion-profe';
export const TABLAS = [
  'profes', 'acudientes', 'estudiantes', 'progreso_retos', 'progreso_pasos', 'descargas_guias', 'reflexiones', 'preguntas',
  'reservas_clase', 'coleccion', 'insignias_estudiante', 'movimientos_estrellas', 'notificaciones',
];

function vacio() {
  const e = { version: 1, seq: {} };
  TABLAS.forEach((t) => (e[t] = []));
  return e;
}

function leerLocal(clave) {
  try { return window.localStorage.getItem(clave); } catch { return null; }
}

let estado = vacio();

/** Vuelve a leer lo guardado (por si otra pestaña cambió algo). */
export function recargar() {
  const texto = leerLocal(CLAVE);
  let e = null;
  try { e = texto ? JSON.parse(texto) : null; } catch { e = null; }
  estado = e && typeof e === 'object' ? e : vacio();
  estado.seq = estado.seq || {};
  TABLAS.forEach((t) => { if (!Array.isArray(estado[t])) estado[t] = []; });
  return estado;
}

export const bd = () => estado;

export function guardar() {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(estado));
  } catch (e) {
    throw new ErrorApi('Este navegador no tiene más espacio para guardar. Borra algunas fotos de tu colección e intenta de nuevo.', 507, {});
  }
}

export const instantanea = () => JSON.stringify(estado);
export function restaurar(texto) { estado = JSON.parse(texto); }

export function nuevoId(tabla) {
  estado.seq[tabla] = Math.max(estado.seq[tabla] || 0, ...estado[tabla].map((f) => f.id || 0)) + 1;
  return estado.seq[tabla];
}

export function insertar(tabla, fila) {
  const f = { id: nuevoId(tabla), ...fila };
  estado[tabla].push(f);
  return f;
}

export function quitar(tabla, filtro) {
  const antes = estado[tabla].length;
  estado[tabla] = estado[tabla].filter((f) => !filtro(f));
  return antes - estado[tabla].length;
}

/* ---------------- Sesión ---------------- */
export function sesion() {
  let texto = null;
  try { texto = window.sessionStorage.getItem(CLAVE_SESION); } catch { /* nada */ }
  if (!texto) texto = leerLocal(CLAVE_SESION);
  try { return (texto && JSON.parse(texto)) || {}; } catch { return {}; }
}

export function fijarSesion(datos, recordar) {
  const texto = JSON.stringify({ ...datos, recordar: !!recordar });
  try { window.sessionStorage.setItem(CLAVE_SESION, texto); } catch { /* nada */ }
  try {
    if (recordar) window.localStorage.setItem(CLAVE_SESION, texto);
    else window.localStorage.removeItem(CLAVE_SESION);
  } catch { /* nada */ }
}

export function borrarSesion() {
  try { window.sessionStorage.removeItem(CLAVE_SESION); } catch { /* nada */ }
  try { window.localStorage.removeItem(CLAVE_SESION); } catch { /* nada */ }
}

/* ---------------- Sesión de la profe (independiente de la del niño) ---------------- */
export function sesionProfe() {
  let texto = null;
  try { texto = window.sessionStorage.getItem(CLAVE_SESION_PROFE); } catch { /* nada */ }
  if (!texto) texto = leerLocal(CLAVE_SESION_PROFE);
  try { return (texto && JSON.parse(texto)) || {}; } catch { return {}; }
}

export function fijarSesionProfe(id, recordar) {
  const texto = JSON.stringify({ profe_id: id, recordar: !!recordar });
  try { window.sessionStorage.setItem(CLAVE_SESION_PROFE, texto); } catch { /* nada */ }
  try {
    if (recordar) window.localStorage.setItem(CLAVE_SESION_PROFE, texto);
    else window.localStorage.removeItem(CLAVE_SESION_PROFE);
  } catch { /* nada */ }
}

export function borrarSesionProfe() {
  try { window.sessionStorage.removeItem(CLAVE_SESION_PROFE); } catch { /* nada */ }
  try { window.localStorage.removeItem(CLAVE_SESION_PROFE); } catch { /* nada */ }
}

/* ---------------- Fotos ---------------- */
let bdFotos = null;
function abrirFotos() {
  if (bdFotos) return bdFotos;
  bdFotos = new Promise((resolver) => {
    try {
      const pedido = window.indexedDB.open('miwalela-fotos', 1);
      pedido.onupgradeneeded = () => pedido.result.createObjectStore('fotos');
      pedido.onsuccess = () => resolver(pedido.result);
      pedido.onerror = () => resolver(null);
      pedido.onblocked = () => resolver(null);
    } catch { resolver(null); }
  });
  return bdFotos;
}

function operacion(modo, fn) {
  return abrirFotos().then((db) => new Promise((resolver, rechazar) => {
    if (!db) return rechazar(new Error('sin IndexedDB'));
    const tx = db.transaction('fotos', modo);
    const pedido = fn(tx.objectStore('fotos'));
    tx.oncomplete = () => resolver(pedido ? pedido.result : undefined);
    tx.onerror = () => rechazar(tx.error);
    tx.onabort = () => rechazar(tx.error);
  }));
}

function aDataUrl(blob) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(lector.result);
    lector.onerror = () => rechazar(lector.error);
    lector.readAsDataURL(blob);
  });
}

async function aBlob(dataUrl) {
  const [cabeza, datos] = dataUrl.split(',');
  const tipo = (cabeza.match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
  const bin = atob(datos);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: tipo });
}

const urls = new Map();

export async function guardarFoto(id, blob) {
  try {
    await operacion('readwrite', (s) => s.put(blob, id));
    return `idb:${id}`;
  } catch {
    try {
      window.localStorage.setItem('miwalela:foto:' + id, await aDataUrl(blob));
      return `ls:${id}`;
    } catch {
      throw new ErrorApi('Este navegador no tiene espacio para guardar la foto.', 507, {});
    }
  }
}

export async function leerFoto(archivo) {
  const [tipo, id] = String(archivo || '').split(':');
  if (tipo === 'idb') {
    try { return (await operacion('readonly', (s) => s.get(id))) || null; } catch { return null; }
  }
  if (tipo === 'ls') {
    const d = leerLocal('miwalela:foto:' + id);
    return d ? aBlob(d) : null;
  }
  return null;
}

export async function urlFoto(archivo) {
  if (urls.has(archivo)) return urls.get(archivo);
  const blob = await leerFoto(archivo);
  const u = blob ? URL.createObjectURL(blob) : 'assets/img/personajes/walela-piensa.webp';
  urls.set(archivo, u);
  return u;
}

export async function borrarFoto(archivo) {
  const [tipo, id] = String(archivo || '').split(':');
  if (urls.has(archivo)) { URL.revokeObjectURL(urls.get(archivo)); urls.delete(archivo); }
  if (tipo === 'idb') { try { await operacion('readwrite', (s) => s.delete(id)); } catch { /* nada */ } }
  if (tipo === 'ls') { try { window.localStorage.removeItem('miwalela:foto:' + id); } catch { /* nada */ } }
}

export { aDataUrl, aBlob };
