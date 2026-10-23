/**
 * Panel de la profe sin servidor: resumen y publicación, ajustes del campus
 * y lectura de la copia de progreso que envía un niño.
 */
import * as api from '../comun/api.js';
import { h, icono, aviso, avisoError, conCarga, confirmar, ventana, cinta, discoInsignia } from '../comun/ui.js';
import { contenido, porId, ordenada, tabla } from '../local/contenido.js';
import { hayCambios, estadoBorrador, archivosPorCopiar, usarPublicado, abrirArchivoContenido, textoPublicacion } from '../local/rutas-admin.js';
import { restaurar } from '../local/almacen.js';
import { limpiarCache, evaluarCurso } from '../local/progreso.js';
import { nivel } from '../local/gamificacion.js';
import { avatarDe } from '../local/publico.js';
import { Formato, tiempo } from '../local/util.js';

const img = (r) => h(api.url(r));
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

/* ===================== Resumen y publicar ===================== */
export async function vistaResumen({ panel, contenedor }) {
  const c = contenido();
  const cursos = c.cursos.filter((x) => x.publicado);
  const sesiones = c.sesiones.filter((s) => s.publicado && cursos.some((x) => x.id === s.curso_id));
  const retos = c.retos.filter((r) => sesiones.some((s) => s.id === r.sesion_id));
  const videos = retos.filter((r) => r.tipo === 'video');
  const sinVideo = videos.filter((r) => !r.video_url);
  const proximas = c.clases_vivo.filter((x) => x.publicado && tiempo(x.inicia_en) + (x.duracion_min || 60) * 60000 > Date.now())
    .sort((a, b) => tiempo(a.inicia_en) - tiempo(b.inicia_en));
  const e = panel.estado();
  const b = estadoBorrador();
  const copiar = archivosPorCopiar();
  const avisos = [];
  if (!c.ajustes.whatsapp) avisos.push('Escribe tu número de WhatsApp en <a href="#/ajustes">Ajustes</a>: por allí te llegan las preguntas, fotos y reservas de los niños.');
  if (sinVideo.length) avisos.push(`Hay ${plural(sinVideo.length, 'reto de video', 'retos de video')} sin video: ${sinVideo.map((r) => `«${h(r.titulo)}»`).join(', ')}.`);
  if (copiar.length) avisos.push(`Antes de subir el campus, copia en la carpeta <b>assets/media</b>: ${copiar.map((r) => `<code>${h(r.replace(/^assets\/media\//, ''))}</code>`).join(', ')}.`);

  const tile = (n, txt, ic, col, enlace) => `<a href="${enlace}" class="tile"><span class="ico" style="background:var(--${col}-s);color:var(--${col}-f)">${icono(ic, 26)}</span><div><b>${n}</b><span>${txt}</span></div></a>`;
  contenedor.innerHTML = `
    <div class="p-cabeza"><div><h1>¡Hola, profe!</h1><p>Aquí preparas el contenido del campus y lo publicas para las familias.</p></div>
      <div class="acciones-fila"><button type="button" class="btn btn-borde btn-p" data-previa>${icono('ojo', 18)} Ver en el campus</button><a class="btn btn-p" href="#/curso/nuevo">${icono('mas', 18)} Nuevo curso</a></div></div>
    ${panel.aviso === 'nuevo-publicado' ? `<div class="caja aviso-borrador"><h2>Hay un contenido publicado más nuevo</h2>
      <p>El archivo <b>datos/contenido.js</b> de esta carpeta es más reciente que tu borrador (quizá publicaste desde otro computador).</p>
      <div class="acciones-fila" style="justify-content:flex-start;margin-top:12px"><button type="button" class="btn btn-p" data-usar-publicado>Usar el publicado</button><button type="button" class="btn btn-borde btn-p" data-seguir>Seguir con mi borrador</button></div></div>` : ''}
    <section class="caja publicar-caja ${e.clase}">
      <div><strong class="estado-borrador ${e.clase}">${h(e.texto)}</strong>
        <h2 style="margin:8px 0 4px">${e.clase === 'si' ? 'El campus está al día' : e.clase === 'listo' ? 'Ya guardaste el contenido: falta subirlo' : 'Tienes cambios que las familias aún no ven'}</h2>
        <p class="ayuda">${e.clase === 'no' ? 'Tus cambios están guardados en este navegador. Cuando termines, toca «Publicar».' : e.clase === 'listo' ? `Guardaste contenido.js el ${h(Formato.diaHora(b.exportado_en))}. Súbelo junto con la carpeta del campus.` : 'Todo lo que ves aquí ya está en el archivo datos/contenido.js de esta carpeta.'}</p></div>
      <button type="button" class="btn btn-g" data-publicar-grande>${icono('enviar', 22)} Publicar</button>
    </section>
    ${avisos.length ? `<section class="caja"><h2>Para revisar</h2><ul class="lista-avisos">${avisos.map((a) => `<li>${a}</li>`).join('')}</ul></section>` : ''}
    <div class="tiles">
      ${tile(cursos.length, 'cursos publicados', 'tijeras', 'lila', '#/cursos')}
      ${tile(sesiones.length, 'sesiones', 'libro', 'turq', '#/cursos')}
      ${tile(retos.length, `retos (${plural(videos.length, 'video', 'videos')})`, 'chispa', 'amar', '#/cursos')}
      ${tile(c.guias.filter((g) => g.publicado).length, 'guías', 'libro', 'rosa', '#/guias')}
      ${tile(proximas.length, 'clases próximas', 'camara', 'turq', '#/clases')}
      ${tile(c.insignias.filter((i) => i.activa).length, 'insignias activas', 'medalla', 'lila', '#/insignias')}
    </div>
    <div class="dos-columnas">
      <section class="caja"><h2>Cómo funciona sin servidor</h2>
        <ol class="pasos-publicar">
          <li><b>Edita aquí</b> cursos, videos, guías, clases e insignias. Todo queda guardado en este navegador.</li>
          <li>Toca <b>Ver en el campus</b> para probarlo como lo verán los niños.</li>
          <li>Toca <b>Publicar</b>: se guarda el archivo <code>contenido.js</code>. Ponlo en la carpeta <code>datos</code> del campus.</li>
          <li><b>Sube la carpeta</b> del campus a tu hosting gratuito. ¡Listo!</li>
        </ol>
        <p class="nota-p">Las preguntas, fotos y reservas de los niños te llegan por WhatsApp. Para ver el avance de un niño, pídele su copia de progreso y ábrela en <a href="#/progreso">Progreso de un niño</a>.</p></section>
      <section class="caja"><h2>Próximas clases en vivo <a class="btn-mini" href="#/clases">Ver todas</a></h2>
        <div class="lista-simple">${proximas.slice(0, 4).map((x) => `<a href="#/clases"><span style="color:var(--turq-f)">${icono('camara', 24)}</span><span class="txt"><strong>${h(x.titulo)}</strong><small>${h(Formato.diaHora(x.inicia_en))}${x.cupos ? ` · ${x.cupos} cupos` : ''}</small></span></a>`).join('')
          || '<p class="vacio-p">No hay clases programadas. <a href="#/clases">Programa una</a>.</p>'}</div></section>
    </div>`;
  contenedor.querySelector('[data-previa]').onclick = () => panel.verEnCampus();
  contenedor.querySelector('[data-publicar-grande]').onclick = () => panel.publicar();
  const usar = contenedor.querySelector('[data-usar-publicado]');
  if (usar) {
    usar.onclick = async () => {
      if (!(await confirmar('¿Usar el contenido publicado?', 'Se descartarán los cambios de tu borrador que no hayas publicado.', { si: 'Usar el publicado', peligro: true }))) return;
      await usarPublicado(); panel.aviso = null; aviso('Listo: ahora editas el contenido publicado.', 'bien'); panel.navegar();
    };
    contenedor.querySelector('[data-seguir]').onclick = () => { panel.aviso = null; panel.navegar(); };
  }
}

/* ===================== Ajustes ===================== */
export async function vistaAjustes({ panel, contenedor }) {
  const { ajustes: aj } = await api.get('admin/ajustes');
  const campo = (clave, etiqueta, extra = '', ayuda = '') => `<div class="campo"><label for="a-${clave}">${etiqueta}</label><input class="entrada" id="a-${clave}" name="${clave}" value="${h(aj[clave] ?? '')}" ${extra}>${ayuda ? `<span class="ayuda">${ayuda}</span>` : ''}</div>`;
  contenedor.innerHTML = `
    <div class="p-cabeza"><div><h1>Ajustes</h1><p>Datos del campus y copias de tu contenido.</p></div></div>
    <div class="dos-columnas">
      <section class="caja"><h2>El campus</h2><form class="form" novalidate data-ajustes>
        ${campo('nombre_sitio', 'Nombre del campus', 'maxlength="120"')}
        ${campo('lema', 'Lema', 'maxlength="120"')}
        ${campo('mensaje_ayuda', 'Mensaje de ayuda (menú de los niños)', 'maxlength="160"')}
        <div class="fila-campos">${campo('whatsapp', 'WhatsApp de la profe', 'maxlength="20" inputmode="tel"', 'Con indicativo, sin +. Ej.: 573001234567. Aquí llegan preguntas, fotos y reservas.')}${campo('instagram', 'Instagram', 'maxlength="60"', 'Solo el usuario, sin @')}</div>
        ${campo('correo_contacto', 'Correo de contacto', 'type="email" maxlength="160"')}
        <h3 style="margin-top:8px">Estrellas automáticas</h3>
        <div class="fila-campos">${campo('estrellas_registro', 'Al registrarse', 'type="number" min="0" max="999"')}${campo('estrellas_clase_vivo', 'Al unirse a una clase en vivo', 'type="number" min="0" max="999"')}</div>
        <div class="pie-form"><button type="submit" class="btn btn-p">Guardar ajustes</button></div></form></section>
      <section class="caja"><h2>Copias del contenido</h2>
        <p class="ayuda" style="margin-bottom:12px">Tu borrador vive en este navegador. Si cambias de computador, abre allá el <code>contenido.js</code> que publicaste.</p>
        <div class="lista-simple">
          <div><span class="txt"><strong>Descargar copia del borrador</strong><small>Un contenido.js con lo que tienes ahora (aunque no lo hayas publicado).</small></span><button type="button" class="btn-mini primario" data-copia>Descargar</button></div>
          <div><span class="txt"><strong>Abrir un contenido.js</strong><small>Reemplaza tu borrador por el de ese archivo.</small></span><button type="button" class="btn-mini" data-abrir-archivo>Elegir archivo</button></div>
          <div><span class="txt"><strong>Descartar mis cambios</strong><small>Vuelve al contenido publicado en la carpeta.</small></span><button type="button" class="btn-mini peligro" data-descartar ${hayCambios() ? '' : 'disabled'}>Descartar</button></div>
        </div></section>
    </div>`;
  const fa = contenedor.querySelector('[data-ajustes]');
  fa.onsubmit = (ev) => {
    ev.preventDefault();
    const ajustes = {};
    fa.querySelectorAll('input').forEach((i) => { ajustes[i.name] = i.value.trim(); });
    conCarga(fa.querySelector('[type=submit]'), async () => { try { await api.post('admin/ajustes', { ajustes }); aviso('¡Ajustes guardados!', 'bien'); } catch (err) { avisoError(err); } });
  };
  contenedor.querySelector('[data-copia]').onclick = () => {
    const { texto } = textoPublicacion();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([texto], { type: 'text/javascript' }));
    a.download = 'contenido-borrador.js';
    document.body.appendChild(a); a.click(); a.remove();
  };
  contenedor.querySelector('[data-abrir-archivo]').onclick = () => {
    const i = document.createElement('input');
    i.type = 'file';
    i.accept = '.js,text/javascript,application/javascript';
    i.onchange = async () => {
      const f = i.files && i.files[0];
      if (!f) return;
      if (!(await confirmar('¿Abrir este contenido?', 'Tu borrador actual se reemplazará por el del archivo.', { si: 'Sí, abrir' }))) return;
      try { await abrirArchivoContenido(await f.text()); aviso('Contenido abierto. Revísalo y publícalo cuando quieras.', 'bien'); panel.ir('/resumen'); } catch (err) { avisoError(err); }
    };
    i.click();
  };
  contenedor.querySelector('[data-descartar]').onclick = async () => {
    if (!(await confirmar('¿Descartar tus cambios?', 'Volverás al contenido publicado. Lo que no hayas publicado se perderá.', { si: 'Sí, descartar', peligro: true }))) return;
    await usarPublicado(); aviso('Cambios descartados.', 'bien'); panel.ir('/resumen');
  };
}

/* ===================== Progreso de un niño (copia que envía la familia) ===================== */
export async function vistaProgreso({ contenedor }) {
  contenedor.innerHTML = `
    <div class="p-cabeza"><div><h1>Progreso de un niño</h1><p>Sin servidor, el progreso de cada niño vive en su dispositivo. Pídele a la familia que toque «Enviar copia a mi profe» en <i>Mis logros</i> y abre aquí ese archivo.</p></div>
      <button type="button" class="btn" data-abrir-copia>${icono('descargar', 18, 'style="transform:rotate(180deg)"')} Abrir copia de progreso</button></div>
    <div data-resultado><section class="caja vacio-p">
      <img src="${img('assets/img/personajes/walela-piensa.webp')}" alt="" style="width:120px;margin:0 auto 10px">
      <h2>Abre la copia que te llegó por WhatsApp</h2><p>Es un archivo que empieza por <code>miwalela-progreso-</code> y termina en <code>.json</code>. No se guarda en ningún lado: solo lo ves mientras esta página esté abierta.</p></section></div>`;
  contenedor.querySelector('[data-abrir-copia]').onclick = () => {
    const i = document.createElement('input');
    i.type = 'file';
    i.accept = '.json,application/json';
    i.onchange = async () => {
      const f = i.files && i.files[0];
      if (!f) return;
      try {
        const copia = JSON.parse(await f.text());
        if (!copia || copia.tipo !== 'miwalela-copia' || !copia.tablas) throw new Error('Ese archivo no es una copia de progreso del campus.');
        pintarCopia(contenedor.querySelector('[data-resultado]'), copia);
      } catch (err) { avisoError({ message: err.message.startsWith('Ese') ? err.message : 'No pudimos leer ese archivo.' }); }
    };
    i.click();
  };
}

function pintarCopia(caja, copia) {
  const T = copia.tablas;
  restaurar(JSON.stringify({ version: 1, seq: {}, acudientes: [copia.acudiente], ...T }));
  limpiarCache();
  const acu = copia.acudiente || {};
  const wa = String(acu.celular || '').replace(/\D+/g, '');
  const enlaceWa = wa ? `https://wa.me/${wa.length === 10 ? '57' + wa : wa}` : '';
  caja.innerHTML = T.estudiantes.map((e) => {
    const de = (t) => (T[t] || []).filter((f) => f.estudiante_id === e.id);
    const n = nivel(Number(e.estrellas || 0), e.genero);
    const cursos = ordenada('cursos', (x) => x.publicado).map((cu) => ({ cu, ev: evaluarCurso(cu, e) })).filter((x) => x.ev.total > 0);
    const ganadas = de('insignias_estudiante').map((x) => ({ ins: porId('insignias', x.insignia_id), fecha: x.ganada_en })).filter((x) => x.ins);
    const reflex = de('reflexiones').filter((r) => r.me_gusto || r.material_nuevo || r.aprendi || r.quiero_crear);
    const preguntas = de('preguntas').sort((a, b) => b.id - a.id);
    const fotos = de('coleccion').filter((f) => f.foto).sort((a, b) => b.id - a.id);
    const movs = de('movimientos_estrellas').sort((a, b) => b.id - a.id).slice(0, 12);
    const nombreSesion = (id) => { const s = porId('sesiones', id); const c = s ? porId('cursos', s.curso_id) : null; return s ? `${c ? c.etiqueta + ' · ' : ''}${s.titulo}` : 'Sesión'; };
    return `<section class="ficha-nino">
      <div class="p-cabeza" style="margin-bottom:14px"><div>
        <h2 style="display:flex;align-items:center;gap:14px;font-size:28px"><span class="avatar" style="width:64px;height:64px"><img src="${img(avatarDe(e.personaje))}" alt=""></span>${h(e.nombre)}</h2>
        <p>@${h(e.usuario)} · ${e.edad} años · ${h(e.grado)} · ${h(n.nombre)} · <strong>${e.estrellas} ★</strong> · Racha: ${plural(e.racha_dias || 0, 'día', 'días')} · Copia: ${h(Formato.diaHora(copia.creada_en))}</p></div>
        <div class="acciones-fila">${enlaceWa ? `<a class="btn btn-turq btn-p" href="${h(enlaceWa)}" target="_blank" rel="noopener">${icono('chat', 18)} Escribir a ${h(acu.nombre || 'la familia')}</a>` : ''}</div></div>
      <div class="dos-columnas">
        <div>
          <section class="caja"><h2>Avance en los cursos</h2>
            ${cursos.length ? cursos.map(({ cu, ev }) => `<div style="margin-bottom:16px"><strong>${h(cu.etiqueta)} · ${h(cu.titulo)}</strong>${cinta(ev.porcentaje, `${ev.hechos} de ${ev.total} retos`)}
              <div class="lista-retos">${ev.sesiones.map((s) => `<div class="reto-fila"><div class="txt"><strong>Sesión ${s.numero}: ${h(s.titulo)}</strong>
                <small>${s.fila.retos.map((r) => `${ev && T.progreso_retos.some((p) => p.estudiante_id === e.id && p.reto_id === r.id && p.estado === 'completado') ? '✅' : '⬜'} ${h(r.titulo)}`).join(' · ')}</small></div></div>`).join('')}</div></div>`).join('')
              : '<p class="vacio-p">Todavía no ha empezado ningún curso.</p>'}</section>
          <section class="caja"><h2>«¿Qué aprendí hoy?»</h2>
            ${reflex.length ? reflex.map((r) => `<div class="pregunta-p"><div class="cuerpo"><span class="meta">${h(nombreSesion(r.sesion_id))}</span>
              ${[['me_gusto', 'Lo que más le gustó'], ['material_nuevo', 'Material nuevo'], ['aprendi', 'Lo que aprendió'], ['quiero_crear', 'Quiere crear']].filter(([k]) => r[k]).map(([k, t]) => `<blockquote><small style="display:block;color:var(--tinta-3)">${t}</small>${h(r[k])}</blockquote>`).join('')}</div></div>`).join('')
              : '<p class="vacio-p">No ha escrito en su cuaderno todavía.</p>'}</section>
          <section class="caja"><h2>Su colección (${fotos.length})</h2>
            <div class="fotos-p">${fotos.map((f, k) => `<button type="button" class="foto-p" data-foto="${e.id}:${k}"><img src="${f.foto}" alt="" loading="lazy"><div><strong>${h(f.titulo)}</strong><small>${h(Formato.fechaCorta(f.creado_en))}</small></div></button>`).join('') || '<p class="vacio-p">No ha subido fotos.</p>'}</div></section>
        </div>
        <div>
          <section class="caja"><h2>Insignias (${ganadas.length} de ${tabla('insignias').filter((i) => i.activa).length})</h2>
            <div class="insignias-p">${ganadas.map(({ ins, fecha }) => `<div class="insignia-p" style="cursor:default"><span class="disco">${discoInsignia(ins)}</span><strong>${h(ins.nombre)}</strong><small>${h(Formato.fechaCorta(fecha))}</small></div>`).join('') || '<p class="vacio-p">Aún no tiene insignias.</p>'}</div></section>
          <section class="caja"><h2>Sus preguntas</h2>
            <div class="lista-simple">${preguntas.map((p) => `<div><span class="txt"><strong>${h(p.texto)}</strong><small>${h(p.sesion_id ? nombreSesion(p.sesion_id) : 'General')} · ${h(Formato.fechaCorta(p.creado_en))}</small></span></div>`).join('') || '<p class="vacio-p">No ha hecho preguntas.</p>'}</div></section>
          <section class="caja"><h2>Estrellas recientes</h2>
            <div class="lista-simple">${movs.map((m) => `<div><span class="txt"><strong>${h(m.motivo)}</strong><small>${h(Formato.fechaCorta(m.creado_en))}</small></span><strong style="color:var(--turq-f)">${m.cantidad > 0 ? '+' : ''}${m.cantidad} ★</strong></div>`).join('') || '<p class="vacio-p">Sin movimientos.</p>'}</div></section>
          <section class="caja"><h2>Familia</h2><div class="lista-simple">
            <div><span class="txt"><strong>${h(acu.nombre || '—')}</strong><small>${h(acu.parentesco || '')}${acu.correo ? ' · ' + h(acu.correo) : ''}${acu.celular ? ' · ' + h(acu.celular) : ''}</small></span></div></div></section>
        </div>
      </div></section>`;
  }).join('<hr style="border:none;border-top:2px dashed var(--rosa-borde);margin:30px 0">') || '<p class="vacio-p">La copia no tiene niños.</p>';
  caja.querySelectorAll('[data-foto]').forEach((b) => (b.onclick = () => {
    const [eid, k] = b.dataset.foto.split(':').map(Number);
    const f = (T.coleccion || []).filter((x) => x.estudiante_id === eid && x.foto).sort((a, c) => c.id - a.id)[k];
    ventana(`<img src="${f.foto}" alt="" style="width:100%;max-height:65vh;object-fit:contain;border-radius:18px;background:var(--crema)"><h2 style="margin-top:12px">${h(f.titulo)}</h2>`, { clase: 'grande' });
  }));
}
