/**
 * Panel de la profe: cursos, sesiones, retos, guías, clases en vivo, retos de la semana, insignias y niveles.
 */
import * as api from '../comun/api.js';
import { h, icono, aviso, avisoError, conCarga, confirmar, ventana, discoInsignia, COLORES } from '../comun/ui.js';
import { formulario, activarFormulario } from './formularios.js';

const img = (r) => h(api.url(r));
const TIPOS_CURSO = [['modulo', 'Módulo (con sesiones)'], ['taller', 'Taller en vivo'], ['mini_reto', 'Mini reto']];
const TIPOS_RETO = [['actividad', 'Actividad (hacer algo con el kit)'], ['video', 'Video'], ['guia', 'Guía paso a paso']];
const APERTURAS = [['siempre', 'Siempre abierta'], ['anterior', 'Al terminar la sesión anterior'], ['fecha', 'Desde una fecha']];
const ICONOS_RECUERDA = [['corazon', 'Corazón'], ['flor', 'Flor'], ['estrella', 'Estrella'], ['lapiz', 'Lápiz'], ['tijeras', 'Tijeras'], ['boton', 'Botón'], ['hilo', 'Hilo'], ['regla', 'Regla']];
const pub = (v) => `<span class="estado-pub ${v ? 'si' : 'no'}">${v ? 'Publicado' : 'Borrador'}</span>`;

async function opciones() { return api.get('admin/opciones'); }

async function ordenar(recurso, filas, indice, delta) {
  const j = indice + delta;
  if (j < 0 || j >= filas.length) return false;
  const ids = filas.map((f) => f.id);
  [ids[indice], ids[j]] = [ids[j], ids[indice]];
  await api.post('admin/ordenar', { recurso, ids });
  return true;
}

function botonesOrden(i, total, attr) {
  return `<button type="button" class="btn-mini" ${attr}="${i}" data-d="-1" aria-label="Subir" ${i === 0 ? 'disabled' : ''}>↑</button>
    <button type="button" class="btn-mini" ${attr}="${i}" data-d="1" aria-label="Bajar" ${i === total - 1 ? 'disabled' : ''}>↓</button>`;
}

/* ===================== Cursos ===================== */
function camposCurso(cursos, idActual) {
  return [
    { nombre: 'etiqueta', etiqueta: 'Etiqueta', tipo: 'texto', requerido: true, max: 40, placeholder: 'MÓDULO 1', fila: 'a' },
    { nombre: 'tipo', etiqueta: 'Tipo', tipo: 'select', opciones: TIPOS_CURSO, defecto: 'modulo', fila: 'a' },
    { nombre: 'titulo', etiqueta: 'Título', tipo: 'texto', requerido: true, max: 160 },
    { nombre: 'resaltar', etiqueta: 'Palabras finales en rosado', tipo: 'texto', max: 80, ayuda: 'Deben ser las últimas palabras del título. Ej.: «una diseñadora».' },
    { nombre: 'descripcion', etiqueta: 'Descripción corta (se ve en la tarjeta)', tipo: 'largo', max: 255, filas: 2 },
    { nombre: 'introduccion', etiqueta: 'Frase de bienvenida del curso', tipo: 'largo', max: 255, filas: 2 },
    { nombre: 'portada', etiqueta: 'Imagen de portada', tipo: 'imagen', carpeta: 'portadas' },
    { nombre: 'portada_tipo', etiqueta: 'Cómo se muestra la portada', tipo: 'select', opciones: [['foto', 'Foto que llena la tarjeta'], ['icono', 'Ilustración redonda']], defecto: 'foto', fila: 'b' },
    { nombre: 'modalidad', etiqueta: 'Modalidad', tipo: 'select', opciones: [['virtual', 'Virtual'], ['presencial', 'Presencial'], ['mixta', 'Virtual y presencial']], defecto: 'virtual', fila: 'b' },
    { nombre: 'color', etiqueta: 'Color del curso', tipo: 'color', defecto: 'lila' },
    { nombre: 'edad_minima', etiqueta: 'Edad mínima', tipo: 'numero', min: 3, maximo: 18, defecto: 6, fila: 'c' },
    { nombre: 'sesiones_planeadas', etiqueta: 'Sesiones planeadas', tipo: 'numero', min: 0, maximo: 60, ayuda: 'Las que aún no existan salen como «¡Muy pronto!».', fila: 'c' },
    { nombre: 'requisito_curso_id', etiqueta: 'Se abre cuando terminen…', tipo: 'select', opciones: [['', 'Ningún requisito (abierto)'], ...cursos.filter((c) => c.id !== idActual).map((c) => [c.id, `${c.etiqueta} · ${c.titulo}`])] },
    { nombre: 'objetivos', etiqueta: '¿Qué vamos a lograr? (uno por línea)', tipo: 'lineas', filas: 4 },
    { nombre: 'kit', etiqueta: 'Kit de trabajo (un material por línea)', tipo: 'lineas', filas: 4 },
    { nombre: 'frase_recuerda', etiqueta: 'Frase «Recuerda»', tipo: 'texto', max: 255 },
    { nombre: 'publicado', etiqueta: 'Publicado (los niños lo pueden ver)', tipo: 'bool' },
  ];
}

