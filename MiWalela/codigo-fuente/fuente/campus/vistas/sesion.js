/**
 * Sesión: retos en orden, reproductor de video, actividades con foto, guía,
 * "¿Qué aprendí hoy?" y preguntas a la profe.
 */
import * as api from '../../comun/api.js';
import { h, icono, cinta, avisoError, aviso, conCarga, debounce, discoInsignia } from '../../comun/ui.js';
import { crearReproductor } from '../reproductor.js';
import { subirFoto } from '../fotos.js';
import { abrirWhatsapp, presentacion } from '../compartir.js';

const img = (r) => h(api.url(r));

export async function vistaSesion({ app, contenedor, params, query }) {
  const d = await api.get('sesion', { id: params[0] });
  const s = d.sesion;
  let pestana = ['descripcion', 'aprendi', 'preguntas'].includes(query.get('tab')) ? query.get('tab') : 'aprendi';
  let actual = d.retos.find((r) => String(r.id) === query.get('reto')) || d.retos.find((r) => r.estado !== 'completado') || d.retos[0];
  let limpiarVideo = () => {};
  const hechos = () => d.retos.filter((r) => r.estado === 'completado').length;

  contenedor.innerHTML = `
    <nav class="migas" aria-label="Ruta"><a href="#/cursos">Mis cursos</a>${icono('derecha', 16)}<a href="#/curso/${d.curso.id}">${h(d.curso.etiqueta)}</a>${icono('derecha', 16)}<span>Sesión ${s.numero}</span></nav>
    <div class="sesion-titulo"><span class="etiqueta">Sesión ${s.numero}</span><h1>${h(s.titulo)}</h1></div>
    <div class="sesion-cuerpo">
      <div data-reto></div>
        <section class="pestanas">
          <div role="tablist" aria-label="Contenido de la sesión">
            <button type="button" role="tab" id="t-descripcion" aria-controls="p-sesion" data-tab="descripcion">Descripción</button>
            <button type="button" role="tab" id="t-aprendi" aria-controls="p-sesion" data-tab="aprendi">¿Qué aprendí hoy?</button>
            <button type="button" role="tab" id="t-preguntas" aria-controls="p-sesion" data-tab="preguntas">Mis preguntas${d.preguntas.length ? ` (${d.preguntas.length})` : ''}</button>
          </div>
          <div role="tabpanel" id="p-sesion" data-panel></div>
        </section>
      <aside class="lado-sesion"><div class="lado-pegado">
        <section class="retos-lado"><h2>Retos de la sesión</h2><div data-progreso></div><ol data-lista></ol></section>
        <div data-premio></div></div>
      </aside>
    </div>`;

  const q = (sel) => contenedor.querySelector(sel);

  function pintarLista() {
    q('[data-progreso]').innerHTML = cinta(d.total ? Math.round((hechos() / d.total) * 100) : 0, `${hechos()} de ${d.total}`);
    q('[data-lista]').innerHTML = d.retos.map((r, i) => {
      const hecho = r.estado === 'completado';
      const es = actual && r.id === actual.id;
      const txt = hecho ? '¡Hecho!' : es ? 'Estás aquí' : r.tipo === 'video' ? 'Toca para ver' : r.tipo === 'guia' ? 'Guía paso a paso' : 'Por hacer';
      return `<li><button type="button" class="reto-boton ${hecho ? 'hecho' : ''}" data-reto-id="${r.id}" ${es ? 'aria-current="step"' : ''}>
        <span class="ico"><img src="${img(r.icono || 'assets/img/retos/reto-1.webp')}" alt="" style="${!hecho && !es ? 'opacity:.7' : ''}"><b>${hecho ? icono('check', 14, 'style="stroke-width:3.5"') : i + 1}</b></span>
        <span class="txt"><strong>${h(r.titulo)}</strong><small>${txt}</small></span></button></li>`;
    }).join('');
    q('[data-lista]').querySelectorAll('[data-reto-id]').forEach((b) => {
      b.onclick = () => {
        actual = d.retos.find((r) => String(r.id) === b.dataset.retoId);
        history.replaceState(null, '', `#/sesion/${s.id}?reto=${actual.id}`);
        pintarReto();
        pintarLista();
        q('[data-reto]').scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
    });
    const ins = d.insignia;
    const completa = d.total > 0 && hechos() === d.total;
    let html = '';
    if (ins) {
      html += `<section class="premio-sesion"><span class="medalla" style="${ins.ganada || completa ? '' : 'filter:grayscale(.3)'}">${discoInsignia(ins)}</span>
        <small>${ins.ganada || completa ? '¡INSIGNIA GANADA!' : 'INSIGNIA POR GANAR'}</small><strong>${h(ins.nombre)}</strong>
        <span>${ins.ganada || completa ? 'La encuentras en Mis logros.' : `Completa los ${d.total} retos para ganarla.`}</span></section>`;
    }
    if (completa && d.siguiente) {
      html += `<section class="siguiente-sesion"><strong style="font-family:var(--f-titulo);font-size:19px;color:#1F5F60">¡Terminaste esta sesión!</strong>
        ${d.siguiente.abierta ? `<a class="btn btn-turq" href="#/sesion/${d.siguiente.id}">Ir a la siguiente sesión ${icono('flecha', 20)}</a>`
          : `<span class="ayuda">${h(d.siguiente.motivo || 'La siguiente sesión se abre pronto.')}</span>`}</section>`;
    } else if (completa) {
      html += `<section class="siguiente-sesion"><strong style="font-family:var(--f-titulo);font-size:19px;color:#1F5F60">¡Terminaste esta sesión!</strong>
        <a class="btn btn-turq" href="#/curso/${d.curso.id}">Volver al curso</a></section>`;
    }
    q('[data-premio]').innerHTML = html;
  }

  async function completar(reto, boton) {
    return conCarga(boton, async () => {
      try {
        const r = await api.post('reto/completar', { reto_id: reto.id });
        marcarHecho(reto, r.premio);
      } catch (e) { avisoError(e); }
    });
  }

  function marcarHecho(reto, premio) {
    const antes = hechos();
    reto.estado = 'completado';
    pintarLista();
    pintarReto(true);
    const p = app.premio(premio);
    if (antes < d.total && hechos() === d.total) {
      p.then(() => { if (!(premio && premio.insignias && premio.insignias.length)) aviso('¡Completaste todos los retos de la sesión!', 'bien'); });
    }
  }

  function pintarReto(conservarVideo = false) {
    const r = actual;
    const caja = q('[data-reto]');
    if (!r) {
      caja.innerHTML = `<div class="vacio-bonito"><img src="${img('assets/img/personajes/walela-piensa.webp')}" alt=""><h2>¡Muy pronto!</h2><p>Tu profe está preparando los retos de esta sesión.</p></div>`;
      return;
    }
    const hecho = r.estado === 'completado';
    const num = d.retos.indexOf(r) + 1;
    const botonGuia = d.guia ? `<a class="btn btn-borde turq" href="#/guia/${d.guia.id}">${icono('libro', 20)} Ver guía</a>` : '';
    const botonDuda = `<button type="button" class="btn btn-borde" data-duda>${icono('pregunta', 20)} Tengo una duda</button>`;

    if (r.tipo === 'video') {
      if (conservarVideo && caja.querySelector('.reproductor')) {
        const b = caja.querySelector('[data-visto]');
        if (b) b.outerHTML = `<span class="btn btn-turq" aria-disabled="true">${icono('check', 22, 'style="stroke-width:3"')} ¡Visto! +${r.estrellas} estrellas</span>`;
        return;
      }
      limpiarVideo();
      caja.innerHTML = `<div class="reproductor" data-video></div>
        <h2 style="font-size:28px;margin-top:18px">${h(r.titulo)}</h2>
        ${r.descripcion ? `<p class="desc" style="margin-top:6px;font-size:17px;font-weight:600;color:var(--tinta-2)">${h(r.descripcion)}</p>` : ''}
        <div class="acciones" style="margin-top:16px">
          ${hecho ? `<span class="btn btn-turq" aria-disabled="true">${icono('check', 22, 'style="stroke-width:3"')} ¡Visto! +${r.estrellas} estrellas</span>`
            : `<button type="button" class="btn" data-visto>${icono('check', 22, 'style="stroke-width:3"')} Marcar como visto</button>`}
          ${botonGuia}${botonDuda}</div>`;
      let avisado = hecho;
      limpiarVideo = crearReproductor(caja.querySelector('[data-video]'), r.video, {
        etiqueta: `Reto ${num} · ${r.titulo}`,
        inicio: r.segundos,
        alProgreso: async (seg, dur) => {
          r.segundos = seg;
          try {
            const resp = await api.post('reto/progreso', { reto_id: r.id, segundos: seg, duracion: dur || 0 });
            if (resp.premio && !avisado) { avisado = true; marcarHecho(r, resp.premio); }
          } catch { /* se reintenta en el siguiente envío */ }
        },
      });
    } else if (r.tipo === 'guia') {
      limpiarVideo();
      limpiarVideo = () => {};
      const g = r.guia;
      caja.innerHTML = `<section class="actividad">
        <img src="${img(g && g.portada ? g.portada : r.icono || 'assets/img/retos/reto-5.webp')}" alt="" style="${g && g.portada ? 'border-radius:24px;object-fit:cover;width:220px;height:160px' : ''}">
        <div class="txt"><span class="kicker">Reto ${num} · Guía paso a paso</span><h2>${h(r.titulo)}</h2>${r.descripcion ? `<p>${h(r.descripcion)}</p>` : ''}
        ${g ? cinta(g.pasos ? Math.round((g.logrados / g.pasos) * 100) : 0, `${g.logrados} de ${g.pasos} pasos`) : ''}
        <div class="acciones">${hecho ? `<span class="btn btn-turq" aria-disabled="true">${icono('check')} ¡Guía completada!</span>` : ''}
          ${g ? `<a class="btn ${hecho ? 'btn-borde turq' : 'btn-turq'}" href="#/guia/${g.id}">${icono('libro', 20)} ${hecho ? 'Repasar la guía' : 'Abrir la guía'}</a>` : '<span class="ayuda">La guía aún no está lista.</span>'}
          ${botonDuda}</div></div></section>`;
    } else {
      limpiarVideo();
      limpiarVideo = () => {};
      caja.innerHTML = `<section class="actividad">
        <img src="${img(r.icono || 'assets/img/retos/reto-1.webp')}" alt="">
        <div class="txt"><span class="kicker">Reto ${num}</span><h2>${h(r.titulo)}</h2>${r.descripcion ? `<p>${h(r.descripcion)}</p>` : ''}
        <div class="acciones">
          ${hecho ? `<span class="btn btn-turq" aria-disabled="true">${icono('check', 22, 'style="stroke-width:3"')} ¡Hecho! +${r.estrellas} estrellas</span>`
            : `<button type="button" class="btn" data-hecho>${icono('check', 22, 'style="stroke-width:3"')} ¡Lo hice!</button>`}
          ${r.permite_foto ? `<button type="button" class="btn btn-borde fucsia" data-foto>${icono('foto', 20)} ${r.fotos ? 'Subir otra foto' : 'Subir foto de mi trabajo'}</button>` : ''}
          ${botonGuia}${botonDuda}</div>
        ${r.fotos ? `<span class="ayuda">${icono('check', 16)} Tienes ${r.fotos} foto${r.fotos > 1 ? 's' : ''} de este reto en <a href="#/logros">tu colección</a>.</span>` : ''}</div></section>`;
    }
    const bv = caja.querySelector('[data-visto]');
    if (bv) bv.onclick = () => completar(r, bv);
    const bh = caja.querySelector('[data-hecho]');
    if (bh) bh.onclick = () => completar(r, bh);
    const bf = caja.querySelector('[data-foto]');
    if (bf) {
      bf.onclick = async () => {
        const resp = await subirFoto({ ruta: 'reto/foto', datos: { reto_id: r.id }, titulo: r.titulo });
        if (resp) { r.fotos += 1; if (r.estado !== 'completado') marcarHecho(r, resp.premio); else { pintarReto(); app.premio(resp.premio); aviso('¡Foto guardada en tu colección!', 'bien'); } }
      };
    }
    const bd = caja.querySelector('[data-duda]');
    if (bd) bd.onclick = () => { pestana = 'preguntas'; pintarPestana(); q('.pestanas').scrollIntoView({ behavior: 'smooth' }); setTimeout(() => q('#pregunta')?.focus(), 400); };
  }

  const guardarReflexion = debounce(async (form, estado) => {
    try {
      const datos = { sesion_id: s.id };
      form.querySelectorAll('input').forEach((i) => (datos[i.name] = i.value));
      await api.post('reflexion', datos);
      Object.assign(d.reflexion, datos);
      estado.textContent = '✓ Guardado en tu cuaderno';
    } catch (e) { estado.textContent = 'No se pudo guardar'; }
  }, 900);

  function pintarPestana() {
    contenedor.querySelectorAll('[role=tab]').forEach((t) => {
      const on = t.dataset.tab === pestana;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    const panel = q('[data-panel]');
    panel.setAttribute('aria-labelledby', 't-' + pestana);
    if (pestana === 'descripcion') {
      panel.innerHTML = `<p style="font-size:16px;font-weight:600;line-height:1.55;color:var(--tinta-2)">${h(s.proposito || 'Tu profe pronto escribirá de qué se trata esta sesión.')}</p>
        ${s.conexion_dba ? `<p style="margin-top:12px"><span class="chip" style="background:var(--lila-s)">${h(s.conexion_dba)}</span></p>` : ''}
        ${d.guia && d.guia.pdf ? `<p style="margin-top:14px"><a class="btn btn-borde turq btn-p" href="${h(api.urlApi('guia/pdf', { id: d.guia.id }))}">${icono('descargar', 18)} Descargar la guía en PDF</a></p>` : ''}`;
    } else if (pestana === 'aprendi') {
      const r = d.reflexion;
      const campo = (nombre, texto) => `<label>${texto}<input class="entrada" name="${nombre}" maxlength="500" value="${h(r[nombre] || '')}" placeholder="Escribe aquí"></label>`;
      panel.innerHTML = `<form class="reflexion" onsubmit="return false">
        ${campo('me_gusto', 'Lo que más me gustó fue…')}${campo('material_nuevo', 'Un material nuevo que descubrí…')}
        ${campo('aprendi', 'Algo que aprendí sobre ser diseñadora o diseñador…')}${campo('quiero_crear', 'Lo que quiero crear en mi colección…')}</form>
        <p class="guardado" data-guardado style="margin-top:10px" aria-live="polite"></p>`;
      const form = panel.querySelector('form');
      const estado = panel.querySelector('[data-guardado]');
      form.addEventListener('input', () => { estado.textContent = 'Guardando…'; guardarReflexion(form, estado); });
    } else {
      panel.innerHTML = `<form data-preguntar style="display:flex;flex-direction:column;gap:12px">
          <label for="pregunta" style="font-weight:800">Escribe tu pregunta y se la enviamos a tu profe por WhatsApp.</label>
          <textarea class="entrada" id="pregunta" maxlength="1000" rows="3" placeholder="Ej.: ¿Puedo usar otra tela para mi falda?"></textarea>
          <button type="submit" class="btn btn-lila" style="align-self:flex-end">${icono('chat', 18)} Enviar a mi profe</button></form>
        <div class="preguntas-lista">${d.preguntas.map((p) => `<div class="pregunta"><strong>${h(p.texto)}</strong>
          <div class="espera">${icono('chat', 14)} Enviada por WhatsApp · ${h(p.fecha)} · tu profe te responde por allí</div></div>`).join('')}</div>`;
      const form = panel.querySelector('[data-preguntar]');
      form.onsubmit = (ev) => {
        ev.preventDefault();
        const texto = form.querySelector('textarea').value.trim();
        if (texto.length < 3) return aviso('Escribe tu pregunta primero.', 'mal');
        // WhatsApp se abre de inmediato (los navegadores solo lo permiten justo después del toque).
        abrirWhatsapp(`¡Hola, profe! ${presentacion()} Tengo una pregunta sobre «${d.curso.etiqueta} · Sesión ${s.numero}: ${s.titulo}»:\n\n${texto}`);
        conCarga(form.querySelector('button'), async () => {
          try {
            const r = await api.post('pregunta', { sesion_id: s.id, texto });
            d.preguntas.unshift(r.pregunta);
            aviso('¡Listo! Envía el mensaje en WhatsApp para que le llegue a tu profe.', 'bien');
            contenedor.querySelector('#t-preguntas').textContent = `Mis preguntas (${d.preguntas.length})`;
            pintarPestana();
          } catch (e) { avisoError(e); }
        });
      };
    }
  }

  contenedor.querySelectorAll('[role=tab]').forEach((t) => {
    t.onclick = () => { pestana = t.dataset.tab; pintarPestana(); };
    t.onkeydown = (e) => {
      const tabs = [...contenedor.querySelectorAll('[role=tab]')];
      const i = tabs.indexOf(t);
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const sig = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        pestana = sig.dataset.tab; pintarPestana(); sig.focus();
      }
    };
  });

  pintarLista();
  pintarReto();
  pintarPestana();
  if (query.get('tab') === 'preguntas') setTimeout(() => q('.pestanas').scrollIntoView({ behavior: 'smooth' }), 300);
  return () => limpiarVideo();
}
