/**
 * Mis logros: perfil, nivel, estrellas, insignias y colección de creaciones.
 */
import * as api from '../../comun/api.js';
import { h, icono, cinta, discoInsignia, ventana, confirmar, avisoError, aviso, conCarga, COLORES } from '../../comun/ui.js';
import { subirFoto } from '../fotos.js';
import { compartirFoto, compartirArchivo, descargar, presentacion } from '../compartir.js';
import { elegirCopia } from './acceso.js';

const img = (r) => h(api.url(r));
const PERSONAJES = { walela: 'Walela', lalo: 'Lalo', lala: 'Lala' };

export async function vistaLogros({ app, contenedor }) {
  const d = await api.get('logros');
  app.fijarEstudiante(d.estudiante);
  const e = d.estudiante;
  const n = e.nivel;
  const faltan = n.siguiente ? n.siguiente.min - e.estrellas : 0;
  const grado = e.grado && e.grado !== 'Otro' ? `${e.grado} de primaria` : '';

  const insignias = d.insignias.map((ins, k) => {
    const estado = ins.ganada ? 'ganada' : ins.actual > 0 ? 'progreso' : 'cerrada';
    const sub = ins.ganada ? '¡Ganada!' : ins.actual > 0 && ins.meta > 1 ? `${ins.actual} de ${ins.meta}` : 'Por ganar';
    return `<button type="button" class="insignia ${estado}" data-ins="${k}"><span class="disco">${discoInsignia(ins)}${estado === 'cerrada' ? `<span class="candado">${icono('candado', 18)}</span>` : ''}</span>
      <strong>${h(ins.nombre)}</strong><small>${sub}</small></button>`;
  }).join('');

  const fotos = d.coleccion.map((f, k) => `<div class="foto-card"><button type="button" class="ver" data-foto="${k}" aria-label="Ver ${h(f.titulo)}"><img src="${img(f.imagen)}" alt="" loading="lazy"></button>
    <div class="pie"><strong>${h(f.titulo)}</strong><small>${f.reto ? h(f.reto) + ' · ' : ''}${h(f.fecha)}</small></div></div>`);
  const huecos = Math.max(0, 3 - fotos.length);

  contenedor.innerHTML = `
    <section class="perfil-cabeza">
      <span class="grande"><img src="${img(e.avatar)}" alt="Avatar de ${h(e.nombre)}"></span>
      <button type="button" class="editar" data-editar aria-label="Cambiar mi personaje y color">${icono('editar', 20)}</button>
      <div class="datos">
        <h1>${h(e.nombre)}</h1>
        <span class="detalle">${h(e.edad >= 13 ? '13 años o más' : e.edad + ' años')}${grado ? ' · ' + h(grado) : ''} · Equipo ${h(PERSONAJES[e.personaje] || 'Walela')}</span>
        <div class="nivel"><strong>Nivel ${n.numero} · ${h(n.nombre)}</strong><span>${n.siguiente ? `${e.estrellas} / ${n.siguiente.min}` : `${e.estrellas} estrellas`}</span></div>
        ${cinta(n.porcentaje)}
        <span class="detalle" style="font-size:14px">${n.siguiente ? `Te faltan ${faltan} estrella${faltan === 1 ? '' : 's'} para ser <strong>${h(n.siguiente.nombre)}</strong>.` : '¡Llegaste al nivel más alto! Eres una estrella.'}</span>
      </div>
      <img class="walela" src="${img('assets/img/personajes/walela-guino.webp')}" alt="">
      <div class="burbuja">${h(d.mensaje)}</div>
    </section>
    <div class="cifras">
      <div class="cifra"><span class="ico" style="background:var(--amar-s)">${icono('estrella', 30, 'style="color:#F2A93B"')}</span><div><b>${d.stats.estrellas}</b><span>estrellas</span></div></div>
      <div class="cifra"><span class="ico" style="background:var(--rosa-s);color:var(--fucsia-f)">${icono('medalla', 28)}</span><div><b>${d.stats.insignias} <small>de ${d.stats.insignias_total}</small></b><span>insignias</span></div></div>
      <div class="cifra"><span class="ico" style="background:var(--turq-s);color:var(--turq-f)">${icono('check', 28, 'style="stroke-width:2.8"')}</span><div><b>${d.stats.retos}</b><span>retos completados</span></div></div>
    </div>
    <div class="seccion-titulo"><h2>Mis insignias</h2>${d.stats.racha > 1 ? `<span class="chip" style="background:var(--amar-s);color:var(--amar-f)">${icono('estrella', 16, 'style="color:#F2A93B"')} ${d.stats.racha} días seguidos</span>` : ''}</div>
    <div class="insignias">${insignias || '<p>Tu profe pronto creará insignias.</p>'}</div>
    <div class="seccion-titulo"><h2>Mi colección</h2><span class="ayuda">Sube fotos de lo que creas con tu kit</span></div>
    <div class="coleccion">
      <button type="button" class="subir-foto" data-subir><span>${icono('foto', 30)}</span>Subir una foto</button>
      ${fotos.join('')}${'<div class="hueco">Tu próxima creación</div>'.repeat(huecos)}
    </div>
    ${d.movimientos.length ? `<div class="seccion-titulo"><h2>Así gané mis estrellas</h2></div>
    <div class="historial">${d.movimientos.map((m) => `<div><span>${h(m.motivo)} <small style="color:var(--tinta-4)">· ${h(m.fecha)}</small></span><b class="${m.cantidad < 0 ? 'menos' : ''}">${m.cantidad > 0 ? '+' : ''}${m.cantidad} ★</b></div>`).join('')}</div>` : ''}
    <section class="respaldo">
      <span class="ico">${icono('escudo', 30)}</span>
      <div class="txt"><h2>Tu progreso vive en este dispositivo</h2>
        <p>Se guarda en este navegador. Para seguir en otro celular, tablet o computador, guarda una copia y ábrela allá con «Traer mi progreso». Tu profe también puede ver tu avance con la copia.</p></div>
      <div class="acciones">
        <button type="button" class="btn btn-borde btn-p" data-copia>${icono('descargar', 18)} Guardar una copia</button>
        <button type="button" class="btn btn-turq btn-p" data-copia-profe>${icono('chat', 18)} Enviar copia a mi profe</button>
        <button type="button" class="btn btn-plano btn-p" data-traer>Traer una copia</button>
      </div>
    </section>`;

  contenedor.querySelectorAll('[data-ins]').forEach((b) => {
    b.onclick = () => {
      const ins = d.insignias[Number(b.dataset.ins)];
      ventana(`<div class="celebra"><div class="medalla" style="${ins.ganada ? '' : 'filter:grayscale(.8);opacity:.7'}">${discoInsignia(ins)}</div>
        <h2 style="color:var(--tinta)">${h(ins.nombre)}</h2><p style="font-size:17px;font-weight:700;color:var(--tinta-3)">${h(ins.descripcion || '')}</p>
        ${ins.ganada ? `<p class="chip" style="background:var(--turq-s);color:var(--turq-f)">${icono('check', 16)} La ganaste el ${h(ins.fecha)}</p>`
          : ins.meta > 1 ? `<div style="width:100%">${cinta(Math.round((ins.actual / ins.meta) * 100), `${ins.actual} de ${ins.meta}`)}</div>` : '<p class="chip">¡Sigue creando para ganarla!</p>'}</div>`);
    };
  });

  contenedor.querySelectorAll('[data-foto]').forEach((b) => {
    b.onclick = () => {
      const f = d.coleccion[Number(b.dataset.foto)];
      const { caja, cerrar } = ventana(`<h2>${h(f.titulo)}</h2>
        <img src="${img(f.imagen)}" alt="${h(f.titulo)}" style="width:100%;max-height:60vh;object-fit:contain;border-radius:20px;background:var(--crema);margin:10px 0">
        ${f.reto ? `<p class="ayuda">Reto: ${h(f.reto)}</p>` : ''}
        <div class="acciones" style="justify-content:flex-end;margin-top:16px"><button type="button" class="btn btn-borde fucsia btn-p" data-borrar style="margin-right:auto">${icono('basura', 18)} Borrar</button>
          <button type="button" class="btn btn-borde btn-p" data-bajar>${icono('descargar', 18)} Descargar</button>
          <button type="button" class="btn btn-turq btn-p" data-enviar>${icono('chat', 18)} Enviar a mi profe</button></div>`, { clase: 'ancha' });
      caja.querySelector('[data-bajar]').onclick = () => descargar(f.imagen, (f.titulo || 'mi-creacion').replace(/[^\p{L}\p{N} -]/gu, '').trim() + '.jpg');
      caja.querySelector('[data-enviar]').onclick = () => compartirFoto({ url: f.imagen, titulo: f.titulo }).catch((err) => avisoError(err));
      caja.querySelector('[data-borrar]').onclick = async () => {
        cerrar();
        if (!(await confirmar('¿Borrar esta foto?', 'Se quitará de tu colección para siempre.', { si: 'Sí, borrar', peligro: true }))) return;
        try { await api.post('coleccion/eliminar', { id: f.id }); aviso('Foto borrada', 'bien'); app.navegar(); } catch (e) { avisoError(e); }
      };
    };
  });

  contenedor.querySelector('[data-subir]').onclick = async () => {
    const r = await subirFoto({ ruta: 'coleccion' });
    if (r) { aviso('¡Foto guardada en tu colección!', 'bien'); await app.premio(r.premio); app.navegar(); }
  };

  const copia = async () => {
    const r = await api.get('cuenta/exportar');
    return { blob: new Blob([JSON.stringify(r.copia)], { type: 'application/json' }), nombre: r.nombre };
  };
  contenedor.querySelector('[data-copia]').onclick = (ev) => conCarga(ev.currentTarget, async () => {
    try { const c = await copia(); descargar(c.blob, c.nombre); aviso('¡Copia guardada! Búscala en tus descargas.', 'bien'); } catch (err) { avisoError(err); }
  });
  contenedor.querySelector('[data-copia-profe]').onclick = (ev) => conCarga(ev.currentTarget, async () => {
    try {
      const c = await copia();
      await compartirArchivo({ blob: c.blob, nombre: c.nombre, texto: `¡Hola, profe! ${presentacion()} Te envío la copia de mi progreso en el campus.` });
    } catch (err) { avisoError(err); }
  });
  contenedor.querySelector('[data-traer]').onclick = () => elegirCopia(app);

  contenedor.querySelector('[data-editar]').onclick = () => {
    const sel = { personaje: e.personaje, color: e.color };
    const { caja, cerrar } = ventana(`<h2>Cambia tu estilo</h2>
      <p class="ayuda" style="margin-bottom:14px">Elige tu compañero de aventuras y tu color favorito.</p>
      <div class="personajes" role="radiogroup" style="grid-template-columns:repeat(3,minmax(0,1fr))">${Object.entries(PERSONAJES).map(([id, nombre]) => `
        <button type="button" class="personaje" role="radio" aria-checked="${id === sel.personaje}" data-p="${id}" style="flex-direction:column;text-align:center">
        <span class="foto"><img src="${img('assets/img/personajes/avatar-' + id + '.webp')}" alt=""></span><strong>${nombre}</strong>
        <span class="marca">${icono('check', 18, 'style="stroke-width:3"')}</span></button>`).join('')}</div>
      <div class="colores" role="radiogroup" style="margin:18px 0">${Object.entries(COLORES).map(([k, c]) => `<button type="button" class="color" role="radio" aria-checked="${k === sel.color}" aria-label="${c.nombre}" data-c="${k}" style="background:${c.fuerte}"></button>`).join('')}</div>
      <div class="acciones" style="justify-content:flex-end"><button type="button" class="btn" data-guardar>Guardar</button></div>`);
    caja.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => { sel.personaje = b.dataset.p; caja.querySelectorAll('[data-p]').forEach((x) => x.setAttribute('aria-checked', String(x === b))); }));
    caja.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => { sel.color = b.dataset.c; caja.querySelectorAll('[data-c]').forEach((x) => x.setAttribute('aria-checked', String(x === b))); }));
    const g = caja.querySelector('[data-guardar]');
    g.onclick = () => conCarga(g, async () => {
      try {
        const r = await api.post('perfil', sel);
        app.fijarEstudiante(r.estudiante);
        cerrar();
        aviso('¡Tu nuevo estilo quedó guardado!', 'bien');
        app.navegar();
      } catch (err) { avisoError(err); }
    });
  };
}
