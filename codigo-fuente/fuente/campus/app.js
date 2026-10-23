/**
 * MiWalela · Campus MiniDiseñadores
 * Arranque, navegación entre pantallas y estructura con menú.
 */
import * as api from '../comun/api.js';
import { h, icono, aviso, avisoError, color, cargando, debounce, celebrar, confirmar } from '../comun/ui.js';
import * as acceso from './vistas/acceso.js';
import { vistaInicio } from './vistas/inicio.js';
import { vistaCursos, vistaCurso } from './vistas/cursos.js';
import { vistaSesion } from './vistas/sesion.js';
import { vistaGuias, vistaGuia } from './vistas/guias.js';
import { vistaLogros } from './vistas/logros.js';
import { crearServidor } from '../local/servidor.js';
import { rutasAuth } from '../local/rutas-auth.js';
import { rutasCampus } from '../local/rutas-campus.js';
import { tabla, prepararContenidoCampus } from '../local/contenido.js';
import { alCambiarEnOtraPestana, pantallaOcupada } from '../local/sincronia.js';

// Sin servidor: las peticiones las atiende el motor local, que guarda todo en este dispositivo.
api.configurar(crearServidor({ ...rutasAuth, ...rutasCampus }));

const RUTAS = [
  { patron: /^\/entrar$/, vista: acceso.vistaEntrar, tipo: 'publica', titulo: 'Entrar' },
  { patron: /^\/registro$/, vista: acceso.vistaRegistroAdulto, tipo: 'publica', titulo: 'Registro' },
  { patron: /^\/olvide$/, vista: acceso.vistaOlvide, tipo: 'publica', titulo: 'Recuperar contraseña' },
  { patron: /^\/restablecer$/, vista: acceso.vistaRestablecer, tipo: 'publica', titulo: 'Nueva contraseña' },
  { patron: /^\/registro\/perfil$/, vista: acceso.vistaRegistroPerfil, tipo: 'familia', titulo: 'Tu perfil' },
  { patron: /^\/elegir$/, vista: acceso.vistaElegir, tipo: 'familia', titulo: '¿Quién va a crear hoy?' },
  { patron: /^\/registro\/listo$/, vista: acceso.vistaListo, tipo: 'sola', titulo: '¡Bienvenida!' },
  { patron: /^\/inicio$/, vista: vistaInicio, menu: 'inicio', titulo: 'Inicio' },
  { patron: /^\/cursos$/, vista: vistaCursos, menu: 'cursos', titulo: 'Mis cursos' },
  { patron: /^\/curso\/(\d+)$/, vista: vistaCurso, menu: 'cursos', titulo: 'Curso' },
  { patron: /^\/sesion\/(\d+)$/, vista: vistaSesion, menu: 'cursos', titulo: 'Sesión' },
  { patron: /^\/guias$/, vista: vistaGuias, menu: 'guias', titulo: 'Mis guías' },
  { patron: /^\/guia\/(\d+)$/, vista: vistaGuia, menu: 'guias', titulo: 'Guía' },
  { patron: /^\/logros$/, vista: vistaLogros, menu: 'logros', titulo: 'Mis logros' },
];