export async function vistaCursos({ panel, contenedor }) {
  const { filas } = await api.get('admin/lista', { recurso: 'cursos' });
  contenedor.innerHTML = `
    <div class="p-cabeza"><div><h1>Cursos y sesiones</h1><p>Crea módulos, talleres y mini retos. Dentro de cada curso agregas sesiones, videos y actividades.</p></div>
    <a class="btn" href="#/curso/nuevo">${icono('mas')} Nuevo curso</a></div>
    <div class="caja tabla-envoltura">${filas.length ? `<table class="tabla tarjetas"><thead><tr><th></th><th>Curso</th><th class="ocultar-movil">Tipo</th><th class="ocultar-movil">Contenido</th><th class="ocultar-movil">Niños</th><th>Estado</th><th></th></tr></thead><tbody>
      ${filas.map((c, i) => `<tr><td>${c.portada ? `<img class="miniatura" src="${img(c.portada)}" alt="">` : '<span class="miniatura" style="display:block"></span>'}</td>
        <td class="t-titulo"><strong>${h(c.titulo)}</strong><br><small style="color:var(--tinta-3);font-weight:700">${h(c.etiqueta)}</small></td>
        <td class="ocultar-movil">${h((TIPOS_CURSO.find((t) => t[0] === c.tipo) || [])[1] || c.tipo)}</td>
        <td class="ocultar-movil">${c.n_sesiones} sesiones · ${c.n_retos} retos</td><td class="ocultar-movil">${c.n_estudiantes}</td>
        <td><button type="button" class="btn-mini" data-pub="${i}" title="Cambiar">${pub(c.publicado)}</button></td>
        <td class="t-acciones"><div class="acciones-fila">${botonesOrden(i, filas.length, 'data-ord')}<a class="btn-mini primario" href="#/curso/${c.id}">Editar</a></div></td></tr>`).join('')}
      </tbody></table>` : '<p class="vacio-p">Aún no hay cursos. Crea el primero.</p>'}</div>`;
  contenedor.querySelectorAll('[data-ord]').forEach((b) => (b.onclick = async () => { if (await ordenar('cursos', filas, Number(b.dataset.ord), Number(b.dataset.d))) panel.navegar(); }));
  contenedor.querySelectorAll('[data-pub]').forEach((b) => (b.onclick = () => conCarga(b, async () => {
    const c = filas[Number(b.dataset.pub)];
    try { await api.post('admin/guardar', { recurso: 'cursos', id: c.id, datos: { publicado: !c.publicado } }); aviso(c.publicado ? 'Curso oculto para los niños' : '¡Curso publicado!', 'bien'); panel.navegar(); } catch (e) { avisoError(e); }
  })));
}

function camposSesion() {
  return [
    { nombre: 'titulo', etiqueta: 'Título de la sesión', tipo: 'texto', requerido: true, max: 160 },
    { nombre: 'proposito', etiqueta: 'Propósito (se ve en «Descripción»)', tipo: 'largo', filas: 3 },
    { nombre: 'conexion_dba', etiqueta: 'Conexión con el colegio (DBA)', tipo: 'texto', max: 255, placeholder: 'Matemáticas 1.º · DBA 6: formas y ubicación' },
    { nombre: 'apertura', etiqueta: '¿Cuándo se abre?', tipo: 'select', opciones: APERTURAS, defecto: 'anterior' },
    { nombre: 'fecha_apertura', etiqueta: 'Fecha y hora de apertura', tipo: 'fecha_hora', si: (d) => d.apertura === 'fecha' },
    { nombre: 'publicado', etiqueta: 'Publicada', tipo: 'bool', defecto: true },
  ];
}

function camposReto(guias) {
  return [
    { nombre: 'tipo', etiqueta: 'Tipo de reto', tipo: 'select', opciones: TIPOS_RETO, defecto: 'actividad' },
    { nombre: 'titulo', etiqueta: 'Título', tipo: 'texto', requerido: true, max: 160 },
    { nombre: 'descripcion', etiqueta: 'Instrucción para los niños', tipo: 'largo', filas: 3 },
    { nombre: 'icono', etiqueta: 'Ilustración (se ve redonda)', tipo: 'imagen', carpeta: 'retos' },
    { nombre: 'estrellas', etiqueta: 'Estrellas que gana', tipo: 'numero', min: 0, maximo: 500, defecto: 10, fila: 'e' },
    { nombre: 'permite_foto', etiqueta: 'Pedir foto del trabajo', tipo: 'bool', si: (d) => d.tipo === 'actividad', fila: 'e' },
    { nombre: 'video_url', etiqueta: 'Video', tipo: 'archivo', subtipo: 'video', aceptar: 'video/mp4,video/webm,video/quicktime', enlace: 'O pega el enlace de YouTube (https://youtu.be/…)', duracionEn: 'video_duracion',
      ayuda: 'Sube el video MP4 desde tu computador o pega el enlace de YouTube.', si: (d) => d.tipo === 'video',
      antesDeGuardar: (d) => { if (d.tipo === 'video') d.video_fuente = /youtu\.?be/i.test(d.video_url || '') ? 'youtube' : /^https?:/i.test(d.video_url || '') ? 'url' : 'archivo'; } },
    { nombre: 'video_poster', etiqueta: 'Imagen de portada del video', tipo: 'imagen', carpeta: 'posters', si: (d) => d.tipo === 'video' && !/youtu\.?be/i.test(d.video_url || '') },
    { nombre: 'video_subtitulos', etiqueta: 'Subtítulos (.vtt o .srt)', tipo: 'archivo', subtipo: 'subtitulos', aceptar: '.vtt,.srt', si: (d) => d.tipo === 'video' && !/youtu\.?be/i.test(d.video_url || '') },
    { nombre: 'video_duracion', etiqueta: 'Duración en segundos', tipo: 'numero', min: 0, ayuda: 'Se llena sola al subir el video. Se usa para marcarlo como visto al 90 %.', si: (d) => d.tipo === 'video' },
    { nombre: 'guia_id', etiqueta: 'Guía de este reto', tipo: 'select', opciones: [['', 'Elige una guía'], ...guias.map((g) => [g.id, `${g.etiqueta ? g.etiqueta + ' · ' : ''}${g.titulo}`])], si: (d) => d.tipo === 'guia' },
  ];
}

