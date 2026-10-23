/**
 * Panel de la profe: acceso, menú, navegación y edición de contenidos.
 */
import * as api from '../comun/api.js';
import { h, icono, aviso, avisoError, cargando, conCarga, confirmar, ventana } from '../comun/ui.js';
import { formulario, activarFormulario } from './formularios.js';
import * as contenido from './vistas-contenido.js';
import * as comunidad from './vistas-comunidad.js';
import { crearServidorAdmin, iniciarBorrador } from '../local/rutas-admin.js';
import { prepararMedios } from '../local/medios.js';
import { contenido as contenidoActual } from '../local/contenido.js';
import { borrarSesionProfe } from '../local/almacen.js';
import { alCambiarEnOtraPestana, pantallaOcupada } from '../local/sincronia.js';

api.configurar(crearServidorAdmin());

const RUTAS = [
  { patron: /^\/resumen$/, vista: comunidad.vistaResumen, menu: 'resumen', titulo: 'Resumen' },
  { patron: /^\/cursos$/, vista: contenido.vistaCursos, menu: 'cursos', titulo: 'Cursos' },
  { patron: /^\/curso\/(\d+|nuevo)$/, vista: contenido.vistaCurso, menu: 'cursos', titulo: 'Curso' },
  { patron: /^\/guias$/, vista: contenido.vistaGuias, menu: 'guias', titulo: 'Guías' },
  { patron: /^\/guia\/(\d+|nueva)$/, vista: contenido.vistaGuia, menu: 'guias', titulo: 'Guía' },
  { patron: /^\/clases$/, vista: contenido.vistaClases, menu: 'clases', titulo: 'Clases en vivo' },
  { patron: /^\/retos-semana$/, vista: contenido.vistaRetosSemana, menu: 'retos-semana', titulo: 'Reto de la semana' },
  { patron: /^\/insignias$/, vista: contenido.vistaInsignias, menu: 'insignias', titulo: 'Insignias' },
  { patron: /^\/niveles$/, vista: contenido.vistaNiveles, menu: 'niveles', titulo: 'Niveles' },
  { patron: /^\/estudiantes$/, vista: comunidad.vistaEstudiantes, menu: 'estudiantes', titulo: 'Estudiantes' },
  { patron: /^\/estudiante\/(\d+)$/, vista: comunidad.vistaEstudiante, menu: 'estudiantes', titulo: 'Estudiante' },
  { patron: /^\/preguntas$/, vista: comunidad.vistaPreguntas, menu: 'preguntas', titulo: 'Preguntas' },
  { patron: /^\/fotos$/, vista: comunidad.vistaFotos, menu: 'fotos', titulo: 'Fotos de los niños' },
  { patron: /^\/ajustes$/, vista: comunidad.vistaAjustes, menu: 'ajustes', titulo: 'Ajustes' },
  { patron: /^\/exportar$/, vista: comunidad.vistaExportar, menu: 'ajustes', titulo: 'Exportar contenido' },
];

const MENU = [
  ['General', [['resumen', 'Resumen', 'casa']]],
  ['Contenido', [['cursos', 'Cursos y sesiones', 'tijeras'], ['guias', 'Guías', 'libro'], ['clases', 'Clases en vivo', 'camara'], ['retos-semana', 'Reto de la semana', 'trofeo']]],
  ['Comunidad', [['estudiantes', 'Estudiantes', 'usuario'], ['preguntas', 'Preguntas', 'chat'], ['fotos', 'Fotos', 'foto']]],
  ['Juego', [['insignias', 'Insignias', 'medalla'], ['niveles', 'Niveles', 'estrella']]],
  ['Sistema', [['ajustes', 'Ajustes', 'escudo']]],
];

const irAlLogin = () => location.replace(api.url('index.html') + '#/entrar?como=profe');

