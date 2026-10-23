/**
 * Pantallas de acceso: entrar, registro en dos pasos, elegir perfil y recuperar contraseña.
 */
import * as api from '../../comun/api.js';
import { h, icono, aviso, avisoError, conCarga, debounce, COLORES, celebrar, ventana } from '../../comun/ui.js';

const img = (r) => h(api.url(r));

function mostrarError(caja, e) {
  caja.innerHTML = `<div class="alerta mal" role="alert">${icono('pregunta', 20)}<span>${h(e.message)}</span></div>`;
  caja.hidden = false;
  if (e.datos && e.datos.campo) {
    const campo = caja.closest('form')?.querySelector(`[name="${e.datos.campo}"]`);
    if (campo) { campo.closest('.campo')?.classList.add('error'); campo.focus(); }
  }
}

function limpiarErrores(form) {
  form.querySelectorAll('.campo.error').forEach((c) => c.classList.remove('error'));
  const caja = form.querySelector('[data-error]');
  if (caja) caja.hidden = true;
}

function redes(sitio) {
  const partes = [];
  if (sitio.instagram) partes.push(`<a href="https://instagram.com/${h(sitio.instagram)}" target="_blank" rel="noopener">${icono('instagram', 20)}@${h(sitio.instagram)}</a>`);
  if (sitio.whatsapp) {
    const n = sitio.whatsapp.replace(/^57/, '');
    partes.push(`<a href="https://wa.me/${h(sitio.whatsapp)}" target="_blank" rel="noopener">${icono('chat', 20)}${h(n.replace(/(\d{3})(\d{3})(\d+)/, '$1 $2 $3'))}</a>`);
  }
  return `<div class="redes">${partes.join('')}</div>`;
}