export async function vistaCurso({ panel, contenedor, params }) {
  const nuevo = params[0] === 'nuevo';
  const op = await opciones();
  let datos = { curso: { publicado: 0, color: 'lila' }, sesiones: [] };
  if (!nuevo) datos = await api.get('admin/curso', { id: params[0] });
  const c = datos.curso;
  const campos = camposCurso(op.cursos, c.id);
  const aperturaTxt = (s) => (s.apertura === 'fecha' ? `Desde ${String(s.fecha_apertura || '').slice(0, 16).replace('T', ' ')}` : (APERTURAS.find((a) => a[0] === s.apertura) || [])[1]);
  contenedor.innerHTML = `
    <div class="p-cabeza"><div><a class="enlace-sutil" href="#/cursos">${icono('izquierda', 18)} Cursos</a><h1>${nuevo ? 'Nuevo curso' : h(c.titulo)}</h1></div>
    ${!nuevo ? `<div class="acciones"><button type="button" class="btn btn-borde fucsia btn-p" data-borrar>${icono('basura', 18)} Eliminar curso</button></div>` : ''}</div>
    <div class="editor">
      <section class="caja"><h2>Datos del curso</h2><form class="form" novalidate data-form>${formulario(campos, c)}
        <div class="pie-form"><button type="submit" class="btn btn-p">Guardar curso</button></div></form></section>
      <section class="caja" data-sesiones>${nuevo ? '<p class="vacio-p">Guarda el curso para agregarle sesiones y retos.</p>' : ''}</section>
    </div>`;
  const form = contenedor.querySelector('[data-form]');
  const { leer } = activarFormulario(form, campos);
  form.onsubmit = (ev) => {
    ev.preventDefault();
    conCarga(form.querySelector('[type=submit]'), async () => {
      try {
        const r = await api.post('admin/guardar', { recurso: 'cursos', id: nuevo ? null : c.id, datos: leer() });
        aviso('¡Curso guardado!', 'bien');
        if (nuevo) panel.ir('/curso/' + r.fila.id);
        else contenedor.querySelector('.p-cabeza h1').textContent = r.fila.titulo;
      } catch (e) { avisoError(e); }
    });
  };
  const borrar = contenedor.querySelector('[data-borrar]');
  if (borrar) {
    borrar.onclick = async () => {
      if (!(await confirmar('¿Eliminar este curso?', 'Se borrarán también sus sesiones, retos y el progreso de los niños en él. Si solo quieres ocultarlo, desmarca «Publicado».', { si: 'Sí, eliminar todo', peligro: true }))) return;
      try { await api.post('admin/eliminar', { recurso: 'cursos', id: c.id }); aviso('Curso eliminado', 'bien'); panel.ir('/cursos'); } catch (e) { avisoError(e); }
    };
  }
  if (nuevo) return;

  const caja = contenedor.querySelector('[data-sesiones]');
  const pintar = () => {
    const ses = datos.sesiones;
    caja.innerHTML = `<h2>Sesiones y retos <button type="button" class="btn btn-lila btn-p" data-nueva-sesion>${icono('mas', 18)} Agregar sesión</button></h2>
      ${ses.length ? ses.map((s, i) => `<div class="sesion-bloque">
        <header><span class="num">${i + 1}</span><strong>${h(s.titulo)}</strong>${pub(s.publicado)}
          <div class="acciones-fila">${botonesOrden(i, ses.length, 'data-ord-s')}<button type="button" class="btn-mini" data-editar-s="${i}">Editar</button><button type="button" class="btn-mini primario" data-nuevo-reto="${i}">${icono('mas', 14)} Reto</button></div></header>
        <small style="color:var(--tinta-3);font-weight:700">Se abre: ${h(aperturaTxt(s))}</small>
        <div class="lista-retos">${s.retos.length ? s.retos.map((r, k) => `<div class="reto-fila">
          ${r.icono ? `<img src="${img(r.icono)}" alt="">` : `<span class="avatar" style="width:42px;height:42px;border:none;display:flex;align-items:center;justify-content:center;background:var(--crema)">${icono('chispa', 18)}</span>`}
          <div class="txt"><strong>${h(r.titulo)}</strong><small><span class="tipo-reto ${r.tipo}">${r.tipo}</span> · ${r.estrellas} ★ · ${r.completados} niño${r.completados === 1 ? '' : 's'} lo completaron${r.tipo === 'video' && !r.video_url ? ' · <b style="color:#B42340">sin video</b>' : ''}</small></div>
          <div class="acciones-fila">${botonesOrden(k, s.retos.length, `data-ord-r="${i}" data-k`)}<button type="button" class="btn-mini" data-editar-r="${i}:${k}">Editar</button></div></div>`).join('')
          : '<p class="ayuda" style="padding:6px">Esta sesión aún no tiene retos. Agrega videos, actividades o una guía.</p>'}</div></div>`).join('')
        : '<p class="vacio-p">Este curso aún no tiene sesiones.</p>'}`;

    caja.querySelector('[data-nueva-sesion]').onclick = async () => {
      const f = await panel.editar({ recurso: 'sesiones', titulo: 'Nueva sesión', campos: camposSesion(), valores: { apertura: ses.length ? 'anterior' : 'siempre', publicado: 1 }, fijos: { curso_id: c.id } });
      if (f) recargar();
    };
    caja.querySelectorAll('[data-editar-s]').forEach((b) => (b.onclick = async () => {
      const s = ses[Number(b.dataset.editarS)];
      const f = await panel.editar({ recurso: 'sesiones', id: s.id, titulo: 'Editar sesión', campos: camposSesion(), valores: s, eliminar: 'Se borrarán los retos de esta sesión y el progreso de los niños en ellos.' });
      if (f) recargar();
    }));
    caja.querySelectorAll('[data-ord-s]').forEach((b) => (b.onclick = async () => { if (await ordenar('sesiones', ses, Number(b.dataset.ordS), Number(b.dataset.d))) recargar(); }));
    caja.querySelectorAll('[data-ord-r]').forEach((b) => (b.onclick = async () => {
      const s = ses[Number(b.dataset.ordR)];
      if (await ordenar('retos', s.retos, Number(b.dataset.k), Number(b.dataset.d))) recargar();
    }));
    caja.querySelectorAll('[data-nuevo-reto]').forEach((b) => (b.onclick = async () => {
      const s = ses[Number(b.dataset.nuevoReto)];
      const f = await panel.editar({ recurso: 'retos', titulo: `Nuevo reto · ${s.titulo}`, campos: camposReto(op.guias), valores: { tipo: 'actividad', estrellas: 10 }, fijos: { sesion_id: s.id } });
      if (f) recargar();
    }));
    caja.querySelectorAll('[data-editar-r]').forEach((b) => (b.onclick = async () => {
      const [i, k] = b.dataset.editarR.split(':').map(Number);
      const r = ses[i].retos[k];
      const f = await panel.editar({ recurso: 'retos', id: r.id, titulo: 'Editar reto', campos: camposReto(op.guias), valores: r, eliminar: 'Se borrará el progreso de los niños en este reto.' });
      if (f) recargar();
    }));
  };
  const recargar = async () => { datos = await api.get('admin/curso', { id: c.id }); pintar(); };
  pintar();
}