export const app = {
  estudiante: null,
  familia: null,
  sitio: {},
  limpiar: null,
  navegando: 0,

  async iniciar() {
    document.getElementById('app').innerHTML = cargando('Preparando tu campus…');
    try {
      await prepararContenidoCampus();
      await this.refrescarEstado();
    } catch (e) {
      document.getElementById('app').innerHTML = `<div class="vacio-bonito" style="min-height:100vh;justify-content:center">
        <img src="${h(api.url('assets/img/personajes/walela-piensa.webp'))}" alt=""><h2>No pudimos abrir el campus</h2>
        <p>${h(e.message)}</p><button class="btn" onclick="location.reload()">Intentar de nuevo</button></div>`;
      return;
    }
    window.addEventListener('hashchange', () => this.navegar());
    // Lo que la profe cambie en el panel (otra pestaña) se ve aquí sin recargar.
    alCambiarEnOtraPestana((tipo) => {
      this.cambio = this.cambio === 'contenido' ? 'contenido' : tipo;
      if (document.hidden || !document.hasFocus()) this.aplicarCambio();
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.aplicarCambio(); });
    this.activarPdfs();
    this.navegar();
  },

  cambio: null,
  async aplicarCambio({ pintar = true } = {}) {
    if (!this.cambio || (pintar && pantallaOcupada())) return;
    const tipo = this.cambio;
    this.cambio = null;
    try {
      if (tipo === 'contenido') await prepararContenidoCampus();
      await this.refrescarEstado();
    } catch { /* se intenta en la próxima pantalla */ }
    if (pintar) this.navegar({ conservarScroll: true });
  },

  async refrescarEstado() {
    const est = await api.get('auth/estado');
    api.fijarCsrf(est.csrf);
    this.sitio = est.sitio || {};
    const ayuda = document.querySelector('.menu-ayuda');
    if (ayuda) {
      ayuda.querySelector('p').textContent = this.sitio.mensaje_ayuda || 'Walela y tu profe te ayudan.';
      ayuda.querySelector('a').href = this.sitio.whatsapp ? `https://wa.me/${encodeURIComponent(this.sitio.whatsapp)}` : '#';
    }

    this.familia = est.familia;
    this.fijarEstudiante(est.estudiante);
    return est;
  },

  fijarEstudiante(e) {
    this.estudiante = e;

    const c = color(e ? e.color : 'fucsia');
    document.documentElement.style.setProperty('--kid', c.fuerte);
    document.documentElement.style.setProperty('--kid-s', c.suave);
    this.pintarDatosBarra();
  },

  /** Actualiza estrellas/nivel después de un premio. */
  alPremio(premio) {
    if (!this.estudiante || !premio) return;
    this.estudiante.estrellas = premio.total;
    if (premio.nivel) this.estudiante.nivel = premio.nivel;
    this.pintarDatosBarra(true);
  },

  premio(premio) { return celebrar(premio, (p) => this.alPremio(p)); },

  ir(ruta) {
    if (location.hash === '#' + ruta) this.navegar();
    else location.hash = ruta;
  },

  ruta() {
    const crudo = decodeURIComponent(location.hash.replace(/^#/, '')) || '/';
    const [camino, consulta = ''] = crudo.split('?');
    return { camino: camino || '/', query: new URLSearchParams(consulta) };
  },

  async navegar({ conservarScroll = false } = {}) {
    if (this.cambio) await this.aplicarCambio({ pintar: false });
    const { camino, query } = this.ruta();
    const turno = ++this.navegando;
    const y = window.scrollY;
    if (camino === '/' || camino === '') {
      return this.ir(this.estudiante ? '/inicio' : this.familia ? (this.familia.estudiantes.length ? '/elegir' : '/registro/perfil') : '/entrar');
    }
    let def = null;
    let params = [];
    for (const r of RUTAS) {
      const m = camino.match(r.patron);
      if (m) { def = r; params = m.slice(1); break; }
    }
    if (!def) return this.ir(this.estudiante ? '/inicio' : '/entrar');

    // Reglas de acceso
    const entrarProfe = camino === '/entrar' && query.get('como') === 'profe';
    if (def.tipo === 'publica' && this.estudiante && camino !== '/restablecer' && !entrarProfe) return this.ir('/inicio');
    if (def.tipo === 'familia' && !this.familia) return this.ir(this.estudiante ? '/inicio' : '/entrar');
    if ((!def.tipo || def.tipo === 'sola') && !this.estudiante) return this.ir(this.familia ? '/elegir' : '/entrar');

    if (this.limpiar) { try { this.limpiar(); } catch { /* nada */ } this.limpiar = null; }
    document.querySelectorAll('.velo').forEach((v) => v.remove());
    document.body.style.overflow = '';

    let contenedor;
    if (def.menu) {
      contenedor = this.montarEstructura(def.menu);
      contenedor.innerHTML = cargando();
    } else {
      this.estructura = null;
      contenedor = document.getElementById('app');
      contenedor.innerHTML = cargando();
    }
    document.title = def.titulo + ' · MiWalela';
    if (!conservarScroll) window.scrollTo(0, 0);
    try {
      const limpiar = await def.vista({ app: this, contenedor, params, query });
      if (turno !== this.navegando) { if (typeof limpiar === 'function') limpiar(); return; }
      this.limpiar = typeof limpiar === 'function' ? limpiar : null;
      if (conservarScroll) window.scrollTo(0, y);
      else if (def.menu) contenedor.focus({ preventScroll: true });
    } catch (e) {
      if (turno !== this.navegando) return;
      if (e.estado === 401) {
        await this.refrescarEstado().catch(() => {});
        aviso('Tu sesión terminó. Entra de nuevo.', 'mal');
        return this.ir('/entrar');
      }
      contenedor.innerHTML = `<div class="vacio-bonito"><img src="${h(api.url('assets/img/personajes/walela-piensa.webp'))}" alt="">
        <h2>¡Ups!</h2><p>${h(e.message)}</p><div class="acciones" style="justify-content:center">
        <button class="btn btn-borde" data-atras>${icono('izquierda', 20)} Volver</button><button class="btn" data-reintentar>Intentar de nuevo</button></div></div>`;
      contenedor.querySelector('[data-reintentar]').onclick = () => this.navegar();
      contenedor.querySelector('[data-atras]').onclick = () => history.back();
    }
  },

  /** Menú lateral + barra superior (se construye una sola vez). */
  montarEstructura(activo) {
    let raiz = document.querySelector('#app > .app');
    if (!raiz) {
      const e = this.estudiante;
      const wa = this.sitio.whatsapp ? `https://wa.me/${encodeURIComponent(this.sitio.whatsapp)}` : '#';
      document.getElementById('app').innerHTML = `
      <div class="app">
        <nav class="menu" aria-label="Menú principal">
          <a class="menu-logo" href="#/inicio" aria-label="Ir al inicio"><img src="${h(api.url('assets/img/marca/logo-miwalela.webp'))}" alt="MiWalela"><span>Campus MiniDiseñadores</span></a>
          <div class="menu-enlaces">
            <a class="menu-enlace" data-m="inicio" href="#/inicio"><span class="ico">${icono('casa')}</span>Inicio</a>
            <a class="menu-enlace" data-m="cursos" href="#/cursos"><span class="ico">${icono('tijeras')}</span>Mis cursos</a>
            <a class="menu-enlace" data-m="guias" href="#/guias"><span class="ico">${icono('libro')}</span>Mis guías</a>
            <a class="menu-enlace" data-m="logros" href="#/logros"><span class="ico">${icono('trofeo')}</span>Mis logros</a>
          </div>
          <div class="menu-espacio"></div>
          <div class="menu-ayuda">
            <img src="${h(api.url('assets/img/personajes/walela-piensa.webp'))}" alt="">
            <strong>¿Tienes una duda?</strong>
            <p>${h(this.sitio.mensaje_ayuda || 'Walela y tu profe te ayudan.')}</p>
            <a class="btn btn-turq" href="${h(wa)}" target="_blank" rel="noopener">${icono('chat', 18)} Pregúntale a tu profe</a>
          </div>
          <div class="menu-perfil">
            <a class="avatar" href="#/logros" aria-label="Ver mi perfil"><img data-avatar src="${h(api.url(e.avatar))}" alt=""></a>
            <a class="datos" href="#/logros"><strong data-nombre>${h(e.nombre)}</strong><span data-nivel>${h(e.nivel.nombre)}</span></a>
            <button type="button" data-salir aria-label="Cerrar sesión">${icono('salir', 20)}</button>
          </div>
        </nav>
        <div class="principal">
          <header class="barra">
            <img class="logo-movil" src="${h(api.url('assets/img/marca/logo-miwalela.webp'))}" alt="MiWalela">
            <div class="buscador" role="search">
              <label for="buscar" class="solo-lector">Buscar</label>
              ${icono('buscar')}
              <input id="buscar" type="search" autocomplete="off" placeholder="Busca cursos, guías o videos" aria-controls="resultados">
              <div class="resultados" id="resultados" hidden></div>
            </div>
            <div class="barra-espacio"></div>
            <a class="pastilla-estrellas" href="#/logros" data-estrellas>${icono('estrella', 22, 'style="color:#F2A93B"')}<span>0 estrellas</span></a>
            <div class="campana">
              <button type="button" data-campana aria-label="Notificaciones" aria-expanded="false">${icono('campana')}<span class="punto" data-punto hidden></span></button>
              <div class="panel-notis" data-panel hidden></div>
            </div>
            <button type="button" class="btn btn-icono btn-borde salir-movil" data-salir aria-label="Cerrar sesión">${icono('salir', 20)}</button>
          </header>
          <main id="vista" tabindex="-1"></main>
        </div>
      </div>`;
      raiz = document.querySelector('#app > .app');
      raiz.querySelectorAll('[data-salir]').forEach((b) => (b.onclick = () => this.salir()));
      this.activarBuscador(raiz);
      this.activarCampana(raiz);
      this.pintarDatosBarra();
    }
    raiz.querySelectorAll('.menu-enlace').forEach((a) => {
      const on = a.dataset.m === activo;
      a.classList.toggle('activo', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    return document.getElementById('vista');
  },

  pintarDatosBarra(animar = false) {
    const e = this.estudiante;
    const raiz = document.querySelector('#app > .app');
    if (!raiz || !e) return;
    const p = raiz.querySelector('[data-estrellas]');
    p.querySelector('span').innerHTML = `${e.estrellas}<span class="palabra"> estrella${e.estrellas === 1 ? '' : 's'}</span>`;
    p.setAttribute('aria-label', `${e.estrellas} estrellas: ver mis logros`);
    if (animar) { p.classList.remove('brinca'); void p.offsetWidth; p.classList.add('brinca'); }
    raiz.querySelector('[data-nivel]').textContent = e.nivel.nombre;
    raiz.querySelector('[data-nombre]').textContent = e.nombre;
    raiz.querySelector('[data-avatar]').src = api.url(e.avatar);
    const punto = raiz.querySelector('[data-punto]');
    punto.hidden = !e.notificaciones;
    punto.textContent = e.notificaciones > 9 ? '9+' : String(e.notificaciones || '');
    raiz.querySelector('[data-campana]').setAttribute('aria-label', e.notificaciones ? `Notificaciones: ${e.notificaciones} nuevas` : 'Notificaciones');
  },

  activarBuscador(raiz) {
    const entrada = raiz.querySelector('#buscar');
    const caja = raiz.querySelector('#resultados');
    const ICON = { curso: ['tijeras', '#EDE5F4', '#6A4C9C'], video: ['camara', '#FDE6EC', '#C2386A'], reto: ['chispa', '#FFF1D6', '#8A5A12'], guia: ['libro', '#DDF0EC', '#1F7F80'] };
    const buscar = debounce(async () => {
      const q = entrada.value.trim();
      if (q.length < 2) { caja.hidden = true; return; }
      try {
        const r = await api.get('buscar', { q });
        caja.innerHTML = r.resultados.length ? r.resultados.map((x) => {
          const [ic, fondo, tinta] = ICON[x.tipo] || ICON.reto;
          return `<a class="resultado" href="${h(x.enlace)}"><span class="ico" style="background:${fondo};color:${tinta}">${icono(ic, 20)}</span><span><strong>${h(x.titulo)}</strong><small>${h(x.detalle || '')}</small></span></a>`;
        }).join('') : `<div class="vacio">No encontramos «${h(q)}». Prueba con otra palabra.</div>`;
        caja.hidden = false;
      } catch (e) { caja.hidden = true; }
    }, 260);
    entrada.addEventListener('input', buscar);
    entrada.addEventListener('focus', () => { if (caja.innerHTML && entrada.value.trim().length > 1) caja.hidden = false; });
    entrada.addEventListener('keydown', (e) => { if (e.key === 'Escape') { caja.hidden = true; entrada.blur(); } if (e.key === 'ArrowDown') { const p = caja.querySelector('a'); if (p) { e.preventDefault(); p.focus(); } } });
    caja.addEventListener('click', () => { caja.hidden = true; entrada.value = ''; });
    document.addEventListener('click', (e) => { if (!e.target.closest('.buscador')) caja.hidden = true; });
  },

  activarCampana(raiz) {
    const boton = raiz.querySelector('[data-campana]');
    const panel = raiz.querySelector('[data-panel]');
    const ICON = { insignia: 'medalla', respuesta: 'chat', foto: 'foto', estrellas: 'estrella', bienvenida: 'chispa' };
    boton.onclick = async () => {
      const abrir = panel.hidden;
      panel.hidden = !abrir;
      boton.setAttribute('aria-expanded', String(abrir));
      if (!abrir) return;
      panel.innerHTML = '<p style="padding:10px;font-weight:800;color:var(--tinta-3)">Cargando…</p>';
      try {
        const r = await api.get('notificaciones');
        panel.innerHTML = `<h3>Novedades</h3>` + (r.notificaciones.length ? r.notificaciones.map((n) =>
          `<a class="noti ${n.leida ? '' : 'nueva'}" href="${h(n.enlace || '#/inicio')}"><span class="ico">${icono(ICON[n.tipo] || 'chispa', 20)}</span><span><strong>${h(n.titulo)}</strong>${n.texto ? `<small>${h(n.texto)}</small>` : ''}<small>${h(n.fecha)}</small></span></a>`
        ).join('') : '<p style="padding:10px;font-weight:700;color:var(--tinta-3)">Aún no tienes novedades.</p>');
        if (this.estudiante.notificaciones) {
          await api.post('notificaciones/leidas');
          this.estudiante.notificaciones = 0;
          this.pintarDatosBarra();
        }
      } catch (e) { panel.innerHTML = `<p style="padding:10px">${h(e.message)}</p>`; }
    };
    panel.addEventListener('click', (e) => { if (e.target.closest('a')) { panel.hidden = true; boton.setAttribute('aria-expanded', 'false'); } });
    document.addEventListener('click', (e) => { if (!e.target.closest('.campana')) { panel.hidden = true; boton.setAttribute('aria-expanded', 'false'); } });
  },

  /** Los PDF de las guías se abren desde su archivo; al tocarlos se anota la descarga. */
  activarPdfs() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const ver = /#ver$/.test(a.getAttribute('href') || '');
      const href = a.href.replace(/#ver$/, '');
      const guia = tabla('guias').find((g) => g.pdf && api.url(g.pdf) === href);
      if (!guia) return;
      a.target = '_blank';
      a.rel = 'noopener';
      if (!ver) a.setAttribute('download', String(guia.titulo || 'guia').replace(/[^\p{L}\p{N} -]/gu, '').trim() + '.pdf');
      if (this.estudiante) api.post('guia/descargada', { id: guia.id }).catch(() => {});
    });
  },

  async salir() {
    if (!(await confirmar('¿Quieres salir?', 'Podrás volver a entrar con tu usuario y contraseña.', { si: 'Sí, salir', no: 'Me quedo' }))) return;
    try {
      await api.post('auth/salir');
    } catch (e) { avisoError(e); }
    this.estudiante = null;
    this.familia = null;
    document.getElementById('app').innerHTML = '';
    await this.refrescarEstado().catch(() => {});
    this.ir('/entrar');
  },
};

window.addEventListener('unhandledrejection', (e) => { if (e.reason && e.reason.estado !== undefined) { avisoError(e.reason); e.preventDefault(); } });
app.iniciar();
