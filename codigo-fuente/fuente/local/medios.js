/**
 * Videos y PDF que la profe sube desde el panel: se guardan en este navegador (IndexedDB)
 * y el contenido los nombra como «local:<id>/<nombre del archivo>».
 */
import { operacion } from './borrador.js';
import { aleatorio } from './util.js';

const urls = new Map();

export const esLocal = (ref) => typeof ref === 'string' && ref.startsWith('local:');

/** Nombre del archivo original (para mostrarlo en el panel). */
export function nombreLocal(ref) {
  return esLocal(ref) ? decodeURIComponent(ref.slice(6).split('/').slice(1).join('/')) || 'archivo' : '';
}

export async function guardarArchivo(blob, nombre) {
  const id = aleatorio(8);
  await operacion('readwrite', (s) => s.put(blob, id), 'archivos');
  const ref = `local:${id}/${encodeURIComponent(nombre || 'archivo')}`;
  urls.set(ref, URL.createObjectURL(blob));
  return ref;
}

async function cargar(ref) {
  if (urls.has(ref)) return;
  const id = ref.slice(6).split('/')[0];
  try {
    const blob = await operacion('readonly', (s) => s.get(id), 'archivos');
    if (blob) urls.set(ref, URL.createObjectURL(blob));
  } catch { /* el archivo no está en este navegador */ }
}

/** Prepara las direcciones de todos los archivos locales que usa el contenido. */
export async function prepararMedios(contenido) {
  const refs = new Set();
  Object.values(contenido || {}).forEach((tabla) => {
    if (!Array.isArray(tabla)) return;
    tabla.forEach((f) => Object.values(f || {}).forEach((v) => { if (esLocal(v)) refs.add(v); }));
  });
  await Promise.all([...refs].map(cargar));
}

export const urlLocal = (ref) => urls.get(ref) || '';
