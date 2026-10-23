/**
 * «Servidor» dentro del navegador: recibe las mismas peticiones que antes iban a la API en PHP
 * y las atiende con los datos guardados en este dispositivo.
 */
import { recargar, guardar, instantanea, restaurar } from './almacen.js';
import { limpiarCache } from './progreso.js';
import { contenido } from './contenido.js';
import { ErrorApi, fallar } from './util.js';

export function crearServidor(rutas, { necesitaContenido = true } = {}) {
  let cola = Promise.resolve();

  async function ejecutar(metodo, ruta, datos, archivo) {
    const fn = rutas[`${metodo} ${ruta}`];
    if (!fn) fallar(404, 'Esta opción no está disponible en la versión sin servidor.');
    if (necesitaContenido && !contenido()) {
      fallar(503, 'No encontramos el contenido del campus. Revisa que exista el archivo datos/contenido.js.', { contenido: false });
    }
    recargar();
    limpiarCache();
    const antes = instantanea();
    try {
      const r = await fn(datos || {}, archivo || null);
      if (instantanea() !== antes) guardar();
      return { ok: true, ...(r || {}) };
    } catch (e) {
      restaurar(antes);
      if (e instanceof ErrorApi) throw e;
      console.error('[MiWalela]', e);
      throw new ErrorApi('Ups, algo salió mal. Intenta de nuevo.', 500, { ok: false });
    }
  }

  /** Las peticiones se atienden una a la vez, como en un servidor con transacciones. */
  return function atender(metodo, ruta, datos, archivo) {
    const tarea = cola.then(() => ejecutar(metodo, ruta, datos, archivo));
    cola = tarea.catch(() => {});
    return tarea;
  };
}
