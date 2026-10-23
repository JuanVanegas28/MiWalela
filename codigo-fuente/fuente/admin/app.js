/**
 * Panel de la profe (versión sin servidor): menú, navegación, edición y publicación.
 * Todo se edita en un borrador en este navegador; «Publicar» genera datos/contenido.js.
 */
import * as api from '../comun/api.js';
import { h, icono, aviso, avisoError, cargando, conCarga, confirmar, ventana } from '../comun/ui.js';
import { formulario, activarFormulario } from './formularios.js';
import * as contenido from './vistas-contenido.js';
import * as vistas from './vistas-panel.js';
import { crearServidorAdmin, iniciarBorrador, hayCambios, estadoBorrador, textoPublicacion, marcarExportado, archivosPorCopiar, enlaceSubidaGithub } from '../local/rutas-admin.js';
import { CLAVE_PREVIA } from '../local/contenido.js';

api.configurar(crearServidorAdmin());

const RUTAS = [
  { patron: /^\/resumen$/, vista: vistas.vistaResumen, menu: 'resumen', titulo: 'Resumen' },
  { patron: /^\/cursos$/, vista: contenido.vistaCursos, menu: 'cursos', titulo: 'Cursos' },
  { patron: /^\/curso\/(\d+|nuevo)$/, vista: contenido.vistaCurso, menu: 'cursos', titulo: 'Curso' },
  { patron: /^\/guias$/, vista: contenido.vistaGuias, menu: 'guias', titulo: 'Guías' },
  { patron: /^\/guia\/(\d+|nueva)$/, vista: contenido.vistaGuia, menu: 'guias', titulo: 'Guía' },
  { patron: /^\/clases$/, vista: contenido.vistaClases, menu: 'clases', titulo: 'Clases en vivo' },
  { patron: /^\/retos-semana$/, vista: contenido.vistaRetosSemana, menu: 'retos-semana', titulo: 'Reto de la semana' },
  { patron: /^\/insignias$/, vista: contenido.vistaInsignias, menu: 'insignias', titulo: 'Insignias' },
  { patron: /^\/niveles$/, vista: contenido.vistaNiveles, menu: 'niveles', titulo: 'Niveles' },
  { patron: /^\/progreso$/, vista: vistas.vistaProgreso, menu: 'progreso', titulo: 'Progreso de un niño' },
  { patron: /^\/ajustes$/, vista: vistas.vistaAjustes, menu: 'ajustes', titulo: 'Ajustes' },
];

const MENU = [
  ['General', [['resumen', 'Resumen y publicar', 'casa']]],
  ['Contenido', [['cursos', 'Cursos y sesiones', 'tijeras'], ['guias', 'Guías', 'libro'], ['clases', 'Clases en vivo', 'camara'], ['retos-semana', 'Reto de la semana', 'trofeo']]],
  ['Juego', [['insignias', 'Insignias', 'medalla'], ['niveles', 'Niveles', 'estrella']]],
  ['Familias', [['progreso', 'Progreso de un niño', 'usuario']]],
  ['Sistema', [['ajustes', 'Ajustes', 'escudo']]],
];

