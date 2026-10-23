/**
 * Utilidades de interfaz compartidas: escape de HTML, íconos, avisos, ventanas y celebraciones.
 */
import { url } from './api.js';

/** Escapa texto para insertarlo en HTML. */
export function h(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const RUTAS = {
  casa: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  tijeras: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.1 15.9"/><path d="M14.5 14.5L20 20"/><path d="M8.1 8.1L12 12"/>',
  libro: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
  trofeo: '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3"/><path d="M7 5H4v2a3 3 0 0 0 3 3"/>',
  salir: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z"/>',
  buscar: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  campana: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  candado: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  ojo: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  ojoNo: '<path d="M3 3l18 18"/><path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1"/><path d="M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.3-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  flecha: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  derecha: '<path d="M9 6l6 6-6 6"/>',
  izquierda: '<path d="M15 6l-6 6 6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  chispa: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  camara: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10l6-3v10l-6-3"/>',
  foto: '<path d="M3 8h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13" r="4"/>',
  descargar: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>',
  imprimir: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
  escudo: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  pregunta: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17.5v.01"/>',
  volumen: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/>',
  silencio: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6"/><path d="M22 9l-5 6"/>',
  subtitulos: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10.5 10.2a2 2 0 1 0 0 3.6"/><path d="M17 10.2a2 2 0 1 0 0 3.6"/>',
  pantalla: '<path d="M4 9V4h5"/><path d="M20 9V4h-5"/><path d="M4 15v5h5"/><path d="M20 15v5h-5"/>',
  cerrar: '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>',
  lapiz: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
  boton: '<circle cx="12" cy="12" r="9"/><circle cx="9.5" cy="9.5" r="1"/><circle cx="14.5" cy="9.5" r="1"/><circle cx="9.5" cy="14.5" r="1"/><circle cx="14.5" cy="14.5" r="1"/>',
  hilo: '<rect x="6" y="3" width="12" height="3" rx="1"/><rect x="6" y="18" width="12" height="3" rx="1"/><path d="M8 6v12M16 6v12"/><path d="M8 9l8 2M8 13l8 2"/>',
  regla: '<rect x="2" y="7" width="20" height="10" rx="2"/><path d="M6 7v4M10 7v3M14 7v4M18 7v3"/>',
  medalla: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14l-1.5 7 5-2.5 5 2.5-1.5-7"/>',
  cohete: '<path d="M5 15c-1.5 1.3-2 5-2 5s3.7-.5 5-2"/><path d="M9 12a13 13 0 0 1 9-9 13 13 0 0 1-3 9l-4 3-5-5z"/><circle cx="15" cy="9" r="1.5"/>',
  mas: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  basura: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5v.01"/>',
  editar: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
  enviar: '<path d="M4 12l16-8-6 16-3-7z"/>',
};
const RELLENOS = {
  estrella: '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/>',
  corazon: '<path d="M12 21s-7.5-4.6-9.5-9.3C1.2 8.3 3.3 5 6.8 5c2 0 3.6 1.1 5.2 3 1.6-1.9 3.2-3 5.2-3 3.5 0 5.6 3.3 4.3 6.7C19.5 16.4 12 21 12 21z"/>',
  play: '<path d="M7 4.5v15l12.5-7.5z"/>',
  pausa: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
  flor: '<circle cx="12" cy="6.5" r="3.4"/><circle cx="17.3" cy="10.4" r="3.4"/><circle cx="15.3" cy="16.6" r="3.4"/><circle cx="8.7" cy="16.6" r="3.4"/><circle cx="6.7" cy="10.4" r="3.4"/><circle cx="12" cy="12" r="2.4" fill="#fff"/>',
};

/** Ícono SVG en línea. */
export function icono(nombre, tam = 22, extra = '') {
  if (RELLENOS[nombre]) return `<svg class="r" width="${tam}" height="${tam}" viewBox="0 0 24 24" aria-hidden="true" ${extra}>${RELLENOS[nombre]}</svg>`;
  return `<svg class="i" width="${tam}" height="${tam}" viewBox="0 0 24 24" aria-hidden="true" ${extra}>${RUTAS[nombre] || RUTAS.chispa}</svg>`;
}

export const COLORES = {
  fucsia: { fuerte: '#E8698E', suave: '#FDE6EC', nombre: 'Fucsia' },
  coral: { fuerte: '#F88C7A', suave: '#FEE3DC', nombre: 'Coral' },
  lila: { fuerte: '#BA9AC4', suave: '#EDE5F4', nombre: 'Lila' },
  turquesa: { fuerte: '#59C4C6', suave: '#DDF0EC', nombre: 'Turquesa' },
  menta: { fuerte: '#A9CDBE', suave: '#E6F2EC', nombre: 'Menta' },
  amarillo: { fuerte: '#FDCC82', suave: '#FFF1D6', nombre: 'Amarillo' },
  rosa: { fuerte: '#FBAFBF', suave: '#FDE6EC', nombre: 'Rosa' },
};
export const color = (nombre) => COLORES[nombre] || COLORES.fucsia;

/** Disco de insignia: imagen o ícono de color. */
export function discoInsignia(ins) {
  if (ins.imagen) return `<img src="${h(url(ins.imagen))}" alt="">`;
  const c = color(ins.color);
  return `<span class="insignia-icono" style="background:${c.suave};color:${c.fuerte}">${icono(ins.icono === 'estrella' ? 'estrella' : ins.icono === 'corazon' ? 'corazon' : (ins.icono || 'medalla'), 48)}</span>`;
}

/* ---------------- Avisos ---------------- */
function capaAvisos() {
  let capa = document.getElementById('capa-avisos');
  if (!capa) {
    capa = document.createElement('div');
    capa.id = 'capa-avisos';
    capa.setAttribute('role', 'status');
    capa.setAttribute('aria-live', 'polite');
    document.body.appendChild(capa);
  }
  return capa;
}

export function aviso(texto, tipo = '') {
  const el = document.createElement('div');
  el.className = 'aviso ' + tipo;
  el.innerHTML = (tipo === 'estrellas' ? icono('estrella', 24, 'style="color:#F2A93B"') : tipo === 'bien' ? icono('check', 22) : '') + `<span>${h(texto)}</span>`;
  capaAvisos().appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .3s, transform .3s'; el.style.opacity = '0'; el.style.transform = 'translateY(10px)'; }, 3200);
  setTimeout(() => el.remove(), 3600);
}

export function avisoError(e) {
  aviso(e && e.message ? e.message : 'Algo salió mal. Intenta de nuevo.', 'mal');
}

/* ---------------- Ventanas ---------------- */
export function ventana(html, { clase = '', alCerrar } = {}) {
  const anterior = document.activeElement;
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="ventana ${clase}" role="dialog" aria-modal="true">
    <button type="button" class="cerrar" aria-label="Cerrar">${icono('cerrar', 22)}</button>${html}</div>`;
  document.body.appendChild(velo);
  document.body.style.overflow = 'hidden';
  const caja = velo.querySelector('.ventana');
  const cerrar = () => {
    velo.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', teclas);
    if (anterior && anterior.focus) anterior.focus();
    if (alCerrar) alCerrar();
  };
  const teclas = (e) => {
    if (e.key === 'Escape') cerrar();
    if (e.key === 'Tab') {
      const f = [...caja.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  };
  document.addEventListener('keydown', teclas);
  velo.addEventListener('mousedown', (e) => { if (e.target === velo) cerrar(); });
  caja.querySelector('.cerrar').addEventListener('click', cerrar);
  setTimeout(() => {
    if (caja.contains(document.activeElement)) return; // ya están escribiendo en la ventana
    const p = caja.querySelector('[autofocus], input:not([type=hidden]):not([type=file]), textarea, .btn');
    (p || caja.querySelector('.cerrar')).focus();
  }, 30);
  return { caja, cerrar };
}

export function confirmar(titulo, texto, { si = 'Sí, continuar', no = 'Cancelar', peligro = false } = {}) {
  return new Promise((resolver) => {
    let respuesta = false;
    const { caja, cerrar } = ventana(`<h2>${h(titulo)}</h2><p style="font-size:17px;color:var(--tinta-2);margin:6px 0 22px">${h(texto)}</p>
      <div class="acciones" style="justify-content:flex-end"><button type="button" class="btn btn-borde" data-no>${h(no)}</button>
      <button type="button" class="btn ${peligro ? '' : 'btn-lila'}" data-si>${h(si)}</button></div>`, { alCerrar: () => resolver(respuesta) });
    caja.querySelector('[data-no]').onclick = () => cerrar();
    caja.querySelector('[data-si]').onclick = () => { respuesta = true; cerrar(); };
  });
}

function confeti(caja) {
  const c = document.createElement('div');
  c.className = 'confeti';
  const tonos = ['#E8698E', '#FDCC82', '#59C4C6', '#BA9AC4', '#F88C7A', '#FBAFBF'];
  for (let i = 0; i < 46; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + '%';
    p.style.background = tonos[i % tonos.length];
    p.style.animationDelay = Math.random() * 0.6 + 's';
    p.style.animationDuration = 1.8 + Math.random() * 1.4 + 's';
    c.appendChild(p);
  }
  caja.prepend(c);
}

/**
 * Muestra el premio de una acción: estrellas (aviso) y, si hay, insignias o nivel nuevo (ventana con confeti).
 * Devuelve una promesa que se resuelve cuando el niño cierra la celebración.
 */
export function celebrar(premio, alActualizar) {
  return new Promise((resolver) => {
    if (!premio) return resolver();
    if (alActualizar) alActualizar(premio);
    if (premio.estrellas > 0) aviso(`¡+${premio.estrellas} estrellas!`, 'estrellas');
    const ins = premio.insignias || [];
    if (!ins.length && !premio.subio_nivel) return resolver();
    const primera = ins[0];
    let html;
    if (primera) {
      html = `<div class="celebra"><img class="walela" src="${h(url('assets/img/personajes/walela-sorpresa.webp'))}" alt="">
        <h2>¡Ganaste una insignia!</h2><div class="medalla">${discoInsignia(primera)}</div>
        <p style="font-size:22px;font-weight:900">${h(primera.nombre)}</p>
        <p style="font-size:16px;color:var(--tinta-3);font-weight:700">${h(primera.descripcion || '')}</p>
        ${ins.length > 1 ? `<p style="font-weight:800;color:var(--lila-f)">¡Y ${ins.length - 1} insignia${ins.length > 2 ? 's' : ''} más: ${h(ins.slice(1).map((x) => x.nombre).join(', '))}!</p>` : ''}
        ${premio.subio_nivel ? `<p class="chip" style="background:var(--amar-s);color:var(--amar-f)">${icono('estrella', 18)} Nuevo nivel: ${h(premio.nivel.nombre)}</p>` : ''}
        <button type="button" class="btn btn-g" data-ok>¡Genial!</button></div>`;
    } else {
      html = `<div class="celebra"><img class="walela" src="${h(url('assets/img/personajes/walela-guino.webp'))}" alt="">
        <h2>¡Subiste de nivel!</h2><p style="font-size:24px;font-weight:900">Nivel ${premio.nivel.numero} · ${h(premio.nivel.nombre)}</p>
        <button type="button" class="btn btn-g" data-ok>¡Sí!</button></div>`;
    }
    const { caja, cerrar } = ventana(html, { alCerrar: resolver });
    confeti(caja);
    caja.querySelector('[data-ok]').onclick = cerrar;
  });
}

/** Deshabilita un botón mientras corre una tarea. */
export async function conCarga(boton, tarea) {
  if (!boton) return tarea();
  if (boton.classList.contains('cargando')) return undefined;
  boton.classList.add('cargando');
  boton.setAttribute('aria-busy', 'true');
  try { return await tarea(); } finally { boton.classList.remove('cargando'); boton.removeAttribute('aria-busy'); }
}

export function debounce(fn, ms = 250) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export function cargando(texto = 'Cargando…') {
  return `<div class="cargando-vista"><div class="hilo-carga" aria-hidden="true"></div><span>${h(texto)}</span></div>`;
}

export function porcentaje(n) { return Math.max(0, Math.min(100, Number(n) || 0)); }

export function cinta(pct, texto) {
  return `<div class="cinta-meta"><div class="cinta" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${porcentaje(pct)}"><span style="width:${porcentaje(pct)}%"></span></div>${texto ? `<span class="cinta-texto">${h(texto)}</span>` : ''}</div>`;
}

/** Título con una parte resaltada (dos colores, como en el manual). */
export function tituloResaltado(titulo, resaltar) {
  const t = String(titulo || '');
  const r = String(resaltar || '').trim();
  if (r && t.toLowerCase().endsWith(r.toLowerCase())) {
    const a = t.slice(0, t.length - r.length).trim();
    return `<span class="a">${h(a)}</span> <span class="b">${h(t.slice(t.length - r.length))}</span>`;
  }
  return `<span class="a">${h(t)}</span>`;
}

export function fechaLarga(d = new Date()) {
  try {
    const s = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota' }).format(d);
    return s.charAt(0).toUpperCase() + s.slice(1).replace(',', '');
  } catch { return ''; }
}

/** Lee una imagen elegida por el usuario y la reduce antes de subirla (ahorra datos en el celular). */
export async function reducirImagen(archivo, maxLado = 1800) {
  if (!archivo || !/^image\/(jpeg|png|webp)$/.test(archivo.type) || archivo.size < 900 * 1024) return archivo;
  try {
    const bmp = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
    const esc = Math.min(1, maxLado / Math.max(bmp.width, bmp.height));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(bmp.width * esc);
    lienzo.height = Math.round(bmp.height * esc);
    lienzo.getContext('2d').drawImage(bmp, 0, 0, lienzo.width, lienzo.height);
    const blob = await new Promise((r) => lienzo.toBlob(r, 'image/jpeg', 0.86));
    return blob ? new File([blob], 'foto.jpg', { type: 'image/jpeg' }) : archivo;
  } catch { return archivo; }
}
