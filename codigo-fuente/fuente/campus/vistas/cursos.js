/**
 * Mis cursos (catálogo con filtros) y detalle de un curso con sus sesiones.
 */
import * as api from '../../comun/api.js';
import { h, icono, cinta, tituloResaltado, color, conCarga, avisoError, aviso } from '../../comun/ui.js';

const img = (r) => h(api.url(r));
const TINTA = { lila: '#6A4C9C', turquesa: '#1F7F80', fucsia: '#B31E57', coral: '#B9533F', amarillo: '#B31E57', menta: '#1F7F80', rosa: '#C2386A' };
const SOMBRA = { lila: '#46306E', turquesa: '#145A5B', fucsia: '#8E1F4B', coral: '#8A3B2C', amarillo: '#8E1F4B', menta: '#145A5B', rosa: '#8E1F4B' };

export function tarjetaCurso(c) {
  const suave = color(c.color).suave;
  const tinta = TINTA[c.color] || TINTA.lila;
  const bloq = c.estado === 'bloqueado';
  const portada = c.portada
    ? `<img class="${c.portada_tipo === 'icono' ? 'icono' : 'foto'}" src="${img(c.portada)}" alt="">`
    : `<span style="color:${tinta}">${icono('tijeras', 64)}</span>`;
  const chip = c.chip ? `<span class="chip" style="color:${TINTA[c.chip.color] || tinta}">${h(c.chip.texto)}</span>` : '';
  const progreso = !bloq && c.porcentaje > 0 ? cinta(c.porcentaje, c.porcentaje + ' %') : '';
  const pie = bloq
    ? `<span class="candado">${icono('candado', 18)} ${h(c.cta.texto)}</span>`
    : `<span class="btn btn-p ir" style="--b-fondo:${tinta};--b-sombra:${SOMBRA[c.color] || '#46306E'}">${h(c.cta.texto)} ${icono('derecha', 18)}</span>`;
  const interior = `
    <div class="portada" style="background:${suave}">${portada}<span class="etiqueta" style="background:${tinta}">${h(c.etiqueta)}</span>${chip}</div>
    <div class="cuerpo"><h3>${h(c.titulo)}</h3>${c.descripcion ? `<p>${h(c.descripcion)}</p>` : ''}<span class="meta">${h(c.meta)}</span>
    <div class="pie">${progreso}${pie}</div></div>`;
  return bloq
    ? `<article class="curso-card bloqueado" aria-label="${h(c.titulo)} (bloqueado)">${interior}</article>`
    : `<a class="curso-card" href="#/curso/${c.id}">${interior}</a>`;
}

const FILTROS = [
  ['todos', 'Todos', () => true],
  ['en_progreso', 'En progreso', (c) => c.estado === 'en_progreso'],
  ['nuevo', 'Por empezar', (c) => c.estado === 'nuevo'],
  ['en_vivo', 'En vivo', (c) => c.estado === 'en_vivo'],
  ['completado', 'Completados', (c) => c.estado === 'completado'],
];

export async function vistaCursos({ contenedor, query }) {
  const { cursos } = await api.get('cursos');
  let filtro = query.get('filtro') || 'todos';
  contenedor.innerHTML = `
    <div class="encabezado"><div><h1 style="color:var(--morado)">Mis cursos</h1><p>Cursos de diseño de moda para niñas y niños desde los 6 años.</p></div></div>
    <div class="filtros" role="group" aria-label="Filtrar cursos" data-filtros></div>
    <div class="rejilla-cursos" data-rejilla></div>`;
  const pintar = () => {
    contenedor.querySelector('[data-filtros]').innerHTML = FILTROS.map(([id, nombre, fn]) => {
      const n = cursos.filter(fn).length;
      if (id !== 'todos' && n === 0) return '';
      return `<button type="button" class="filtro" aria-pressed="${filtro === id}" data-f="${id}">${nombre}<span class="n">${n}</span></button>`;
    }).join('');
    const fn = (FILTROS.find((f) => f[0] === filtro) || FILTROS[0])[2];
    const lista = cursos.filter(fn);
    contenedor.querySelector('[data-rejilla]').innerHTML = lista.length ? lista.map(tarjetaCurso).join('')
      : `<div class="vacio-bonito" style="grid-column:1/-1"><img src="${img('assets/img/personajes/walela-piensa.webp')}" alt=""><h2>Aquí no hay cursos todavía</h2><p>Tu profe está preparando cosas nuevas.</p></div>`;
    contenedor.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => { filtro = b.dataset.f; pintar(); }));
  };
  pintar();
}