/* ================= Entrar ================= */
export async function vistaEntrar({ app, contenedor, query }) {
  let rol = query.get('como') === 'profe' ? 'profe' : 'nino';
  let modoProfe = query.get('modo') === 'crear' ? 'crear' : 'entrar';
  contenedor.innerHTML = `
  <div class="acceso">
    <section class="acceso-arte" aria-hidden="true">
      <div class="lema"><span>Imagina</span><i>·</i><span>Diseña</span><i>·</i><span>Crea</span><i>·</i><span>Expresa</span></div>
      <h2><span>El universo</span><span>del diseño y la</span><span>co-creación de moda</span></h2>
      <div class="circulo"></div>
      <img class="trio" src="${img('assets/img/personajes/trio-lalo-walela-lala.webp')}" alt="">
      <div class="burbuja">¡Te estábamos esperando!</div>
      <span class="deco" style="left:70px;top:58%;color:#F2A93B">${icono('estrella', 34)}</span>
      <span class="deco" style="left:120px;top:52%;color:#E8698E">${icono('corazon', 26)}</span>
      <span class="deco" style="right:90px;top:36%;color:#59C4C6">${icono('estrella', 22)}</span>
    </section>
    <main class="acceso-cuerpo">
      <div class="acceso-tarjeta">
        <img class="logo" src="${img('assets/img/marca/logo-miwalela.webp')}" alt="MiWalela">
        <div class="selector-rol" role="tablist" aria-label="¿Cómo quieres entrar?">
          <button type="button" role="tab" data-rol="nino"><img src="${img('assets/img/personajes/avatar-walela.webp')}" alt="">Soy MiniDiseñador</button>
          <button type="button" role="tab" data-rol="profe"><span class="ico-profe">${icono('tijeras', 22)}</span>Soy Profe</button>
        </div>
        <form novalidate data-form></form>
      </div>
      ${redes(app.sitio)}
    </main>
  </div>`;

  const tarjeta = contenedor.querySelector('.acceso-tarjeta');
  const form = contenedor.querySelector('[data-form]');
  const caja = () => form.querySelector('[data-error]');
  const campoClave = (id, etiqueta, autocomplete) => `<div class="campo"><label for="${id}">${etiqueta}</label>
    <div class="entrada-caja">${icono('candado')}<input class="entrada con-icono con-boton" id="${id}" name="${id}" type="password" autocomplete="${autocomplete}" required>
    <button type="button" class="btn-ojo" data-ojo aria-label="Mostrar contraseña">${icono('ojo')}</button></div></div>`;
  const activarOjos = () => form.querySelectorAll('[data-ojo]').forEach((ojo) => {
    const entrada = ojo.parentElement.querySelector('input');
    ojo.onclick = () => {
      const ver = entrada.type === 'password';
      entrada.type = ver ? 'text' : 'password';
      ojo.innerHTML = icono(ver ? 'ojoNo' : 'ojo');
      ojo.setAttribute('aria-label', ver ? 'Ocultar contraseña' : 'Mostrar contraseña');
    };
  });

  function pintarNino() {
    form.innerHTML = `
      <div class="titulo"><h1>¡Qué bueno verte!</h1><p>Entra a tu campus para seguir creando.</p></div>
      <div data-error hidden></div>
      <div class="campo">
        <label for="identificador">Tu usuario o correo</label>
        <div class="entrada-caja">${icono('usuario')}<input class="entrada con-icono" id="identificador" name="identificador" autocomplete="username" autocapitalize="none" spellcheck="false" required></div>
      </div>
      ${campoClave('clave', 'Tu contraseña', 'current-password')}
      <div class="fila-entre">
        <label class="casilla"><input type="checkbox" name="recordar" checked> Recordarme aquí</label>
        <a class="enlace-sutil" href="#/olvide">¿Olvidaste tu contraseña?</a>
      </div>
      <button type="submit" class="btn btn-g">¡Entrar a crear! ${icono('flecha', 24)}</button>
      <div class="separador">¿Primera vez aquí?</div>
      <a class="btn btn-borde" href="#/registro">${icono('chispa')} Crear mi cuenta</a>`;
    form.onsubmit = (ev) => {
      ev.preventDefault();
      limpiarErrores(form);
      const datos = { identificador: form.identificador.value.trim(), clave: form.clave.value, recordar: form.recordar.checked };
      if (!datos.identificador) return mostrarError(caja(), { message: 'Escribe tu usuario o correo.', datos: { campo: 'identificador' } });
      if (!datos.clave) return mostrarError(caja(), { message: 'Escribe tu contraseña.', datos: { campo: 'clave' } });
      conCarga(form.querySelector('[type=submit]'), async () => {
        try {
          const r = await api.post('auth/entrar', datos);
          await app.refrescarEstado();
          app.ir(r.destino === 'inicio' ? '/inicio' : r.destino === 'elegir' ? '/elegir' : '/registro/perfil');
        } catch (e) { mostrarError(caja(), e); }
      });
    };
  }

  const irAlPanel = () => { location.href = api.url(location.protocol === 'file:' ? 'admin/index.html' : 'admin/'); };

  function pintarProfe() {
    if (modoProfe === 'crear') {
      form.innerHTML = `
        <div class="titulo"><h1>Crea tu cuenta de profe</h1><p>Con ella entras al panel para manejar el campus.</p></div>
        <div data-error hidden></div>
        <div class="campo"><label for="nombre">Tu nombre</label><div class="entrada-caja">${icono('usuario')}<input class="entrada con-icono" id="nombre" name="nombre" autocomplete="name" maxlength="120" required></div></div>
        <div class="campo"><label for="correo">Tu correo</label><div class="entrada-caja">${icono('enviar')}<input class="entrada con-icono" id="correo" name="correo" type="email" autocomplete="email" autocapitalize="none" spellcheck="false" maxlength="160" required></div></div>
        ${campoClave('clave', 'Crea una contraseña (mínimo 8 caracteres)', 'new-password')}
        ${campoClave('clave2', 'Repite la contraseña', 'new-password')}
        <button type="submit" class="btn btn-g btn-lila">${icono('chispa', 24)} Crear mi cuenta de profe</button>
        <button type="button" class="btn btn-plano" data-modo="entrar">${icono('izquierda', 20)} Ya tengo cuenta: iniciar sesión</button>`;
      form.onsubmit = (ev) => {
        ev.preventDefault();
        limpiarErrores(form);
        const d = { nombre: form.nombre.value.trim(), correo: form.correo.value.trim(), clave: form.clave.value, clave2: form.clave2.value };
        if (d.clave && d.clave !== d.clave2) return mostrarError(caja(), { message: 'Las contraseñas no coinciden.', datos: { campo: 'clave2' } });
        conCarga(form.querySelector('[type=submit]'), async () => {
          try { await api.post('profe/registro', d); irAlPanel(); } catch (e) { mostrarError(caja(), e); }
        });
      };
    } else if (modoProfe === 'olvide') {
      form.innerHTML = `
        <div class="titulo"><h1>Nueva contraseña</h1><p>Escribe el correo de tu cuenta de profe y crea una contraseña nueva.</p></div>
        <div data-error hidden></div>
        <div class="campo"><label for="correo">Tu correo</label><div class="entrada-caja">${icono('enviar')}<input class="entrada con-icono" id="correo" name="correo" type="email" autocomplete="email" autocapitalize="none" spellcheck="false" required></div></div>
        ${campoClave('clave', 'Nueva contraseña (mínimo 8 caracteres)', 'new-password')}
        ${campoClave('clave2', 'Repítela', 'new-password')}
        <button type="submit" class="btn btn-g btn-lila">Guardar contraseña</button>
        <button type="button" class="btn btn-plano" data-modo="entrar">${icono('izquierda', 20)} Volver a iniciar sesión</button>`;
      form.onsubmit = (ev) => {
        ev.preventDefault();
        limpiarErrores(form);
        conCarga(form.querySelector('[type=submit]'), async () => {
          try {
            const r = await api.post('profe/olvide', { correo: form.correo.value.trim(), clave: form.clave.value, clave2: form.clave2.value });
            aviso(r.mensaje, 'bien');
            modoProfe = 'entrar';
            pintar();
          } catch (e) { mostrarError(caja(), e); }
        });
      };
    } else {
      form.innerHTML = `
        <div class="titulo"><h1>¡Hola, profe!</h1><p>Entra al panel para manejar tu campus.</p></div>
        <div data-error hidden></div>
        <div class="campo"><label for="correo">Tu correo</label><div class="entrada-caja">${icono('usuario')}<input class="entrada con-icono" id="correo" name="correo" type="email" autocomplete="username" autocapitalize="none" spellcheck="false" required></div></div>
        ${campoClave('clave', 'Tu contraseña', 'current-password')}
        <div class="fila-entre">
          <label class="casilla"><input type="checkbox" name="recordar" checked> Recordarme aquí</label>
          <button type="button" class="enlace-sutil btn-enlace" data-modo="olvide">¿Olvidaste tu contraseña?</button>
        </div>
        <button type="submit" class="btn btn-g btn-lila">Entrar al panel ${icono('flecha', 24)}</button>
        <div class="separador">¿Primera vez como profe?</div>
        <button type="button" class="btn btn-borde" data-modo="crear">${icono('chispa')} Crear mi cuenta de profe</button>`;
      form.onsubmit = (ev) => {
        ev.preventDefault();
        limpiarErrores(form);
        const d = { correo: form.correo.value.trim(), clave: form.clave.value, recordar: form.recordar.checked };
        if (!d.correo) return mostrarError(caja(), { message: 'Escribe tu correo.', datos: { campo: 'correo' } });
        if (!d.clave) return mostrarError(caja(), { message: 'Escribe tu contraseña.', datos: { campo: 'clave' } });
        conCarga(form.querySelector('[type=submit]'), async () => {
          try { await api.post('profe/entrar', d); irAlPanel(); } catch (e) { mostrarError(caja(), e); }
        });
      };
    }
    form.querySelectorAll('[data-modo]').forEach((b) => (b.onclick = () => { modoProfe = b.dataset.modo; pintar(); }));
  }

  function pintar() {
    tarjeta.classList.toggle('modo-profe', rol === 'profe');
    contenedor.querySelectorAll('[data-rol]').forEach((b) => {
      const on = b.dataset.rol === rol;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    if (rol === 'profe') pintarProfe(); else pintarNino();
    activarOjos();
    const primero = form.querySelector('input:not([type=checkbox])');
    if (primero && window.matchMedia('(min-width: 961px)').matches) primero.focus();
    history.replaceState(null, '', rol === 'profe' ? '#/entrar?como=profe' : '#/entrar');
  }

  contenedor.querySelectorAll('[data-rol]').forEach((b) => {
    b.onclick = async () => {
      if (rol === b.dataset.rol) return;
      rol = b.dataset.rol;
      modoProfe = 'entrar';
      if (rol === 'profe') {
        const e = await api.get('profe/estado').catch(() => ({}));
        if (e.profe) return irAlPanel();
        if (e.hay_profes === false) modoProfe = 'crear';
      }
      pintar();
    };
  });
  // Si nadie ha creado la cuenta de profe todavía, la pestaña de profe empieza en «crear».
  try {
    const e = await api.get('profe/estado');
    if (e.profe && rol === 'profe') return irAlPanel();
    if (!e.hay_profes && rol === 'profe' && query.get('modo') !== 'entrar') modoProfe = 'crear';
  } catch { /* nada */ }
  pintar();
}

/* ================= Registro ================= */
function cabezaRegistro(paso) {
  const estado = (n) => (n < paso ? 'hecho' : n === paso ? 'actual' : '');
  const num = (n) => (n < paso ? icono('check', 24, 'style="stroke-width:3"') : n);
  return `
  <header class="registro-cabeza">
    <a href="#/entrar" aria-label="Volver a entrar"><img src="${img('assets/img/marca/logo-miwalela.webp')}" alt="MiWalela"></a>
    <div class="ya">¿Ya tienes cuenta? <a class="btn btn-borde btn-p" href="#/entrar">Inicia sesión</a></div>
  </header>
  <ol class="pasos" aria-label="Pasos del registro">
    <li class="${estado(1)}" ${paso === 1 ? 'aria-current="step"' : ''}><span class="num">${num(1)}</span><span>Un adulto te ayuda</span></li>
    <li aria-hidden="true" class="hilo ${paso > 1 ? 'hecho' : ''}"></li>
    <li class="${estado(2)}" ${paso === 2 ? 'aria-current="step"' : ''}><span class="num">${num(2)}</span><span>Tu perfil de diseño</span></li>
    <li aria-hidden="true" class="hilo ${paso > 2 ? 'hecho' : ''}"></li>
    <li class="${estado(3)}" ${paso === 3 ? 'aria-current="step"' : ''}><span class="num">${num(3)}</span><span>¡A crear!</span></li>
  </ol>`;
}

export async function vistaRegistroAdulto({ app, contenedor }) {
  if (app.familia && !app.familia.estudiantes.length) return app.ir('/registro/perfil');
  contenedor.innerHTML = `
  <div class="registro">
    ${cabezaRegistro(1)}
    <div class="registro-cuerpo">
      <form class="registro-form" novalidate>
        <div><h1>Primero, un adulto de tu familia</h1><p class="sub">Mamá, papá o acudiente: con estos datos creamos y cuidamos la cuenta de tu niña o niño.</p></div>
        <div data-error hidden></div>
        <div class="rejilla-2">
          <div class="campo"><label for="nombre">Nombre y apellido</label><input class="entrada" id="nombre" name="nombre" autocomplete="name" placeholder="Ej.: Carolina Gómez" required></div>
          <fieldset class="campo"><legend class="rotulo">¿Qué eres de la niña o el niño?</legend>
            <div class="opciones suave" role="radiogroup" data-grupo="parentesco">
              ${['Mamá', 'Papá', 'Acudiente', 'Otro'].map((p, i) => `<button type="button" class="opcion" role="radio" aria-checked="${i === 0}" data-valor="${p}">${p}</button>`).join('')}
            </div></fieldset>
          <div class="campo"><label for="correo">Correo electrónico</label><input class="entrada" id="correo" name="correo" type="email" autocomplete="email" placeholder="nombre@correo.com" required></div>
          <div class="campo"><label for="celular">Celular / WhatsApp</label>
            <div style="display:flex;gap:8px"><span class="chip" style="background:var(--rosa-s);color:var(--fucsia-f);min-height:58px;border-radius:18px;padding:0 14px">+57</span>
            <input class="entrada" id="celular" name="celular" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="300 000 0000" required></div></div>
          <div class="campo"><label for="clave">Crea una contraseña</label><input class="entrada" id="clave" name="clave" type="password" autocomplete="new-password" placeholder="Mínimo 8 caracteres" required>
            <span class="ayuda" data-fuerza>La usarán para entrar al campus.</span></div>
          <div class="campo"><label for="clave2">Repite la contraseña</label><input class="entrada" id="clave2" name="clave2" type="password" autocomplete="new-password" placeholder="Escríbela otra vez" required></div>
        </div>
        <div class="caja-autoriza">
          <label class="casilla"><input type="checkbox" name="autoriza"> <span>Autorizo a MiWalela a tratar los datos de mi hija o hijo según la política de tratamiento de datos (Ley 1581 de 2012).</span></label>
          <label class="casilla"><input type="checkbox" name="avisos"> <span>Quiero recibir por WhatsApp los horarios de las clases en vivo.</span></label>
        </div>
        <div class="fila-entre">
          <a class="enlace-sutil" href="#/entrar">${icono('izquierda', 20)} Volver</a>
          <button type="submit" class="btn btn-g">Siguiente paso ${icono('flecha', 24)}</button>
        </div>
      </form>
      <aside class="registro-lado">
        <div class="registro-walela">
          <div class="burbuja">¡Hola! Pídele a un adulto que llene esta parte <span style="color:var(--magenta)">contigo</span>.</div>
          <img src="${img('assets/img/personajes/walela-piensa.webp')}" alt="Walela pensando">
        </div>
        <div class="cuidado">
          <h2>${icono('escudo', 24)} Así cuidamos tu cuenta</h2>
          <ul>
            <li>${icono('check', 18)} Un adulto de tu familia crea y cuida la cuenta.</li>
            <li>${icono('check', 18)} Solo tu familia y tu profe ven tu progreso.</li>
            <li>${icono('check', 18)} Las fotos de tus creaciones son privadas.</li>
          </ul>
        </div>
      </aside>
    </div>
  </div>`;

  const form = contenedor.querySelector('form');
  let parentesco = 'Mamá';
  form.querySelectorAll('[data-grupo="parentesco"] .opcion').forEach((b) => {
    b.onclick = () => {
      parentesco = b.dataset.valor;
      form.querySelectorAll('[data-grupo="parentesco"] .opcion').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    };
  });
  const fuerza = form.querySelector('[data-fuerza]');
  form.clave.addEventListener('input', () => {
    const n = form.clave.value.length;
    fuerza.className = 'ayuda ' + (n === 0 ? '' : n < 8 ? 'mal' : 'bien');
    fuerza.textContent = n === 0 ? 'La usarán para entrar al campus.' : n < 8 ? `Te faltan ${8 - n} caracteres.` : '¡Muy bien!';
  });
  form.onsubmit = (ev) => {
    ev.preventDefault();
    limpiarErrores(form);
    const caja = form.querySelector('[data-error]');
    const d = {
      nombre: form.nombre.value.trim(), parentesco, correo: form.correo.value.trim(), celular: form.celular.value.trim(),
      clave: form.clave.value, clave2: form.clave2.value, autoriza: form.autoriza.checked, avisos: form.avisos.checked,
    };
    if (d.clave && d.clave !== d.clave2) return mostrarError(caja, { message: 'Las contraseñas no coinciden.', datos: { campo: 'clave2' } });
    if (!d.autoriza) return mostrarError(caja, { message: 'Necesitamos tu autorización para el tratamiento de datos.', datos: { campo: 'autoriza' } });
    conCarga(form.querySelector('[type=submit]'), async () => {
      try {
        await api.post('auth/registro-adulto', d);
        await app.refrescarEstado();
        app.ir('/registro/perfil');
      } catch (e) { mostrarError(caja, e); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    });
  };
}

const PERSONAJES = [
  { id: 'walela', nombre: 'Walela', rasgo: 'Soñadora, creativa y líder', fondo: '#FDE6EC' },
  { id: 'lalo', nombre: 'Lalo', rasgo: 'Curioso, inteligente y práctico', fondo: '#DDF0EC' },
  { id: 'lala', nombre: 'Lala', rasgo: 'Divertida, empática y soñadora', fondo: '#EDE5F4' },
];

export async function vistaRegistroPerfil({ app, contenedor }) {
  const s = { nombre: '', usuario: '', usuarioTocado: false, edad: '', grado: '', genero: '', personaje: 'walela', color: 'fucsia' };
  const edades = ['6', '7', '8', '9', '10', '11', '12', '13+'];
  const grados = ['Transición', '1.º', '2.º', '3.º', '4.º', '5.º', 'Otro'];
  contenedor.innerHTML = `
  <div class="registro">
    ${cabezaRegistro(2)}
    <div class="registro-cuerpo">
      <form class="registro-form" novalidate>
        <div><h1>¡Ahora cuéntanos de ti!</h1><p class="sub">Así preparamos tu campus con cursos para tu edad.</p></div>
        <div data-error hidden></div>
        <div class="rejilla-2">
          <div class="campo"><label for="nombre">¿Cómo te llamamos?</label><input class="entrada" id="nombre" name="nombre" maxlength="60" autocomplete="off" placeholder="Tu nombre o apodo" required></div>
          <div class="campo"><label for="usuario">Tu usuario para entrar</label><input class="entrada" id="usuario" name="usuario" maxlength="24" autocapitalize="none" spellcheck="false" autocomplete="off" placeholder="Se crea con tu nombre" required>
            <span class="ayuda" data-disp>Solo letras, números y puntos.</span></div>
        </div>
        <fieldset><legend class="rotulo">¿Cuántos años tienes?</legend>
          <div class="opciones" role="radiogroup" data-grupo="edad">${edades.map((e) => `<button type="button" class="opcion" role="radio" aria-checked="false" data-valor="${e}">${e}</button>`).join('')}</div></fieldset>
        <fieldset><legend class="rotulo">¿En qué grado estás?</legend>
          <div class="opciones" role="radiogroup" data-grupo="grado">${grados.map((g) => `<button type="button" class="opcion" role="radio" aria-checked="false" data-valor="${g}">${g}</button>`).join('')}</div></fieldset>
        <fieldset><legend class="rotulo">Soy…</legend>
          <div class="opciones suave" role="radiogroup" data-grupo="genero">
            <button type="button" class="opcion" role="radio" aria-checked="false" data-valor="nina">Niña</button>
            <button type="button" class="opcion" role="radio" aria-checked="false" data-valor="nino">Niño</button>
            <button type="button" class="opcion" role="radio" aria-checked="false" data-valor="otro">Prefiero no decirlo</button></div></fieldset>
        <fieldset><legend class="rotulo">Elige a tu compañero de aventuras</legend>
          <div class="personajes" role="radiogroup">${PERSONAJES.map((p) => `
            <button type="button" class="personaje" role="radio" aria-checked="${p.id === 'walela'}" data-personaje="${p.id}">
              <span class="foto" style="background:${p.fondo}"><img src="${img('assets/img/personajes/avatar-' + p.id + '.webp')}" alt=""></span>
              <span><strong>${p.nombre}</strong><small>${p.rasgo}</small></span>
              <span class="marca">${icono('check', 18, 'style="stroke-width:3"')}</span></button>`).join('')}</div></fieldset>
        <fieldset><legend class="rotulo">Tu color favorito</legend>
          <div class="colores" role="radiogroup">${Object.entries(COLORES).map(([k, c]) => `<button type="button" class="color" role="radio" aria-checked="${k === 'fucsia'}" aria-label="${c.nombre}" data-color="${k}" style="background:${c.fuerte}"></button>`).join('')}
            <span style="font-weight:800;color:var(--tinta-3)" data-color-nombre>Fucsia</span></div></fieldset>
        <div class="fila-entre">
          ${app.familia && app.familia.estudiantes.length ? `<a class="enlace-sutil" href="#/elegir">${icono('izquierda', 20)} Atrás</a>` : '<span></span>'}
          <button type="submit" class="btn btn-g">${icono('chispa', 24)} ¡Crear mi cuenta!</button>
        </div>
      </form>
      <aside class="registro-lado">
        <p class="kicker" style="text-align:center">Así se verá tu carné</p>
        <div class="carne" data-carne></div>
        <div style="display:flex;align-items:flex-end;gap:8px;margin-top:auto">
          <img src="${img('assets/img/personajes/walela-guino.webp')}" alt="Walela guiñando el ojo" style="width:170px">
          <div class="burbuja" style="margin-bottom:70px">¡Me encanta tu estilo! Ya casi empezamos.</div>
        </div>
      </aside>
    </div>
  </div>`;

  const form = contenedor.querySelector('form');
  const carne = contenedor.querySelector('[data-carne]');
  const disp = form.querySelector('[data-disp]');
  const pintarCarne = () => {
    const c = COLORES[s.color];
    const edad = s.edad ? (s.edad === '13+' ? '13 años o más' : s.edad + ' años') : '¿? años';
    carne.innerHTML = `<div class="franja" style="background:${c.fuerte}"><span>MiniDiseñadores</span><img src="${img('assets/img/marca/colibri.webp')}" alt=""></div>
      <div class="datos"><span class="foto" style="background:${c.suave}"><img src="${img('assets/img/personajes/avatar-' + s.personaje + '.webp')}" alt=""></span>
      <strong>${h(s.nombre || 'Tu nombre')}</strong><span class="detalle">${h(edad)}${s.grado ? ' · ' + h(s.grado) : ''}</span>
      <span class="usuario">${s.usuario ? '@' + h(s.usuario) : ''}</span>
      <div class="chips"><span class="chip" style="background:var(--amar-s);color:var(--amar-f)">${icono('estrella', 16, 'style="color:#F2A93B"')} Nivel 1 · Aprendiz</span>
      <span class="chip" style="background:var(--lila-s);color:var(--lila-f)">Equipo ${h(PERSONAJES.find((p) => p.id === s.personaje).nombre)}</span></div></div>`;
  };
  const revisarUsuario = debounce(async () => {
    const u = form.usuario.value.trim();
    if (u.length < 3) { disp.className = 'ayuda'; disp.textContent = 'Mínimo 3 letras o números.'; return; }
    try {
      const r = await api.get('auth/usuario-disponible', { usuario: u });
      s.usuario = r.usuario;
      if (r.disponible) { disp.className = 'ayuda bien'; disp.textContent = `¡«${r.usuario}» está libre!`; }
      else { disp.className = 'ayuda mal'; disp.innerHTML = `Ya existe. ¿Qué tal <button type="button" class="btn-plano enlace-sutil" data-sug>${h(r.sugerencia)}</button>?`; disp.querySelector('[data-sug]').onclick = () => { form.usuario.value = r.sugerencia; s.usuarioTocado = true; revisarUsuario(); }; }
      pintarCarne();
    } catch { /* sin conexión: se valida al enviar */ }
  }, 350);
  const slug = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 24);
  form.nombre.addEventListener('input', () => {
    s.nombre = form.nombre.value.trim();
    if (!s.usuarioTocado) { form.usuario.value = slug(s.nombre); s.usuario = form.usuario.value; revisarUsuario(); }
    pintarCarne();
  });
  form.usuario.addEventListener('input', () => { s.usuarioTocado = true; s.usuario = slug(form.usuario.value); revisarUsuario(); pintarCarne(); });
  form.querySelectorAll('[data-grupo]').forEach((grupo) => {
    grupo.querySelectorAll('.opcion').forEach((b) => {
      b.onclick = () => {
        s[grupo.dataset.grupo] = b.dataset.valor;
        grupo.querySelectorAll('.opcion').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
        pintarCarne();
      };
    });
  });
  form.querySelectorAll('[data-personaje]').forEach((b) => {
    b.onclick = () => { s.personaje = b.dataset.personaje; form.querySelectorAll('[data-personaje]').forEach((x) => x.setAttribute('aria-checked', String(x === b))); pintarCarne(); };
  });
  form.querySelectorAll('[data-color]').forEach((b) => {
    b.onclick = () => { s.color = b.dataset.color; form.querySelectorAll('[data-color]').forEach((x) => x.setAttribute('aria-checked', String(x === b))); form.querySelector('[data-color-nombre]').textContent = COLORES[s.color].nombre; pintarCarne(); };
  });
  pintarCarne();
  form.nombre.focus();

  form.onsubmit = (ev) => {
    ev.preventDefault();
    limpiarErrores(form);
    const caja = form.querySelector('[data-error]');
    if (!s.nombre) return mostrarError(caja, { message: 'Escribe tu nombre o apodo.', datos: { campo: 'nombre' } });
    if (!s.edad) return mostrarError(caja, { message: 'Cuéntanos cuántos años tienes.' });
    if (!s.grado) return mostrarError(caja, { message: 'Cuéntanos en qué grado estás.' });
    const datos = {
      nombre: s.nombre, usuario: form.usuario.value.trim(), edad: s.edad === '13+' ? 13 : Number(s.edad), grado: s.grado,
      genero: s.genero || 'otro', personaje: s.personaje, color: s.color,
    };
    conCarga(form.querySelector('[type=submit]'), async () => {
      try {
        const r = await api.post('auth/registro-estudiante', datos);
        app.premioPendiente = r.premio;
        await app.refrescarEstado();
        app.ir('/registro/listo');
      } catch (e) {
        if (e.estado === 401) { aviso(e.message, 'mal'); return app.ir('/registro'); }
        mostrarError(caja, e);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  };
}

export async function vistaListo({ app, contenedor }) {
  const e = app.estudiante;
  const c = COLORES[e.color] || COLORES.fucsia;
  const bienvenida = e.genero === 'nino' ? '¡Bienvenido' : e.genero === 'nina' ? '¡Bienvenida' : '¡Bienvenido(a)';
  contenedor.innerHTML = `
  <div class="registro">
    ${cabezaRegistro(3)}
    <div class="registro-cuerpo" style="align-items:center">
      <div class="registro-form" style="align-items:center;text-align:center">
        <img src="${img('assets/img/personajes/walela-sorpresa.webp')}" alt="" style="width:170px">
        <h1 style="color:var(--magenta)">${bienvenida} al universo MiWalela, ${h(e.nombre)}!</h1>
        <p class="sub">Tu cuenta está lista. Para entrar la próxima vez usa:</p>
        <div class="alerta info" style="font-size:20px;justify-content:center">${icono('usuario', 24)} Usuario: <strong>${h(e.usuario)}</strong></div>
        <p class="ayuda">y la contraseña que creó el adulto de tu familia.</p>
        <a class="btn btn-g" href="#/inicio">¡Entrar a mi campus! ${icono('flecha', 24)}</a>
      </div>
      <aside class="registro-lado">
        <div class="carne"><div class="franja" style="background:${c.fuerte}"><span>MiniDiseñadores</span><img src="${img('assets/img/marca/colibri.webp')}" alt=""></div>
          <div class="datos"><span class="foto" style="background:${c.suave}"><img src="${img(e.avatar)}" alt=""></span>
          <strong>${h(e.nombre)}</strong><span class="detalle">${h(e.edad >= 13 ? '13 años o más' : e.edad + ' años')} · ${h(e.grado)}</span>
          <span class="usuario">@${h(e.usuario)}</span>
          <div class="chips"><span class="chip" style="background:var(--amar-s);color:var(--amar-f)">${icono('estrella', 16, 'style="color:#F2A93B"')} ${e.estrellas} estrellas</span></div></div></div>
      </aside>
    </div>
  </div>`;
  if (app.premioPendiente) {
    const p = app.premioPendiente;
    app.premioPendiente = null;
    setTimeout(() => celebrar(p), 400);
  }
}

/* ================= Elegir perfil ================= */
export async function vistaElegir({ app, contenedor }) {
  const f = app.familia;
  if (!f.estudiantes.length) return app.ir('/registro/perfil');
  contenedor.innerHTML = `
  <div class="elegir">
    <img src="${img('assets/img/marca/logo-miwalela.webp')}" alt="MiWalela" style="width:170px">
    <h1>¿Quién va a crear hoy?</h1>
    <div class="perfiles">
      ${f.estudiantes.map((e) => {
        const c = COLORES[e.color] || COLORES.fucsia;
        return `<button type="button" class="perfil-boton" data-id="${e.id}"><span class="avatar" style="background:${c.suave};border-color:${c.fuerte}"><img src="${img(e.avatar)}" alt=""></span>${h(e.nombre)}<small>@${h(e.usuario)}</small></button>`;
      }).join('')}
      <a class="perfil-boton nuevo" href="#/registro/perfil" style="text-decoration:none;color:var(--lila-f)"><span class="mas">${icono('mas', 40)}</span>Agregar otro<small>MiniDiseñador</small></a>
    </div>
    <button type="button" class="btn btn-plano" data-salir>${icono('salir', 20)} Salir</button>
  </div>`;
  contenedor.querySelectorAll('[data-id]').forEach((b) => {
    b.onclick = () => conCarga(b, async () => {
      try {
        await api.post('auth/elegir', { estudiante_id: Number(b.dataset.id) });
        await app.refrescarEstado();
        app.ir('/inicio');
      } catch (e) { avisoError(e); }
    });
  });
  contenedor.querySelector('[data-salir]').onclick = async () => {
    await api.post('auth/salir').catch(() => {});
    await app.refrescarEstado();
    app.ir('/entrar');
  };
}

/* ================= Recuperar contraseña ================= */
function tarjetaSimple(titulo, subtitulo, cuerpo) {
  return `<div class="acceso"><main class="acceso-cuerpo"><form class="acceso-tarjeta" novalidate>
    <img class="logo" src="${img('assets/img/marca/logo-miwalela.webp')}" alt="MiWalela">
    <div class="titulo"><h1>${titulo}</h1><p>${subtitulo}</p></div><div data-error hidden></div>${cuerpo}</form></main></div>`;
}

export async function vistaOlvide({ app, contenedor }) {
  contenedor.innerHTML = tarjetaSimple('¿Olvidaste tu contraseña?', 'Un adulto de tu familia puede crear una nueva con el correo y el celular que registró.', `
    <div class="campo"><label for="correo">Correo del adulto</label><input class="entrada" id="correo" name="correo" type="email" autocomplete="email" required></div>
    <div class="campo"><label for="celular">Celular registrado</label><input class="entrada" id="celular" name="celular" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="300 000 0000" required></div>
    <div class="campo"><label for="clave">Nueva contraseña</label><input class="entrada" id="clave" name="clave" type="password" autocomplete="new-password" placeholder="Mínimo 8 caracteres" required></div>
    <div class="campo"><label for="clave2">Repítela</label><input class="entrada" id="clave2" name="clave2" type="password" autocomplete="new-password" required></div>
    <button type="submit" class="btn btn-g">Guardar contraseña</button>
    <a class="enlace-sutil" href="#/entrar" style="justify-content:center">${icono('izquierda', 20)} Volver a entrar</a>`);
  const form = contenedor.querySelector('form');
  form.correo.focus();
  form.onsubmit = (ev) => {
    ev.preventDefault();
    limpiarErrores(form);
    conCarga(form.querySelector('[type=submit]'), async () => {
      try {
        const r = await api.post('auth/olvide', { correo: form.correo.value.trim(), celular: form.celular.value.trim(), clave: form.clave.value, clave2: form.clave2.value });
        aviso(r.mensaje, 'bien');
        app.ir('/entrar');
      } catch (e) { mostrarError(form.querySelector('[data-error]'), e); }
    });
  };
}

export async function vistaRestablecer({ app }) {
  app.ir('/olvide');
}
