/**
 * Mis guías (biblioteca) y visor de la guía paso a paso.
 */
import * as api from '../../comun/api.js';
import { h, icono, cinta, tituloResaltado, avisoError, conCarga, aviso } from '../../comun/ui.js';

const img = (r) => h(api.url(r));
const pdf = (id, ver) => h(api.urlApi('guia/pdf', ver ? { id, ver: 1 } : { id }));

export async function vistaGuias({ contenedor, query }) {
  const d = await api.get('guias');
  const cursos = [...new Set(d.guias.map((g) => g.curso).filter(Boolean))];
  let filtro = query.get('filtro') || 'todas';
  const filtros = [['todas', 'Todas', () => true], ...cursos.map((c) => [c, c.charAt(0) + c.slice(1).toLowerCase(), (g) => g.curso === c]),
    ['descargadas', 'Descargadas', (g) => g.descargada], ['completadas', 'Completadas', (g) => g.completada]];
  const dest = d.guias.find((g) => g.id === d.destacada && g.abierta);
  const otra = d.guias.find((g) => dest && g.id !== dest.id && g.portada);

  contenedor.innerHTML = `
    <div class="encabezado"><div><h1 style="color:#1F5F60">Mis guías</h1><p>Síguelas paso a paso o imprímelas para usar con tu kit.</p></div>
      <div class="filtros turq" role="group" aria-label="Filtrar guías" data-filtros style="margin:0"></div></div>
    ${dest ? `<section class="guia-destacada">
      <div class="hojas" aria-hidden="true">${otra ? `<img src="${img(otra.portada)}" alt="">` : `<img src="${img(dest.portada || 'assets/img/guias/paso-1.webp')}" alt="">`}<img src="${img(dest.portada || 'assets/img/guias/paso-1.webp')}" alt=""></div>
      <div class="txt"><span class="etiqueta">${h(dest.etiqueta || 'Guía')}${dest.nueva ? ' · Nueva' : ''}</span>
        <h2>${tituloResaltado(dest.titulo, dest.resaltar)}</h2>
        ${dest.descripcion ? `<p>${h(dest.descripcion)}</p>` : ''}
        <div style="display:flex;gap:8px;flex-wrap:wrap">${dest.pasos ? `<span class="chip">${dest.pasos} pasos</span>` : ''}${dest.conexion_dba ? `<span class="chip">${h(dest.conexion_dba)}</span>` : ''}</div>
        ${dest.pasos ? cinta(Math.round((dest.logrados / dest.pasos) * 100), `${dest.logrados} de ${dest.pasos} pasos`) : ''}
        <div class="acciones"><a class="btn btn-turq" href="#/guia/${dest.id}">${icono('play', 18)} ${dest.logrados ? 'Seguir paso a paso' : 'Ver paso a paso'}</a>
        ${dest.pdf ? `<a class="btn btn-borde turq" href="${pdf(dest.id)}">${icono('descargar', 20)} Descargar PDF</a>` : ''}</div></div>
    </section>` : ''}
    <div class="rejilla-guias" data-rejilla></div>
    <section class="cole"><span class="ico">${icono('regla', 30)}</span><div><strong>Diseño y matemáticas, ¡juntos!</strong>
      <span>Cada guía practica temas de primaria: medición, geometría, patrones, fracciones, área y perímetro.</span></div></section>`;

  const pintar = () => {
    contenedor.querySelector('[data-filtros]').innerHTML = filtros.map(([id, nombre, fn]) => {
      const n = d.guias.filter(fn).length;
      if (id !== 'todas' && !n) return '';
      return `<button type="button" class="filtro" aria-pressed="${filtro === id}" data-f="${h(id)}">${h(nombre)}</button>`;
    }).join('');
    const fn = (filtros.find((f) => f[0] === filtro) || filtros[0])[2];
    const lista = d.guias.filter(fn);
    const tarjetas = lista.map((g) => {
      if (!g.abierta) {
        return `<article class="guia-card cerrada"><div class="portada"><span>${icono('candado', 28)}</span></div>
          <div class="cuerpo"><small>${h(g.etiqueta || 'Guía')}</small><h3>${h(g.titulo)}</h3><div class="pie"><span class="ayuda">${h(g.motivo || 'Se abre con la sesión')}</span></div></div></article>`;
      }
      const chip = g.completada ? '¡Completada!' : g.descargada ? 'Descargada' : g.nueva ? 'Nueva' : '';
      return `<article class="guia-card"><div class="portada"><img src="${img(g.portada || 'assets/img/guias/paso-1.webp')}" alt="">${chip ? `<span class="chip">${chip}</span>` : ''}</div>
        <div class="cuerpo"><small>${h(g.etiqueta || 'Guía')}</small><h3>${h(g.titulo)}</h3>
        ${g.pasos ? cinta(Math.round((g.logrados / g.pasos) * 100), `${g.logrados}/${g.pasos}`) : ''}
        <div class="pie"><a class="btn btn-turq btn-p" href="#/guia/${g.id}">Abrir</a>
        ${g.pdf ? `<a class="boton-descarga" href="${pdf(g.id)}" aria-label="Descargar ${h(g.titulo)}">${icono('descargar')}</a>` : ''}</div></div></article>`;
    });
    if (filtro === 'todas') {
      d.pronto.forEach((p) => tarjetas.push(`<article class="guia-card cerrada"><div class="portada"><span>${icono('candado', 28)}</span></div>
        <div class="cuerpo"><small>${h(p.etiqueta)}</small><h3>¡Muy pronto!</h3><div class="pie"><span class="ayuda">Tu profe la está preparando</span></div></div></article>`));
    }
    contenedor.querySelector('[data-rejilla]').innerHTML = tarjetas.join('') || `<div class="vacio-bonito" style="grid-column:1/-1"><img src="${img('assets/img/personajes/walela-piensa.webp')}" alt=""><h2>No hay guías aquí</h2></div>`;
    contenedor.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => { filtro = b.dataset.f; pintar(); }));
  };
  pintar();
}