/* ===================== Guías ===================== */
function camposGuia(sesiones) {
  return [
    { nombre: 'sesion_id', etiqueta: 'Sesión a la que pertenece', tipo: 'select', opciones: [['', 'Ninguna (guía libre)'], ...sesiones.map((s) => [s.id, `${s.etiqueta} · ${s.titulo}`])], ayuda: 'Si pertenece a una sesión, se abre cuando la sesión esté abierta.' },
    { nombre: 'etiqueta', etiqueta: 'Etiqueta', tipo: 'texto', max: 60, placeholder: 'MÓDULO 1 · SESIÓN 2' },
    { nombre: 'titulo', etiqueta: 'Título', tipo: 'texto', requerido: true, max: 160 },
    { nombre: 'resaltar', etiqueta: 'Palabras finales en rosado', tipo: 'texto', max: 80 },
    { nombre: 'descripcion', etiqueta: 'Descripción corta', tipo: 'largo', max: 255, filas: 2 },
    { nombre: 'portada', etiqueta: 'Imagen de la ficha (vista previa)', tipo: 'imagen', carpeta: 'guias' },
    { nombre: 'pdf', etiqueta: 'PDF para descargar e imprimir', tipo: 'archivo', subtipo: 'pdf', aceptar: 'application/pdf', enlace: 'O pega un enlace (Google Drive, Dropbox…)' },
    { nombre: 'conexion_dba', etiqueta: 'Conexión con el colegio (DBA)', tipo: 'texto', max: 255 },
    { nombre: 'frase_final', etiqueta: 'Frase final (tarjeta rosada)', tipo: 'texto', max: 255 },
    { nombre: 'estrellas', etiqueta: 'Estrellas al terminar la guía', tipo: 'numero', min: 0, maximo: 500, defecto: 20 },
    { nombre: 'publicado', etiqueta: 'Publicada', tipo: 'bool', defecto: true },
  ];
}

export async function vistaGuias({ contenedor }) {
  const { filas } = await api.get('admin/lista', { recurso: 'guias' });
  contenedor.innerHTML = `
    <div class="p-cabeza"><div><h1>Guías</h1><p>Guías paso a paso con imágenes, y su PDF para imprimir.</p></div><a class="btn" href="#/guia/nueva">${icono('mas')} Nueva guía</a></div>
    <div class="caja tabla-envoltura">${filas.length ? `<table class="tabla tarjetas"><thead><tr><th></th><th>Guía</th><th class="ocultar-movil">Sesión</th><th class="ocultar-movil">Pasos</th><th class="ocultar-movil">Descargas</th><th>Estado</th><th></th></tr></thead><tbody>
    ${filas.map((g) => `<tr><td>${g.portada ? `<img class="miniatura" src="${img(g.portada)}" alt="">` : ''}</td><td class="t-titulo"><strong>${h(g.titulo)}</strong><br><small style="color:var(--tinta-3);font-weight:700">${h(g.etiqueta || '')}</small></td>
      <td class="ocultar-movil">${h(g.sesion || '—')}</td><td class="ocultar-movil">${g.n_pasos}</td><td class="ocultar-movil">${g.descargas}</td><td>${pub(g.publicado)}</td>
      <td class="t-acciones"><div class="acciones-fila"><a class="btn-mini primario" href="#/guia/${g.id}">Editar</a></div></td></tr>`).join('')}</tbody></table>` : '<p class="vacio-p">Aún no hay guías.</p>'}</div>`;
}

