/**
 * Todo lo que en la versión con servidor llegaba al panel de la profe, aquí le llega por WhatsApp:
 * preguntas, fotos de las creaciones, reservas de clases y copias del progreso.
 */
import { aviso, ventana, h, icono } from '../comun/ui.js';

/** Datos que la app comparte con este módulo (los actualiza app.js). */
export const estado = { sitio: {}, estudiante: null };

export const hayWhatsapp = () => !!(estado.sitio && estado.sitio.whatsapp);

export function enlaceWhatsapp(texto) {
  const n = String((estado.sitio && estado.sitio.whatsapp) || '').replace(/\D+/g, '');
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(texto)}` : `https://wa.me/?text=${encodeURIComponent(texto)}`;
}

/** Abre WhatsApp con el mensaje (debe llamarse directo desde un toque o clic). */
export function abrirWhatsapp(texto) {
  const url = enlaceWhatsapp(texto);
  const w = window.open(url, '_blank');
  if (w) { try { w.opener = null; } catch { /* nada */ } return; }
  // El navegador bloqueó la ventana: se ofrece un botón para abrirla.
  const { caja, cerrar } = ventana(`<h2>Abre WhatsApp</h2><p style="font-size:17px;font-weight:700;color:var(--tinta-2);margin:8px 0 18px">Toca el botón para enviarle el mensaje a tu profe.</p>
    <div class="acciones" style="justify-content:flex-end"><a class="btn btn-turq" href="${h(url)}" target="_blank" rel="noopener">${icono('chat', 20)} Abrir WhatsApp</a></div>`);
  caja.querySelector('a').addEventListener('click', () => setTimeout(cerrar, 300));
}

/** Pide un toque nuevo cuando el navegador exige uno para compartir. */
function confirmarCompartir(texto) {
  return new Promise((resolver) => {
    let ok = false;
    const { caja, cerrar } = ventana(`<h2>¡Ya está lista!</h2><p style="font-size:17px;font-weight:700;color:var(--tinta-2);margin:8px 0 18px">${h(texto)}</p>
      <div class="acciones" style="justify-content:flex-end"><button type="button" class="btn btn-turq" data-si>${icono('chat', 20)} Compartir</button></div>`, { alCerrar: () => resolver(ok) });
    caja.querySelector('[data-si]').onclick = () => { ok = true; cerrar(); };
  });
}

export function presentacion() {
  const e = estado.estudiante;
  return e ? `Soy ${e.nombre} (@${e.usuario}) de MiniDiseñadores.` : 'Te escribo desde el campus MiniDiseñadores.';
}

const esCelular = () => {
  try { return window.matchMedia('(pointer: coarse)').matches && 'share' in navigator; } catch { return false; }
};

export function descargar(blobOUrl, nombre) {
  const a = document.createElement('a');
  const url = typeof blobOUrl === 'string' ? blobOUrl : URL.createObjectURL(blobOUrl);
  a.href = url;
  a.download = nombre;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (typeof blobOUrl !== 'string') setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function nombreArchivo(texto, extension) {
  const base = String(texto || 'archivo').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'archivo';
  return `${base}.${extension}`;
}

/**
 * Comparte un archivo con la profe.
 * En celular o tablet abre el menú «Compartir» (allí eligen WhatsApp y el chat de la profe).
 * En computador descarga el archivo y abre WhatsApp con el mensaje para adjuntarlo.
 */
export async function compartirArchivo({ blob, nombre, texto }) {
  const archivo = new File([blob], nombre, { type: blob.type || 'application/octet-stream' });
  if (esCelular() && navigator.canShare && navigator.canShare({ files: [archivo] })) {
    for (let intento = 0; intento < 2; intento++) {
      try {
        await navigator.share({ files: [archivo], text: texto });
        return 'compartido';
      } catch (e) {
        if (e && e.name === 'AbortError') return 'cancelado';
        if (!(e && e.name === 'NotAllowedError') || intento > 0) break;
        // Pasó mucho tiempo desde el toque: se pide otro.
        if (!(await confirmarCompartir('Toca «Compartir» y elige WhatsApp y el chat de tu profe.'))) return 'cancelado';
      }
    }
  }
  descargar(archivo, nombre);
  abrirWhatsapp(`${texto}\n\n(Te adjunto el archivo «${nombre}» que acabo de descargar.)`);
  aviso('Descargamos el archivo: adjúntalo en el chat de WhatsApp que se abrió.', 'bien');
  return 'descargado';
}

/** Comparte la foto de una creación (blob o URL de la foto). */
export async function compartirFoto({ blob, url, titulo }) {
  let b = blob;
  if (!b && url) b = await (await fetch(url)).blob();
  const ext = /png/.test(b.type) ? 'png' : /webp/.test(b.type) ? 'webp' : 'jpg';
  return compartirArchivo({ blob: b, nombre: nombreArchivo(titulo || 'mi-creacion', ext), texto: `¡Hola, profe! ${presentacion()} Te comparto mi creación «${titulo}».` });
}