export const panel = {
  admin: null,
  navegando: 0,

  async iniciar() {
    document.getElementById('app').innerHTML = cargando('Abriendo el panel…');
    try {
      const e = await api.get('admin/estado');
      this.admin = e.admin;
    } catch (err) {
      if (err.estado === 401) return irAlLogin();
      document.getElementById('app').innerHTML = `<div class="vacio-p" style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px">
        <h2>No pudimos abrir el panel</h2><p>${h(err.message)}</p><button class="btn" onclick="location.reload()">Intentar de nuevo</button></div>`;
      return;
    }
    try {
      await iniciarBorrador();
      await prepararMedios(contenidoActual());
    } catch (err) {
      document.getElementById('app').innerHTML = `<div class="vacio-p" style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px">
        <h2>No pudimos abrir el panel</h2><p>${h(err.message)}</p></div>`;
      return;
    }
    window.addEventListener('hashchange', () => this.navegar());
    // Lo que hagan los niños en el campus (otra pestaña) aparece aquí sin recargar.
    alCambiarEnOtraPestana(() => {
      this.contadores();
      this.cambio = true;
      if (document.hidden || !document.hasFocus()) this.aplicarCambio();
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.aplicarCambio(); });
    this.navegar();
  },

  cambio: false,
  aplicarCambio() {
    const vista = document.getElementById('vista');
    if (!this.cambio || !vista || pantallaOcupada(vista)) return;
    this.cambio = false;
    this.navegar({ conservarScroll: true });
  },

  ir(ruta) { if (location.hash === '#' + ruta) this.navegar(); else location.hash = ruta; },

  async navegar({ conservarScroll = false } = {}) {
    this.cambio = false;
    const y = window.scrollY;
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
    if (!conservarScroll) window.scrollTo(0, 0);
    this.contadores();
    try {
      await def.vista({ panel: this, contenedor: cont, params, query });
      if (conservarScroll && turno === this.navegando) window.scrollTo(0, y);
    } catch (e) {
      if (turno !== this.navegando) return;
      if (e.estado === 401) return irAlLogin();
      cont.innerHTML = `<div class="caja vacio-p"><h2>Ups</h2><p>${h(e.message)}</p><button class="btn" data-r>Intentar de nuevo</button></div>`;
      cont.querySelector('[data-r]').onclick = () => this.navegar();
    }
  },

  estructura(activo) {
    let raiz = document.querySelector('#app > .panel');
    if (!raiz) {
      const logo = h(api.url('assets/img/marca/logo-miwalela.webp'));
      document.getElementById('app').innerHTML = `
      <header class="p-movil">
        <button type="button" class="p-hamburguesa" data-abrir aria-label="Abrir menú" aria-expanded="false"><span></span><span></span><span></span></button>
        <a href="#/resumen" class="p-movil-logo"><img src="${logo}" alt="MiWalela"><small>Panel de la profe</small></a>
        <a class="btn-mini" href="${h(api.url('index.html'))}" target="_blank" rel="noopener" aria-label="Ver el campus">${icono('ojo', 18)}</a>
      </header>
      <div class="p-fondo" data-fondo></div>
      <div class="panel">
        <nav class="p-menu" aria-label="Menú del panel">
          <div class="p-menu-cabeza"><a class="p-logo" href="#/resumen"><img src="${logo}" alt="MiWalela"><span>Panel de la profe</span></a>
            <button type="button" class="p-cerrar" data-cerrar aria-label="Cerrar menú">${icono('cerrar', 22)}</button></div>
          <div class="p-enlaces">${MENU.map(([grupo, items]) => `<small>${grupo}</small>` + items.map(([id, txt, ic]) => `<a class="p-enlace" data-m="${id}" href="#/${id}">${icono(ic, 20)}<span>${txt}</span><span class="n" data-n="${id}" hidden></span></a>`).join('')).join('')}</div>
          <div class="p-pie"><strong>${h(this.admin.nombre)}</strong><span>${h(this.admin.correo)}</span>
            <div class="fila"><a class="btn btn-borde btn-p" href="${h(api.url('index.html'))}" target="_blank" rel="noopener">Ver campus</a><button type="button" class="btn btn-p" data-salir>Salir</button></div></div>
        </nav>
        <main class="p-principal" id="vista" tabindex="-1"></main>
      </div>`;
      raiz = document.querySelector('#app > .panel');
      raiz.querySelector('[data-salir]').onclick = async () => {
        if (!(await confirmar('¿Cerrar sesión?', 'Saldrás del panel de la profe.', { si: 'Salir' }))) return;
        borrarSesionProfe();
        irAlLogin();
      };
      const menu = raiz.querySelector('.p-menu');
      const boton = document.querySelector('[data-abrir]');
      const fondo = document.querySelector('[data-fondo]');
      const abrir = (si) => {
        menu.classList.toggle('abierto', si);
        fondo.classList.toggle('visible', si);
        boton.setAttribute('aria-expanded', String(si));
        document.body.classList.toggle('menu-abierto', si);
      };
      boton.onclick = () => abrir(!menu.classList.contains('abierto'));
      fondo.onclick = () => abrir(false);
      menu.querySelector('[data-cerrar]').onclick = () => abrir(false);
      menu.addEventListener('click', (e) => { if (e.target.closest('a')) abrir(false); });
    }
    raiz.querySelectorAll('.p-enlace').forEach((a) => a.classList.toggle('activo', a.dataset.m === activo));
    return document.getElementById('vista');
  },

  async contadores() {
    try {
      const c = await api.get('admin/contadores');
      [['preguntas', c.preguntas], ['fotos', c.fotos]].forEach(([k, n]) => {
        const el = document.querySelector(`[data-n="${k}"]`);
        if (el) { el.hidden = !n; el.textContent = n > 99 ? '99+' : String(n); }
      });
    } catch { /* nada */ }
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