export async function vistaGuia({ panel, contenedor, params }) {
  const nueva = params[0] === 'nueva';
  const op = await opciones();
  let datos = { guia: { publicado: 1, estrellas: 20 }, pasos: [], recuerda: [] };
  if (!nueva) datos = await api.get('admin/guia', { id: params[0] });
  const g = datos.guia;
  const campos = camposGuia(op.sesiones);
  contenedor.innerHTML = `
    <div class="p-cabeza"><div><a class="enlace-sutil" href="#/guias">${icono('izquierda', 18)} Guías</a><h1>${nueva ? 'Nueva guía' : h(g.titulo)}</h1></div>
    ${!nueva ? `<button type="button" class="btn btn-borde fucsia btn-p" data-borrar>${icono('basura', 18)} Eliminar guía</button>` : ''}</div>
    <div class="editor">
      <section class="caja"><h2>Datos de la guía</h2><form class="form" novalidate data-form>${formulario(campos, g)}<div class="pie-form"><button type="submit" class="btn btn-p">Guardar guía</button></div></form></section>
      <div data-derecha>${nueva ? '<section class="caja"><p class="vacio-p">Guarda la guía para agregarle pasos.</p></section>' : ''}</div>
    </div>`;
  const form = contenedor.querySelector('[data-form]');
  const { leer } = activarFormulario(form, campos);
  form.onsubmit = (ev) => {
    ev.preventDefault();
    conCarga(form.querySelector('[type=submit]'), async () => {
      try {
        const r = await api.post('admin/guardar', { recurso: 'guias', id: nueva ? null : g.id, datos: leer() });
        aviso('¡Guía guardada!', 'bien');
        if (nueva) panel.ir('/guia/' + r.fila.id);
      } catch (e) { avisoError(e); }
    });
  };
  const borrar = contenedor.querySelector('[data-borrar]');
  if (borrar) borrar.onclick = async () => {
    if (!(await confirmar('¿Eliminar esta guía?', 'Se borrarán sus pasos. Los retos que la usan quedarán sin guía.', { si: 'Sí, eliminar', peligro: true }))) return;
    try { await api.post('admin/eliminar', { recurso: 'guias', id: g.id }); panel.ir('/guias'); } catch (e) { avisoError(e); }
  };
  if (nueva) return;

  const der = contenedor.querySelector('[data-derecha]');
  const camposPaso = () => [
    { nombre: 'etiqueta', etiqueta: 'Etiqueta', tipo: 'texto', max: 60, placeholder: 'RETO 1 · PASO 2', fila: 'p' },
    { nombre: 'numero', etiqueta: 'Número en el círculo', tipo: 'texto', max: 4, placeholder: '1', fila: 'p' },
    { nombre: 'titulo', etiqueta: 'Título del paso', tipo: 'texto', requerido: true, max: 160 },
    { nombre: 'texto', etiqueta: 'Instrucción', tipo: 'largo', filas: 3 },
    { nombre: 'consejo', etiqueta: 'Consejo de Walela', tipo: 'texto', max: 255 },
    { nombre: 'imagen', etiqueta: 'Ilustración del paso', tipo: 'imagen', carpeta: 'guias' },
    { nombre: 'recuerda_id', etiqueta: 'Resaltar en «Recuerda»', tipo: 'select', opciones: [['', 'Ninguno'], ...datos.recuerda.map((r) => [r.id, r.texto])] },
  ];
  const camposRecuerda = [
    { nombre: 'icono', etiqueta: 'Ícono', tipo: 'select', opciones: ICONOS_RECUERDA, defecto: 'corazon' },
    { nombre: 'texto', etiqueta: 'Texto', tipo: 'texto', requerido: true, max: 160 },
  ];
  const pintar = () => {
    der.innerHTML = `<section class="caja"><h2>Pasos (${datos.pasos.length}) <button type="button" class="btn btn-lila btn-p" data-nuevo-paso>${icono('mas', 18)} Agregar paso</button></h2>
      <div class="lista-retos">${datos.pasos.map((p, i) => `<div class="reto-fila">${p.imagen ? `<img src="${img(p.imagen)}" alt="" style="border-radius:10px;object-fit:contain;background:#fff;border:1px solid #F1E8EC">` : ''}
        <div class="txt"><strong>${i + 1}. ${h(p.titulo)}</strong><small>${h(p.etiqueta || '')}${p.consejo ? ' · Consejo: ' + h(p.consejo) : ''}</small></div>
        <div class="acciones-fila">${botonesOrden(i, datos.pasos.length, 'data-ord-p')}<button type="button" class="btn-mini" data-editar-p="${i}">Editar</button></div></div>`).join('') || '<p class="ayuda">Agrega el primer paso.</p>'}</div></section>
      <section class="caja"><h2>Recuerda <button type="button" class="btn btn-borde btn-p" data-nuevo-rec>${icono('mas', 18)} Agregar</button></h2>
        <p class="ayuda" style="margin-bottom:10px">Lista corta que acompaña los pasos. Cada paso puede resaltar un elemento.</p>
        <div class="lista-simple">${datos.recuerda.map((r, i) => `<div><span class="txt"><strong>${h(r.texto)}</strong><small>${h((ICONOS_RECUERDA.find((x) => x[0] === r.icono) || [])[1] || r.icono)}</small></span>
          ${botonesOrden(i, datos.recuerda.length, 'data-ord-rec')}<button type="button" class="btn-mini" data-editar-rec="${i}">Editar</button></div>`).join('') || '<p class="ayuda">Sin elementos.</p>'}</div></section>`;
    der.querySelector('[data-nuevo-paso]').onclick = async () => {
      const f = await panel.editar({ recurso: 'guia_pasos', titulo: 'Nuevo paso', campos: camposPaso(), valores: { numero: String(datos.pasos.length + 1) }, fijos: { guia_id: g.id } });
      if (f) recargar();
    };
    der.querySelectorAll('[data-editar-p]').forEach((b) => (b.onclick = async () => {
      const p = datos.pasos[Number(b.dataset.editarP)];
      const f = await panel.editar({ recurso: 'guia_pasos', id: p.id, titulo: 'Editar paso', campos: camposPaso(), valores: p, eliminar: true });
      if (f) recargar();
    }));
    der.querySelectorAll('[data-ord-p]').forEach((b) => (b.onclick = async () => { if (await ordenar('guia_pasos', datos.pasos, Number(b.dataset.ordP), Number(b.dataset.d))) recargar(); }));
    der.querySelector('[data-nuevo-rec]').onclick = async () => {
      const f = await panel.editar({ recurso: 'guia_recuerda', titulo: 'Nuevo elemento de «Recuerda»', campos: camposRecuerda, fijos: { guia_id: g.id } });
      if (f) recargar();
    };
    der.querySelectorAll('[data-editar-rec]').forEach((b) => (b.onclick = async () => {
      const r = datos.recuerda[Number(b.dataset.editarRec)];
      const f = await panel.editar({ recurso: 'guia_recuerda', id: r.id, titulo: 'Editar «Recuerda»', campos: camposRecuerda, valores: r, eliminar: true });
      if (f) recargar();
    }));
    der.querySelectorAll('[data-ord-rec]').forEach((b) => (b.onclick = async () => { if (await ordenar('guia_recuerda', datos.recuerda, Number(b.dataset.ordRec), Number(b.dataset.d))) recargar(); }));
  };
  const recargar = async () => { datos = await api.get('admin/guia', { id: g.id }); pintar(); };
  pintar();
}