export const panel = {
  admin: { id: 1, nombre: 'Profe' },
  aviso: null,
  navegando: 0,

  async iniciar() {
    document.getElementById('app').innerHTML = cargando('Abriendo el panel…');
    if (!window.MIWALELA_CONTENIDO) {
      document.getElementById('app').innerHTML = `<div class="vacio-p" style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px">
        <h2>No encontramos el contenido del campus</h2><p>Revisa que exista el archivo <b>campus/datos/contenido.js</b> en el repositorio.</p></div>`;
      return;
    }
    try {
      this.aviso = await iniciarBorrador();
    } catch (e) {
      document.getElementById('app').innerHTML = `<div class="vacio-p" style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px">
        <h2>No pudimos abrir el panel</h2><p>${h(e.message)}</p></div>`;
      return;
    }
    window.addEventListener('hashchange', () => this.navegar());
    window.addEventListener('miwalela:borrador', () => this.pintarEstado());
    this.navegar();
  },

  ir(ruta) { if (location.hash === '#' + ruta) this.navegar(); else location.hash = ruta; },

  async navegar() {
    const crudo = decodeURIComponent(location.hash.replace(/^#/, '')) || '/';
    const [camino, consulta = ''] = crudo.split('?');
    const query = new URLSearchParams(consulta);
    const turno = ++this.navegando;
    let def = null;
    let params = [];
    for (const r of RUTAS) { const m = camino.match(r.patron); if (m) { def = r; params = m.slice(1); break; } }
    if (!def) return this.ir('/resumen');
    document.querySelectorAll('.velo').forEach((v) => v.remove());
    document.body.style.overflow = '';
    const cont = this.estructura(def.menu);
    cont.innerHTML = cargando();
    document.title = def.titulo + ' · Panel de la profe';
    window.scrollTo(0, 0);
    this.pintarEstado();
    try {
      await def.vista({ panel: this, contenedor: cont, params, query });
    } catch (e) {
      if (turno !== this.navegando) return;
      cont.innerHTML = `<div class="caja vacio-p"><h2>Ups</h2><p>${h(e.message)}</p><button class="btn" data-r>Intentar de nuevo</button></div>`;
      cont.querySelector('[data-r]').onclick = () => this.navegar();
    }
  },

  estructura(activo) {
    let raiz = document.querySelector('#app > .panel');
    if (!raiz) {
      document.getElementById('app').innerHTML = `
      <div class="p-movil"><button type="button" class="btn-mini" data-abrir aria-label="Abrir menú">☰</button><img src="${h(api.url('assets/img/marca/logo-miwalela.webp'))}" alt="MiWalela">
        <button type="button" class="btn btn-p" data-publicar style="margin-left:auto">${icono('enviar', 18)} Publicar</button></div>
      <div class="panel">
        <nav class="p-menu" aria-label="Menú del panel">
          <a class="p-logo" href="#/resumen"><img src="${h(api.url('assets/img/marca/logo-miwalela.webp'))}" alt="MiWalela"><span>Panel de la profe</span></a>
          <div class="p-enlaces">${MENU.map(([grupo, items]) => `<small>${grupo}</small>` + items.map(([id, txt, ic]) => `<a class="p-enlace" data-m="${id}" href="#/${id}">${icono(ic, 20)}${txt}</a>`).join('')).join('')}</div>
          <div class="p-pie"><div data-estado></div>
            <div class="fila"><button type="button" class="btn btn-borde btn-p" data-previa>${icono('ojo', 18)} Ver en el campus</button><button type="button" class="btn btn-p" data-publicar>Publicar</button></div></div>
        </nav>
        <main class="p-principal" id="vista" tabindex="-1"></main>
      </div>`;
      raiz = document.querySelector('#app > .panel');
      document.querySelectorAll('[data-publicar]').forEach((b) => (b.onclick = () => this.publicar()));
      raiz.querySelector('[data-previa]').onclick = () => this.verEnCampus();
      const menu = raiz.querySelector('.p-menu');
      document.querySelector('[data-abrir]').onclick = () => menu.classList.toggle('abierto');
      menu.addEventListener('click', (e) => { if (e.target.closest('a')) menu.classList.remove('abierto'); });
    }
    raiz.querySelectorAll('.p-enlace').forEach((a) => a.classList.toggle('activo', a.dataset.m === activo));
    return document.getElementById('vista');
  },

  /** Estado del borrador: ¿hay cambios por publicar? */
  estado() {
    const b = estadoBorrador();
    if (!hayCambios()) return { clase: 'si', texto: 'Todo publicado', detalle: 'El campus tiene lo mismo que ves aquí.' };
    if (b.exportado_en && !b.cambios) return { clase: 'listo', texto: 'Listo para subir', detalle: 'Guardaste contenido.js: súbelo a GitHub.' };
    return { clase: 'no', texto: 'Cambios sin publicar', detalle: 'Toca «Publicar» cuando termines.' };
  },

  pintarEstado() {
    const caja = document.querySelector('[data-estado]');
    if (!caja) return;
    const e = this.estado();
    caja.innerHTML = `<strong class="estado-borrador ${e.clase}">${h(e.texto)}</strong><span>${h(e.detalle)}</span>`;
  },

  /** Abre el campus usando el borrador (solo en este navegador). */
  verEnCampus(ruta = '#/inicio') {
    try { localStorage.setItem(CLAVE_PREVIA, '1'); } catch { /* nada */ }
    const w = window.open(api.url('index.html') + ruta, 'miwalela-campus');
    if (!w) location.href = api.url('index.html') + ruta;
    else aviso('Abrimos el campus con tus cambios. Si ya estaba abierto, recárgalo.', 'bien');
  },

  /** Guarda contenido.js (en Descargas, o donde elija la profe si el navegador lo permite) y explica cómo subirlo. */
  async publicar() {
    const { texto, fecha } = textoPublicacion();
    const blob = new Blob([texto], { type: 'text/javascript;charset=utf-8' });
    let modo = 'descarga';
    if (window.showSaveFilePicker) {
      try {
        const archivo = await window.showSaveFilePicker({
          suggestedName: 'contenido.js', id: 'miwalela-datos', startIn: 'documents',
          types: [{ description: 'Contenido del campus', accept: { 'text/javascript': ['.js'] } }],
        });
        const w = await archivo.createWritable();
        await w.write(blob);
        await w.close();
        modo = archivo.name === 'contenido.js' ? 'carpeta' : 'otro-nombre';
      } catch (e) {
        if (e && e.name === 'AbortError') return;
        modo = 'descarga';
      }
    }
    if (modo === 'descarga') {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'contenido.js';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    }
    await marcarExportado(fecha);
    this.pintarEstado();
    const copiar = archivosPorCopiar();
    const subirDatos = enlaceSubidaGithub('campus/datos');
    const subirMedia = enlaceSubidaGithub('campus/assets/media');
    const boton = (url, texto) => (url ? `<a class="btn btn-borde btn-p" href="${h(url)}" target="_blank" rel="noopener" style="margin-top:8px">${icono('flecha', 18)} ${texto}</a>` : '');
    ventana(`<h2>¡Contenido listo para publicar!</h2>
      <ol class="pasos-publicar">
        <li>${modo === 'carpeta' ? 'Guardaste <b>contenido.js</b>.'
          : `El archivo <b>contenido.js</b> quedó en tu carpeta de <b>Descargas</b>${modo === 'otro-nombre' ? ' (con otro nombre: cámbialo a <b>contenido.js</b>)' : ''}.`}</li>
        <li>Súbelo a <b>GitHub</b>, en la carpeta <code>campus/datos</code>, para reemplazar el anterior: <b>Add file → Upload files</b>, arrastra el archivo y toca <b>Commit changes</b>.<br>${boton(subirDatos, 'Abrir campus/datos en GitHub')}</li>
        ${copiar.length ? `<li>Sube también estos archivos a <code>campus/assets/media</code>:<ul>${copiar.map((r) => `<li><code>${h(r.replace(/^assets\/media\//, ''))}</code></li>`).join('')}</ul>${boton(subirMedia, 'Abrir campus/assets/media en GitHub')}</li>` : ''}
        <li><b>Vercel</b> publica los cambios solo, en uno o dos minutos. Después recarga este panel: debe decir «Todo publicado».</li>
      </ol>
      ${subirDatos ? '' : '<p class="nota-p">Tip: escribe tu repositorio de GitHub en <a href="#/ajustes">Ajustes</a> y aquí aparecerán botones que abren la carpeta correcta.</p>'}
      <p class="nota-p" style="margin-top:8px">Tus cambios siguen guardados en este navegador, así que puedes seguir editando cuando quieras. Si trabajas con git, guarda el archivo en <code>campus/datos</code>, haz <i>commit</i> y <i>push</i>.</p>`, { clase: 'grande', alCerrar: () => this.navegar() });
  },

  /**
   * Abre una ventana con el formulario de un contenido y lo guarda.
   * @returns {Promise<object|null>} la fila guardada o null si se canceló
   */
  editar({ recurso, id = null, titulo, campos, valores = {}, fijos = {}, eliminar = false, nota = '' }) {
    return new Promise((resolver) => {
      let resultado = null;
      const { caja, cerrar } = ventana(`<h2>${h(titulo)}</h2>${nota ? `<p class="nota-p">${nota}</p>` : ''}<form class="form" novalidate>${formulario(campos, valores)}
        <div class="pie-form">${id && eliminar ? `<button type="button" class="btn btn-borde fucsia btn-p" data-eliminar style="margin-right:auto">${icono('basura', 18)} Eliminar</button>` : ''}
        <button type="button" class="btn btn-borde btn-p" data-cancelar>Cancelar</button><button type="submit" class="btn btn-p">Guardar</button></div></form>`,
        { clase: 'grande', alCerrar: () => resolver(resultado) });
      const form = caja.querySelector('form');
      const { leer } = activarFormulario(form, campos);
      caja.querySelector('[data-cancelar]').onclick = cerrar;
      const del = caja.querySelector('[data-eliminar]');
      if (del) {
        del.onclick = async () => {
          if (!(await confirmar('¿Eliminar?', typeof eliminar === 'string' ? eliminar : 'Esta acción no se puede deshacer.', { si: 'Sí, eliminar', peligro: true }))) return;
          try {
            await api.post('admin/eliminar', { recurso, id });
            aviso('Eliminado', 'bien');
            resultado = { eliminado: true };
            cerrar();
          } catch (e) { avisoError(e); }
        };
      }
      form.onsubmit = (ev) => {
        ev.preventDefault();
        conCarga(form.querySelector('[type=submit]'), async () => {
          try {
            const datos = { ...leer(), ...fijos };
            campos.forEach((c) => { if (c.antesDeGuardar) c.antesDeGuardar(datos); });
            const r = await api.post('admin/guardar', { recurso, id, datos });
            aviso('¡Guardado!', 'bien');
            resultado = r.fila;
            cerrar();
          } catch (e) {
            avisoError(e);
            if (e.datos && e.datos.campo) form.querySelector(`[name="${e.datos.campo}"]`)?.focus();
          }
        });
      };
    });
  },
};

panel.iniciar();