function botonClase(cl) {
  if (cl.puede_unirse) return `<button type="button" class="btn btn-lila" data-unirme="${cl.id}">${icono('camara')} Unirme a la clase</button>`;
  if (cl.cupos !== null && !cl.reservada) {
    return cl.cupos_libres > 0 ? `<button type="button" class="btn btn-lila" data-reservar="${cl.id}">${icono('check')} Reservar mi cupo</button>`
      : '<p class="nota">Ya no quedan cupos para esta clase.</p>';
  }
  if (cl.reservada) return `<p class="nota">${icono('check', 16)} ¡Tienes tu cupo! La clase se abre 15 minutos antes.</p>`;
  return '<p class="nota">La clase se abre 15 minutos antes de empezar.</p>';
}

/** Tarjeta de clase en vivo con sus acciones (también la usa Inicio). */
export function tarjetaClase(cl, { vacia = false } = {}) {
  if (vacia) {
    return `<section class="clase-vivo"><span class="en-vivo">Clases en vivo</span><h3>Tu profe anunciará aquí la próxima clase</h3>
      <p>Cuando haya una clase programada podrás reservar tu cupo y unirte desde aquí.</p></section>`;
  }
  const vivo = cl.estado === 'en_vivo';
  return `<section class="clase-vivo" data-clase="${cl.id}">
    <div class="fila-entre"><span class="en-vivo ${vivo ? 'ya' : ''}">${vivo ? 'En vivo ahora' : cl.es_hoy ? 'En vivo hoy' : 'Clase en vivo'}</span>
    <span class="hora">${icono('reloj', 18)} ${h(cl.es_hoy ? cl.hora : cl.cuando)}</span></div>
    <h3>${h(cl.titulo)}</h3>${cl.descripcion ? `<p>${h(cl.descripcion)}</p>` : ''}
    ${cl.cupos !== null ? `<p>${cl.cupos_libres} de ${cl.cupos} cupos libres</p>` : ''}
    ${botonClase(cl)}</section>`;
}

/** Activa los botones de reservar/unirse dentro de un contenedor. */
export function activarClases(raiz, app, alCambiar) {
  raiz.querySelectorAll('[data-reservar]').forEach((b) => {
    b.onclick = () => conCarga(b, async () => {
      try {
        await api.post('clase/reservar', { clase_id: Number(b.dataset.reservar) });
        aviso('¡Listo! Guardamos tu cupo.', 'bien');
        if (alCambiar) alCambiar();
      } catch (e) { avisoError(e); }
    });
  });
  raiz.querySelectorAll('[data-unirme]').forEach((b) => {
    b.onclick = () => {
      const ventanaClase = window.open('', '_blank');
      conCarga(b, async () => {
        try {
          const r = await api.post('clase/unirme', { clase_id: Number(b.dataset.unirme) });
          if (ventanaClase) ventanaClase.location.href = r.enlace; else window.location.href = r.enlace;
          app.premio(r.premio);
        } catch (e) { if (ventanaClase) ventanaClase.close(); avisoError(e); }
      });
    };
  });
}

const ESTADO_SESION = {
  completada: ['¡COMPLETADA!', 'var(--turq-s)', 'var(--turq-f)'],
  en_curso: ['EN CURSO', 'var(--rosa-s)', 'var(--magenta)'],
  disponible: ['DISPONIBLE', 'var(--turq-s)', 'var(--turq-f)'],
};

