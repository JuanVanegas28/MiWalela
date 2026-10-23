/**
 * Borrador de la profe: el contenido que está editando en su panel antes de publicarlo.
 * Se guarda en IndexedDB (cabe mucho más que en localStorage, por las imágenes).
 */
const BD = 'miwalela-panel';
const CLAVE = 'borrador';
const RESPALDO = 'miwalela:borrador';

let abierta = null;
export function abrir() {
  if (abierta) return abierta;
  abierta = new Promise((resolver) => {
    try {
      const pedido = window.indexedDB.open(BD, 2);
      pedido.onupgradeneeded = () => {
        const db = pedido.result;
        if (!db.objectStoreNames.contains('datos')) db.createObjectStore('datos');
        if (!db.objectStoreNames.contains('archivos')) db.createObjectStore('archivos');
      };
      pedido.onsuccess = () => resolver(pedido.result);
      pedido.onerror = () => resolver(null);
      pedido.onblocked = () => resolver(null);
    } catch { resolver(null); }
  });
  return abierta;
}

export function operacion(modo, fn, almacen = 'datos') {
  return abrir().then((db) => new Promise((resolver, rechazar) => {
    if (!db) return rechazar(new Error('sin IndexedDB'));
    const tx = db.transaction(almacen, modo);
    const pedido = fn(tx.objectStore(almacen));
    tx.oncomplete = () => resolver(pedido ? pedido.result : undefined);
    tx.onerror = () => rechazar(tx.error);
    tx.onabort = () => rechazar(tx.error);
  }));
}

/** { contenido, base, cambios, exportado_en, actualizado_en } o null */
export async function leerBorrador() {
  try {
    const b = await operacion('readonly', (s) => s.get(CLAVE));
    if (b) return b;
  } catch { /* se intenta el respaldo */ }
  try {
    const t = window.localStorage.getItem(RESPALDO);
    return t ? JSON.parse(t) : null;
  } catch { return null; }
}

export async function guardarBorrador(b) {
  try {
    await operacion('readwrite', (s) => s.put(b, CLAVE));
    return;
  } catch { /* se intenta el respaldo */ }
  try {
    window.localStorage.setItem(RESPALDO, JSON.stringify(b));
  } catch {
    throw new Error('El navegador no tiene espacio para guardar el borrador. Usa imágenes más livianas.');
  }
}

export async function borrarBorrador() {
  try { await operacion('readwrite', (s) => s.delete(CLAVE)); } catch { /* nada */ }
  try { window.localStorage.removeItem(RESPALDO); } catch { /* nada */ }
}