/* ===================== Clases en vivo ===================== */
function camposClase(cursos) {
  return [
    { nombre: 'titulo', etiqueta: 'Título', tipo: 'texto', requerido: true, max: 160, placeholder: 'Clase con tu profe: exploro mi kit' },
    { nombre: 'descripcion', etiqueta: 'Qué deben tener a la mano', tipo: 'texto', max: 255, placeholder: 'Ten a la mano tus telas, cintas y botones.' },
    { nombre: 'curso_id', etiqueta: 'Curso', tipo: 'select', opciones: [['', 'Ninguno (clase general)'], ...cursos.map((c) => [c.id, `${c.etiqueta} · ${c.titulo}`])] },
    { nombre: 'inicia_en', etiqueta: 'Fecha y hora', tipo: 'fecha_hora', requerido: true, fila: 'f' },
    { nombre: 'duracion_min', etiqueta: 'Duración (minutos)', tipo: 'numero', min: 10, maximo: 600, defecto: 60, fila: 'f' },
    { nombre: 'modalidad', etiqueta: 'Modalidad', tipo: 'select', opciones: [['virtual', 'Virtual'], ['presencial', 'Presencial']], defecto: 'virtual' },
    { nombre: 'enlace', etiqueta: 'Enlace de la clase', tipo: 'url', max: 500, placeholder: 'https://meet.google.com/…', ayuda: 'Google Meet, Zoom, YouTube Live… Los niños lo ven 15 minutos antes.', si: (d) => d.modalidad === 'virtual' },
    { nombre: 'lugar', etiqueta: 'Lugar', tipo: 'texto', max: 160, si: (d) => d.modalidad === 'presencial' },
    { nombre: 'cupos', etiqueta: 'Cupos', tipo: 'numero', min: 1, ayuda: 'Déjalo vacío si no hay límite (no se pide reservar).' },
    { nombre: 'publicado', etiqueta: 'Publicada', tipo: 'bool', defecto: true },
  ];
}