const ICONOS_RECUERDA = { corazon: 'corazon', flor: 'flor', estrella: 'estrella', lapiz: 'lapiz', tijeras: 'tijeras', boton: 'boton', hilo: 'hilo', regla: 'regla' };
const TONOS = ['#E8698E', '#9C80C2', '#3FA9A8', '#9C80C2', '#E8698E', '#3FA9A8', '#F2A93B', '#F88C7A'];

export async function vistaGuia({ app, contenedor, params, query }) {
  const d = await api.get('guia', { id: params[0] });
  const g = d.guia;
  const pasos = d.pasos;
  let i = Math.max(0, Math.min(pasos.length - 1, (Number(query.get('paso')) || 0) - 1));
  if (!query.get('paso')) { const p = pasos.findIndex((x) => !x.logrado); i = p >= 0 ? p : 0; }
  const partes = String(g.etiqueta || 'Guía').split('·').map((x) => x.trim()).filter(Boolean);

  contenedor.innerHTML = `
    <div class="fila-entre" style="margin-bottom:18px">
      <a class="enlace-sutil" style="color:var(--turq-f)" href="${d.sesion ? `#/sesion/${d.sesion.id}` : '#/guias'}">${icono('izquierda', 20)} ${d.sesion ? 'Volver a la sesión' : 'Mis guías'}</a>
      ${g.pdf ? `<div class="acciones"><a class="btn btn-borde turq btn-p" href="${pdf(g.id)}">${icono('descargar', 20)} Descargar PDF</a>
        <a class="btn btn-borde turq btn-p" href="${pdf(g.id, true)}" target="_blank" rel="noopener">${icono('imprimir', 20)} Imprimir</a></div>` : ''}
    </div>
    <div class="guia-cabeza"><div class="lazo">${partes.slice(0, 2).map((p) => `<span>${h(p)}</span>`).join('')}</div><h1>${tituloResaltado(g.titulo, g.resaltar)}</h1></div>
    ${pasos.length ? `<div class="visor">
      <section class="paso-tarjeta" aria-label="Paso a paso" aria-live="polite">
        <div class="paso-progreso"><span data-contador></span><div class="puntos" data-puntos></div></div>
        <div class="paso-cuerpo" data-paso></div>
      </section>
      <aside class="lado-guia">
        <div class="consejo"><img src="${img('assets/img/personajes/walela-piensa.webp')}" alt="Walela"><div class="burbuja" data-consejo></div></div>
        ${d.recuerda.length ? `<section class="recuerda-lista"><h2>RECUERDA</h2><ol data-recuerda></ol></section>` : ''}
        ${g.frase_final ? `<div class="frase-final">${h(g.frase_final)}</div>` : ''}
        <div data-final></div>
      </aside></div>`
      : `<div class="vacio-bonito"><img src="${img('assets/img/personajes/walela-piensa.webp')}" alt=""><h2>Esta guía aún no tiene pasos</h2>
        ${g.pdf ? `<a class="btn btn-turq" href="${pdf(g.id)}">${icono('descargar')} Descargar la guía en PDF</a>` : ''}</div>`}`;
  if (!pasos.length) return undefined;

  const q = (s) => contenedor.querySelector(s);
  const completa = () => pasos.every((p) => p.logrado);

  function pintar() {
    const p = pasos[i];
    history.replaceState(null, '', `#/guia/${g.id}?paso=${i + 1}`);
    q('[data-contador]').textContent = `Paso ${i + 1} de ${pasos.length}`;
    q('[data-puntos]').innerHTML = pasos.map((x, k) => `<button type="button" class="${x.logrado ? 'hecho' : ''}" aria-label="Ir al paso ${k + 1}${x.logrado ? ' (logrado)' : ''}" ${k === i ? 'aria-current="step"' : ''} data-ir="${k}"></button>`).join('');
    q('[data-paso]').innerHTML = `
      <div class="paso-nombre"><span class="n">${h(p.numero || i + 1)}</span><div><small>${h(p.etiqueta || 'PASO ' + (i + 1))}</small><h2>${h(p.titulo)}</h2></div></div>
      ${p.imagen ? `<div class="paso-imagen"><img src="${img(p.imagen)}" alt="${h(p.titulo)}"></div>` : ''}
      ${p.texto ? `<p class="paso-texto">${h(p.texto)}</p>` : ''}
      <div class="paso-nav">
        <button type="button" class="btn btn-borde" data-ant ${i === 0 ? 'disabled' : ''}>${icono('izquierda', 20)} Anterior</button>
        <button type="button" class="btn ${p.logrado ? 'btn-turq' : 'btn-amar'}" data-logre aria-pressed="${p.logrado}">${icono('estrella', 22)} ${p.logrado ? '¡Lo logré!' : 'Marcar: ¡lo logré!'}</button>
        <button type="button" class="btn" data-sig ${i === pasos.length - 1 ? 'disabled' : ''}>Siguiente ${icono('derecha', 20)}</button>
      </div>`;
    q('[data-consejo]').textContent = p.consejo || 'Ve con calma: una diseñadora observa antes de actuar.';
    const lista = q('[data-recuerda]');
    if (lista) {
      lista.innerHTML = d.recuerda.map((r, k) => {
        const on = r.id === p.recuerda_id;
        const tono = TONOS[k % TONOS.length];
        return `<li class="${on ? 'activo' : ''}"><span class="c" style="${on ? `background:${tono};color:#fff` : `color:${tono}`}">${icono(ICONOS_RECUERDA[r.icono] || 'corazon', 18)}</span>${h(r.texto)}</li>`;
      }).join('');
    }
    q('[data-final]').innerHTML = completa() ? `<div class="guia-lista"><strong style="font-family:var(--f-titulo);font-size:20px;color:#1F5F60">¡Terminaste la guía!</strong>
      <span class="ayuda">Ahora sube una foto de tu trabajo en tu sesión.</span>${d.sesion ? `<a class="btn btn-turq btn-p" href="#/sesion/${d.sesion.id}">Ir a la sesión</a>` : ''}</div>` : '';
    q('[data-ant]').onclick = () => { if (i > 0) { i--; pintar(); } };
    q('[data-sig]').onclick = () => { if (i < pasos.length - 1) { i++; pintar(); } };
    q('[data-puntos]').querySelectorAll('[data-ir]').forEach((b) => (b.onclick = () => { i = Number(b.dataset.ir); pintar(); }));
    const bl = q('[data-logre]');
    bl.onclick = () => conCarga(bl, async () => {
      const nuevo = !p.logrado;
      try {
        const r = await api.post('guia/paso', { paso_id: p.id, logrado: nuevo });
        p.logrado = nuevo;
        const antes = i;
        if (nuevo && !r.completada && i < pasos.length - 1) {
          aviso('¡Muy bien! Vamos al siguiente paso.', 'bien');
          setTimeout(() => { if (i === antes) { i++; pintar(); } }, 700);
        }
        pintar();
        if (r.premio) await app.premio(r.premio);
      } catch (e) { avisoError(e); }
    });
  }

  const teclas = (e) => {
    if (e.target.closest('input, textarea, select') || document.querySelector('.velo')) return;
    if (e.key === 'ArrowRight' && i < pasos.length - 1) { i++; pintar(); }
    if (e.key === 'ArrowLeft' && i > 0) { i--; pintar(); }
  };
  document.addEventListener('keydown', teclas);
  pintar();
  return () => document.removeEventListener('keydown', teclas);
}
