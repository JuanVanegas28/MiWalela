/**
 * Inicio: saludo, seguir donde quedaste, clase en vivo, reto de la semana, cursos y guías.
 */
import * as api from '../../comun/api.js';
import { h, icono, cinta, fechaLarga } from '../../comun/ui.js';
import { tarjetaCurso, tarjetaClase, activarClases } from './cursos.js';
import { subirFoto } from '../fotos.js';

const img = (r) => h(api.url(r));

export async function vistaInicio({ app, contenedor }) {
  const d = await api.get('inicio');
  app.fijarEstudiante(d.estudiante);
  const e = d.estudiante;

  let seguir;
  if (d.continuar) {
    const c = d.continuar;
    const pct = c.total ? Math.round((c.hechos / c.total) * 100) : 0;
    seguir = `<a class="seguir" href="#/sesion/${c.sesion.id}?reto=${c.reto.id}">
      <img class="ico" src="${img(c.reto.icono || 'assets/img/retos/reto-1.webp')}" alt="">
      <span class="txt"><small>Sigue donde quedaste · Sesión ${c.sesion.numero}</small><strong>${h(c.reto.titulo)}</strong>${cinta(pct, `${c.hechos} de ${c.total} retos`)}</span>
      <span class="play" aria-hidden="true">${icono('play', 24)}</span><span class="solo-lector">Continuar</span></a>`;
  } else {
    seguir = `<a class="seguir" href="#/logros"><img class="ico" src="${img('assets/img/retos/reto-6.webp')}" alt="">
      <span class="txt"><small>¡Lo lograste!</small><strong>Completaste todos los retos disponibles. ¡Pronto habrá más!</strong></span>
      <span class="play" aria-hidden="true">${icono('trofeo', 24)}</span></a>`;
  }

  const rs = d.reto_semana;
  const retoSemana = rs ? `<section class="reto-semana">
      <span class="ico">${icono('trofeo', 28)}</span>
      <span class="txt"><small>Reto de la semana · +${rs.estrellas} estrellas</small><strong>${h(rs.titulo)}</strong>
      ${rs.subido ? `<span class="hecho">${icono('check', 16)} ¡Ya lo subiste! Está en tu colección.</span>` : `<span class="ayuda" style="font-size:13px">Hasta el ${h(rs.termina)}</span>`}</span>
      ${rs.subido ? '' : `<button type="button" data-reto-semana aria-label="Subir la foto de mi reto">${icono('foto', 24)}</button>`}
    </section>` : '';

  const racha = e.racha > 1 ? `<span class="chip racha" style="background:#fff;color:var(--amar-f)">${icono('estrella', 18, 'style="color:#F2A93B"')} ${e.racha} días seguidos creando</span>` : '';

  contenedor.innerHTML = `
  <div class="inicio">
    <div class="inicio-arriba">
      <section class="hola">
        <span class="kicker">${h(fechaLarga())}</span>
        <h1>¡Hola, ${h(e.nombre)}!</h1>
        <p>¿Te animas a crear algo increíble hoy?</p>
        ${racha}
        ${seguir}
        <img class="walela" src="${img('assets/img/personajes/walela-hola.webp')}" alt="Walela te saluda">
      </section>
      <div class="lado-inicio">
        ${d.clase ? tarjetaClase(d.clase) : tarjetaClase(null, { vacia: true })}
        ${retoSemana}
      </div>
    </div>
    <div class="seccion-titulo"><h2>Tus cursos</h2><a class="enlace-sutil" href="#/cursos">Ver todos ${icono('derecha', 18)}</a></div>
    <div class="rejilla-cursos">${d.cursos.map(tarjetaCurso).join('') || '<p>Pronto verás tus cursos aquí.</p>'}</div>
    ${d.guias.length ? `<div class="seccion-titulo"><h2>Tus guías</h2><a class="enlace-sutil" href="#/guias" style="color:var(--turq-f)">Ver todas ${icono('derecha', 18)}</a></div>
    <div class="guias-mini">${d.guias.map((g) => `
      <div class="guia-mini"><img src="${img(g.portada || 'assets/img/guias/paso-1.webp')}" alt="">
        <div class="txt"><small>${h(g.etiqueta || 'Guía')}</small><strong>${h(g.titulo)}</strong>
        ${g.pasos ? cinta(Math.round((g.logrados / g.pasos) * 100), `${g.logrados} de ${g.pasos} pasos`) : ''}</div>
        ${g.pdf ? `<a class="boton-descarga" href="${h(api.urlApi('guia/pdf', { id: g.id }))}" aria-label="Descargar ${h(g.titulo)}">${icono('descargar')}</a>` : ''}
        <a class="btn btn-turq btn-p" href="#/guia/${g.id}">Abrir</a></div>`).join('')}</div>` : ''}
  </div>`;

  activarClases(contenedor, app, () => app.navegar());
  const botonReto = contenedor.querySelector('[data-reto-semana]');
  if (botonReto) {
    botonReto.onclick = async () => {
      const r = await subirFoto({ ruta: 'coleccion', datos: { reto_semana_id: rs.id }, titulo: rs.titulo, encabezado: '¡Muestra tu reto de la semana!' });
      if (r) { await app.premio(r.premio); app.navegar(); }
    };
  }
}