export async function vistaClases({ panel, contenedor }) {
  const [{ filas }, op] = await Promise.all([api.get('admin/lista', { recurso: 'clases_vivo' }), opciones()]);
  const ahora = Date.now();
  const fin = (c) => new Date(c.inicia_en.replace(' ', 'T')).getTime() + c.duracion_min * 60000;
  const proximas = filas.filter((c) => fin(c) >= ahora).reverse();
  const pasadas = filas.filter((c) => fin(c) < ahora);
  const fecha = (s) => new Date(s.replace(' ', 'T')).toLocaleString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const tabla = (lista) => lista.length ? `<table class="tabla tarjetas"><thead><tr><th>Cuándo</th><th>Clase</th><th class="ocultar-movil">Curso</th><th>Reservas</th><th></th></tr></thead><tbody>
    ${lista.map((c) => `<tr><td><strong>${h(fecha(c.inicia_en))}</strong><br><small>${c.duracion_min} min · ${c.modalidad}</small></td><td class="t-primero">${h(c.titulo)} ${c.publicado ? '' : pub(0)}</td>
      <td class="ocultar-movil">${h(c.curso || '—')}</td><td data-etq="Reservas">${c.reservas}${c.cupos ? ' / ' + c.cupos : ''}${c.asistentes ? ` · ${c.asistentes} asistieron` : ''}</td>
      <td class="t-acciones"><div class="acciones-fila"><button type="button" class="btn-mini" data-asist="${c.id}">Asistencia</button><button type="button" class="btn-mini" data-copiar="${c.id}">Mensaje</button><button type="button" class="btn-mini primario" data-editar="${c.id}">Editar</button></div></td></tr>`).join('')}</tbody></table>`
    : '<p class="vacio-p">No hay clases aquí.</p>';
  contenedor.innerHTML = `
    <div class="p-cabeza"><div><h1>Clases en vivo</h1><p>Los niños ven la próxima clase en su inicio y el botón para unirse se activa 15 minutos antes.</p></div>
    <button type="button" class="btn" data-nueva>${icono('mas')} Nueva clase</button></div>
    <section class="caja tabla-envoltura"><h2>Próximas</h2>${tabla(proximas)}</section>
    <section class="caja tabla-envoltura"><h2>Pasadas</h2>${tabla(pasadas)}</section>`;
  const porId = (id) => filas.find((c) => String(c.id) === String(id));
  contenedor.querySelector('[data-nueva]').onclick = async () => {
    const f = await panel.editar({ recurso: 'clases_vivo', titulo: 'Nueva clase en vivo', campos: camposClase(op.cursos), valores: { publicado: 1, duracion_min: 60, modalidad: 'virtual' } });
    if (f) panel.navegar();
  };
  contenedor.querySelectorAll('[data-editar]').forEach((b) => (b.onclick = async () => {
    const f = await panel.editar({ recurso: 'clases_vivo', id: Number(b.dataset.editar), titulo: 'Editar clase', campos: camposClase(op.cursos), valores: porId(b.dataset.editar), eliminar: 'Se borrarán las reservas de esta clase.' });
    if (f) panel.navegar();
  }));
  contenedor.querySelectorAll('[data-copiar]').forEach((b) => (b.onclick = async () => {
    const c = porId(b.dataset.copiar);
    const texto = `¡Hola, familia MiWalela! Recuerden nuestra clase en vivo «${c.titulo}» el ${fecha(c.inicia_en)}. ${c.descripcion || ''} Entren al campus con su usuario y toquen «Unirme a la clase». ¡Los esperamos!`;
    try { await navigator.clipboard.writeText(texto); aviso('Mensaje copiado. Pégalo en WhatsApp.', 'bien'); } catch { ventana(`<h2>Mensaje para WhatsApp</h2><textarea class="entrada" rows="6">${h(texto)}</textarea>`); }
  }));
  contenedor.querySelectorAll('[data-asist]').forEach((b) => (b.onclick = async () => {
    const d = await api.get('admin/clase', { id: b.dataset.asist });
    const { caja } = ventana(`<h2>${h(d.clase.titulo)}</h2><p class="ayuda">${h(d.cuando)}</p>
      <div class="lista-simple" style="margin-top:14px">${d.reservas.length ? d.reservas.map((r) => `<div><img src="${img(r.avatar)}" alt=""><span class="txt"><strong>${h(r.nombre)}</strong><small>@${h(r.usuario)} · ${h(r.acudiente)}${r.celular ? ` · <a href="https://wa.me/57${h(r.celular)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}</small></span>
        <label class="interruptor"><input type="checkbox" data-est="${r.id}" ${r.asistio_en ? 'checked' : ''}> Asistió</label></div>`).join('') : '<p class="vacio-p">Nadie ha reservado todavía.</p>'}</div>`, { clase: 'grande' });
    caja.querySelectorAll('[data-est]').forEach((i) => (i.onchange = async () => {
      try { await api.post('admin/clase/asistencia', { clase_id: d.clase.id, estudiante_id: Number(i.dataset.est), asistio: i.checked }); aviso(i.checked ? 'Asistencia registrada (+estrellas)' : 'Asistencia quitada', 'bien'); } catch (e) { avisoError(e); i.checked = !i.checked; }
    }));
  }));
}

/* ===================== Reto de la semana ===================== */
const CAMPOS_RETO_SEMANA = [
  { nombre: 'titulo', etiqueta: 'Reto', tipo: 'texto', requerido: true, max: 160, placeholder: 'Crea un estampado flor–corazón–flor–corazón' },
  { nombre: 'descripcion', etiqueta: 'Explicación', tipo: 'texto', max: 255 },
  { nombre: 'estrellas', etiqueta: 'Estrellas al subir la foto', tipo: 'numero', min: 0, maximo: 500, defecto: 20 },
  { nombre: 'inicia', etiqueta: 'Desde', tipo: 'fecha', requerido: true, fila: 'r' },
  { nombre: 'termina', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, fila: 'r' },
  { nombre: 'publicado', etiqueta: 'Publicado', tipo: 'bool', defecto: true },
];

export async function vistaRetosSemana({ panel, contenedor }) {
  const { filas } = await api.get('admin/lista', { recurso: 'retos_semana' });
  const hoy = new Date().toISOString().slice(0, 10);
  contenedor.innerHTML = `
    <div class="p-cabeza"><div><h1>Reto de la semana</h1><p>Un reto corto que aparece en el inicio. Los niños suben una foto y ganan estrellas.</p></div>
    <button type="button" class="btn" data-nuevo>${icono('mas')} Nuevo reto</button></div>
    <section class="caja tabla-envoltura">${filas.length ? `<table class="tabla tarjetas"><thead><tr><th>Reto</th><th>Fechas</th><th>Fotos</th><th>Estado</th><th></th></tr></thead><tbody>
    ${filas.map((r) => `<tr><td class="t-primero"><strong>${h(r.titulo)}</strong><br><small>${r.estrellas} ★</small></td><td>${h(r.inicia)} → ${h(r.termina)} ${r.inicia <= hoy && r.termina >= hoy ? '<span class="estado-pub si">Esta semana</span>' : ''}</td>
      <td data-etq="Fotos">${r.fotos}</td><td>${pub(r.publicado)}</td><td class="t-acciones"><div class="acciones-fila"><button type="button" class="btn-mini primario" data-editar="${r.id}">Editar</button></div></td></tr>`).join('')}</tbody></table>` : '<p class="vacio-p">Aún no hay retos.</p>'}</section>`;
  contenedor.querySelector('[data-nuevo]').onclick = async () => {
    const lunes = new Date(); lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
    const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
    const f = await panel.editar({ recurso: 'retos_semana', titulo: 'Nuevo reto de la semana', campos: CAMPOS_RETO_SEMANA, valores: { inicia: lunes.toISOString().slice(0, 10), termina: domingo.toISOString().slice(0, 10), estrellas: 20, publicado: 1 } });
    if (f) panel.navegar();
  };
  contenedor.querySelectorAll('[data-editar]').forEach((b) => (b.onclick = async () => {
    const f = await panel.editar({ recurso: 'retos_semana', id: Number(b.dataset.editar), titulo: 'Editar reto', campos: CAMPOS_RETO_SEMANA, valores: filas.find((x) => String(x.id) === b.dataset.editar), eliminar: true });
    if (f) panel.navegar();
  }));
}

/* ===================== Insignias ===================== */
const CRITERIOS = [
  ['registro', 'Al registrarse'], ['reto', 'Al completar un reto'], ['sesion', 'Al completar una sesión'], ['curso', 'Al completar un curso'],
  ['guia', 'Al terminar una guía'], ['videos', 'Al ver cierta cantidad de videos'], ['clase_vivo', 'Al asistir a clases en vivo'],
  ['coleccion', 'Al subir fotos a su colección'], ['estrellas', 'Al reunir estrellas'], ['racha', 'Al entrar varios días seguidos'],
];

function camposInsignia(op) {
  const refs = {
    reto: op.retos.map((r) => [r.id, `${r.etiqueta} · ${r.sesion} · ${r.titulo}`]),
    sesion: op.sesiones.map((s) => [s.id, `${s.etiqueta} · ${s.titulo}`]),
    curso: op.cursos.map((c) => [c.id, `${c.etiqueta} · ${c.titulo}`]),
    guia: op.guias.map((g) => [g.id, `${g.etiqueta ? g.etiqueta + ' · ' : ''}${g.titulo}`]),
  };
  const selRef = (tipo, txt) => ({ nombre: 'ref_' + tipo, etiqueta: txt, tipo: 'select', opciones: [['', 'Elige…'], ...refs[tipo]], si: (d) => d.criterio === tipo });
  return [
    { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true, max: 80 },
    { nombre: 'descripcion', etiqueta: 'Descripción (se muestra al ganarla)', tipo: 'texto', max: 255 },
    { nombre: 'imagen', etiqueta: 'Imagen (opcional)', tipo: 'imagen', carpeta: 'insignias', ayuda: 'Si no subes imagen se usa un ícono de color.' },
    { nombre: 'icono', etiqueta: 'Ícono', tipo: 'select', opciones: [['estrella', 'Estrella'], ['corazon', 'Corazón'], ['camara', 'Cámara'], ['foto', 'Foto'], ['tijeras', 'Tijeras'], ['hilo', 'Hilo'], ['boton', 'Botón'], ['trofeo', 'Trofeo'], ['cohete', 'Cohete']], defecto: 'estrella', si: (d) => !d.imagen, fila: 'i' },
    { nombre: 'color', etiqueta: 'Color', tipo: 'color', defecto: 'amarillo', fila: 'i' },
    { nombre: 'criterio', etiqueta: '¿Cómo se gana?', tipo: 'select', opciones: CRITERIOS, defecto: 'reto',
      antesDeGuardar: (d) => { d.referencia_id = d['ref_' + d.criterio] || null; if (!['videos', 'clase_vivo', 'coleccion', 'estrellas', 'racha'].includes(d.criterio)) d.cantidad = 1; } },
    selRef('reto', '¿Qué reto?'), selRef('sesion', '¿Qué sesión?'), selRef('curso', '¿Qué curso?'), selRef('guia', '¿Qué guía?'),
    { nombre: 'cantidad', etiqueta: 'Cantidad necesaria', tipo: 'numero', min: 1, si: (d) => ['videos', 'clase_vivo', 'coleccion', 'estrellas', 'racha'].includes(d.criterio) },
    { nombre: 'activa', etiqueta: 'Activa', tipo: 'bool', defecto: true },
  ];
}

export async function vistaInsignias({ panel, contenedor }) {
  const [{ filas }, op] = await Promise.all([api.get('admin/lista', { recurso: 'insignias' }), opciones()]);
  contenedor.innerHTML = `
    <div class="p-cabeza"><div><h1>Insignias</h1><p>Premios que los niños ganan automáticamente al lograr algo.</p></div><button type="button" class="btn" data-nueva>${icono('mas')} Nueva insignia</button></div>
    <div class="insignias-p">${filas.map((i, k) => `<button type="button" class="insignia-p ${i.activa ? '' : 'inactiva'}" data-k="${k}"><span class="disco">${discoInsignia(i)}</span>
      <strong>${h(i.nombre)}</strong><small>${h((CRITERIOS.find((c) => c[0] === i.criterio) || [])[1] || i.criterio)}</small><small>${i.ganadas} niño${i.ganadas === 1 ? '' : 's'} la tienen</small></button>`).join('')}</div>`;
  const abrir = async (ins) => {
    const valores = ins ? { ...ins, ['ref_' + ins.criterio]: ins.referencia_id } : { criterio: 'reto', color: 'amarillo', activa: 1 };
    const campos = camposInsignia(op);
    const f = await panel.editar({ recurso: 'insignias', id: ins ? ins.id : null, titulo: ins ? 'Editar insignia' : 'Nueva insignia', campos, valores, eliminar: 'Los niños que la ganaron la perderán.' });
    if (f) panel.navegar();
  };
  contenedor.querySelector('[data-nueva]').onclick = () => abrir(null);
  contenedor.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => abrir(filas[Number(b.dataset.k)])));
}

/* ===================== Niveles ===================== */
export async function vistaNiveles({ panel, contenedor }) {
  const { filas } = await api.get('admin/lista', { recurso: 'niveles' });
  contenedor.innerHTML = `
    <div class="p-cabeza"><div><h1>Niveles</h1><p>Los niños suben de nivel al reunir estrellas.</p></div><button type="button" class="btn" data-nuevo>${icono('mas')} Agregar nivel</button></div>
    <section class="caja"><p class="nota-p" style="margin-bottom:14px">Tip: escribe <b>Diseñador{a|}</b> y el campus dirá «Diseñadora» a las niñas, «Diseñador» a los niños y «Diseñador(a)» si prefirieron no decirlo.</p>
    <div class="tabla-envoltura"><table class="tabla tarjetas"><thead><tr><th>Nivel</th><th>Nombre</th><th>Desde (estrellas)</th><th></th></tr></thead><tbody>
    ${filas.map((n) => `<tr data-id="${n.id}"><td class="t-campo" data-etq="Nivel"><input class="entrada" style="width:80px;min-height:40px" type="number" min="1" name="numero" value="${n.numero}"></td>
      <td class="t-campo t-primero" data-etq="Nombre"><input class="entrada" style="min-height:40px" name="nombre" maxlength="80" value="${h(n.nombre)}"></td>
      <td class="t-campo" data-etq="Desde (estrellas)"><input class="entrada" style="width:130px;min-height:40px" type="number" min="0" name="estrellas_min" value="${n.estrellas_min}"></td>
      <td class="t-acciones"><div class="acciones-fila"><button type="button" class="btn-mini primario" data-guardar>Guardar</button><button type="button" class="btn-mini peligro" data-borrar>Quitar</button></div></td></tr>`).join('')}</tbody></table></div></section>`;
  contenedor.querySelectorAll('tr[data-id]').forEach((tr) => {
    const id = Number(tr.dataset.id);
    const datos = () => ({ numero: tr.querySelector('[name=numero]').value, nombre: tr.querySelector('[name=nombre]').value, estrellas_min: tr.querySelector('[name=estrellas_min]').value });
    tr.querySelector('[data-guardar]').onclick = (e) => conCarga(e.currentTarget, async () => { try { await api.post('admin/guardar', { recurso: 'niveles', id, datos: datos() }); aviso('Nivel guardado', 'bien'); } catch (err) { avisoError(err); } });
    tr.querySelector('[data-borrar]').onclick = async () => {
      if (!(await confirmar('¿Quitar este nivel?', 'Los niños se reubicarán en los niveles que queden.', { si: 'Quitar', peligro: true }))) return;
      try { await api.post('admin/eliminar', { recurso: 'niveles', id }); panel.navegar(); } catch (err) { avisoError(err); }
    };
  });
  contenedor.querySelector('[data-nuevo]').onclick = async () => {
    const ultimo = filas[filas.length - 1];
    const f = await panel.editar({ recurso: 'niveles', titulo: 'Nuevo nivel', campos: [
      { nombre: 'numero', etiqueta: 'Número', tipo: 'numero', requerido: true, min: 1, fila: 'n' },
      { nombre: 'estrellas_min', etiqueta: 'Desde cuántas estrellas', tipo: 'numero', requerido: true, min: 0, fila: 'n' },
      { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true, max: 80 },
    ], valores: { numero: (ultimo ? ultimo.numero : 0) + 1, estrellas_min: (ultimo ? ultimo.estrellas_min : 0) + 200 } });
    if (f) panel.navegar();
  };
}