export async function vistaCurso({ app, contenedor, params }) {
  const d = await api.get('curso', { id: params[0] });
  const c = d.curso;
  const bloq = d.estado === 'bloqueado';
  const chips = [];
  if (c.tipo !== 'taller') {
    if (c.n_sesiones) chips.push(`${c.n_sesiones} sesiones`);
    if (c.n_videos) chips.push(`${c.n_videos} videos`);
  } else {
    chips.push({ virtual: 'Virtual', presencial: 'Presencial', mixta: 'Virtual y presencial' }[c.modalidad] || 'Virtual');
  }
  chips.push(`Desde ${c.edad_minima} años`);
  let burbuja = '¡Aquí empieza tu aventura!';
  if (bloq) burbuja = `Este curso se abre: ${d.bloqueo.toLowerCase()}.`;
  else if (d.estado === 'completado') burbuja = '¡Terminaste este curso! Eres genial.';
  else if (d.hechos > 0) burbuja = `¡Vas muy bien! Llevas ${d.hechos} de ${d.total} retos.`;

  const sesiones = d.sesiones.map((s) => {
    const clase = s.estado;
    if (s.estado === 'bloqueada' || s.estado === 'pronto') {
      return `<article class="sesion-item ${clase}"><span class="num">${icono('candado', 24)}</span>
        <div class="txt"><strong>Sesión ${s.numero} · ${s.estado === 'pronto' || s.motivo === '¡Muy pronto!' ? '¡Muy pronto!' : h(s.titulo)}</strong>
        <span class="estado">${h(s.estado === 'pronto' ? 'Tu profe la está preparando.' : s.motivo || 'Se abre pronto.')}</span></div></article>`;
    }
    const [txt, fondo, tinta] = ESTADO_SESION[s.estado] || ESTADO_SESION.disponible;
    const mini = s.retos.map((r) => `<img class="${r.estado === 'completado' ? 'hecho' : r.estado === 'en_curso' ? '' : 'pend'}" src="${img(r.icono || 'assets/img/retos/reto-1.webp')}" alt="" title="${h(r.titulo)}">`).join('');
    const boton = s.estado === 'completada'
      ? `<a class="btn btn-borde turq" href="#/sesion/${s.id}">${icono('check')} Repasar</a>`
      : s.estado === 'en_curso'
        ? `<a class="btn" href="#/sesion/${s.id}">${icono('play', 18)} Continuar</a>`
        : `<a class="btn btn-turq" href="#/sesion/${s.id}">${icono('play', 18)} Empezar</a>`;
    return `<article class="sesion-item ${clase}"><span class="num">${s.estado === 'completada' ? icono('check', 28, 'style="stroke-width:3"') : s.numero}</span>
      <div class="txt"><span class="estado"><b style="background:${fondo};color:${tinta}">${txt}</b>${h(s.meta)}</span>
      <strong>${h(s.titulo)}</strong>${mini ? `<div class="mini-retos">${mini}<span>${s.retos_hechos} de ${s.retos_total}</span></div>` : ''}</div>${boton}</article>`;
  }).join('');

  const objetivos = c.objetivos.length ? `<section class="lograr"><h2>¿Qué vamos a lograr?</h2><ul>
    ${c.objetivos.map((o, i) => `<li><span class="check ${i < d.objetivos_logrados ? 'si' : ''}">${i < d.objetivos_logrados ? icono('check', 14, 'style="stroke-width:3.5"') : ''}</span>${h(o)}</li>`).join('')}</ul></section>` : '';
  const kit = c.kit.length ? `<section class="kit"><h2>${c.tipo === 'taller' ? 'Ten a la mano' : 'Tu kit de trabajo'}</h2><div>${c.kit.map((k) => `<span>${h(k)}</span>`).join('')}</div></section>` : '';
  const frase = c.frase ? `<section class="recuerda-caja">${icono('hilo', 40, 'style="color:var(--fucsia-f)"')}<div><small>RECUERDA</small><strong>${h(c.frase)}</strong></div></section>` : '';
  const clases = d.clases.map((cl) => tarjetaClase(cl)).join('');

  contenedor.innerHTML = `
    <nav class="migas" aria-label="Ruta"><a href="#/cursos">Mis cursos</a>${icono('derecha', 16)}<span>${h(c.etiqueta)}</span></nav>
    <section class="banner-curso ${bloq ? 'bloq' : ''}" style="${bloq ? '' : `background:${color(c.color).suave}`}">
      <span class="etiqueta">${h(c.etiqueta)}</span>
      <h1>${tituloResaltado(c.titulo, c.resaltar)}</h1>
      ${c.introduccion ? `<p>${h(c.introduccion)}</p>` : ''}
      <div class="abajo"><div style="display:flex;gap:8px;flex-wrap:wrap">${chips.map((x) => `<span class="chip">${h(x)}</span>`).join('')}</div>
        ${d.total ? cinta(d.porcentaje, d.porcentaje + ' %') : ''}</div>
      <img class="walela" src="${img('assets/img/personajes/walela-cuerpo-completo.webp')}" alt="">
      <div class="burbuja lila">${h(burbuja)}</div>
    </section>
    <div class="curso-cuerpo">
      <section class="sesiones">
        ${d.sesiones.length ? `<h2>${c.tipo === 'taller' ? 'Actividades' : 'Sesiones del módulo'}</h2>${sesiones}` : ''}
        ${c.tipo === 'taller' ? (clases || tarjetaClase(null, { vacia: true })) : ''}
        ${!d.sesiones.length && c.tipo !== 'taller' ? `<div class="vacio-bonito"><img src="${img('assets/img/personajes/walela-piensa.webp')}" alt=""><h2>¡Muy pronto!</h2><p>Tu profe está preparando las sesiones de este curso.</p></div>` : ''}
      </section>
      <aside class="lado-curso">${objetivos}${kit}${c.tipo !== 'taller' ? clases : ''}${frase}</aside>
    </div>`;
  activarClases(contenedor, app, () => app.navegar());
}
