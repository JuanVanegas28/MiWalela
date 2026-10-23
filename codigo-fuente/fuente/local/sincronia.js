/**
 * Mantiene al día las pestañas abiertas en este navegador: si la profe cambia algo en el panel,
 * el campus abierto en otra pestaña lo muestra, y si un niño hace algo, el panel lo ve.
 */
const CLAVE = 'miwalela:cambio';
const DATOS = 'miwalela:campus:v1';

/** Avisa a las otras pestañas que cambió el contenido del campus. */
export function avisarCambio(tipo = 'contenido') {
  try { window.localStorage.setItem(CLAVE, `${tipo}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`); } catch { /* nada */ }
}

/** Llama a fn('contenido' | 'datos') cuando otra pestaña cambia algo. */
export function alCambiarEnOtraPestana(fn) {
  window.addEventListener('storage', (e) => {
    if (e.key === CLAVE) fn(String(e.newValue || '').split(':')[0] || 'contenido');
    else if (e.key === DATOS || e.key === null) fn('datos');
  });
}

/** ¿Hay algo a medio hacer en la pantalla (una ventana abierta, un campo editado, un video sonando)? */
export function pantallaOcupada(raiz = document) {
  if (document.querySelector('.velo')) return true;
  if ([...document.querySelectorAll('video')].some((v) => !v.paused && !v.ended)) return true;
  return [...raiz.querySelectorAll('input, textarea')].some((el) => {
    if (el.readOnly || el.type === 'file') return false;
    if (el.type === 'checkbox' || el.type === 'radio') return el.checked !== el.defaultChecked;
    return el.value !== el.defaultValue;
  });
}
