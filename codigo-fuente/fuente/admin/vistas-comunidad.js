/**
 * Panel de la profe: resumen, estudiantes y familias, preguntas, fotos y ajustes.
 */
import * as api from '../comun/api.js';
import { textoPublicacion, marcarExportado, abrirArchivoContenido } from '../local/rutas-admin.js';
import { contenido as contenidoActual } from '../local/contenido.js';
import { h, icono, aviso, avisoError, conCarga, confirmar, ventana, discoInsignia, debounce, cinta } from '../comun/ui.js';

const img = (r) => h(api.url(r));
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const soloFecha = (s) => (s ? new Date(String(s).replace(' ', 'T')).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const whatsapp = (cel) => {
  const n = String(cel || '').replace(/\D+/g, '');
  if (!n) return '';
  return 'https://wa.me/' + (n.length === 10 ? '57' + n : n);
};

/* ===================== Resumen ===================== */
export async function vistaResumen({ panel, contenedor }) {
  const r = await api.get('admin/resumen');
  const tile = (n, txt, ic, col, enlace) => `<${enlace ? `a href="${enlace}"` : 'div'} class="tile"><span class="ico" style="background:var(--${col}-s,#FDE6EC);color:var(--${col}-f,#C2386A)">${icono(ic, 26)}</span><div><b>${n}</b><span>${txt}</span></div></${enlace ? 'a' : 'div'}>`;
  const campus = api.RAIZ;
  contenedor.innerHTML = `
    <div class="p-cabeza"><div><h1>¡Hola, ${h(panel.admin.nombre.split(' ')[0])}!</h1><p>Así va el campus de los MiniDiseñadores.</p></div>
      <div class="acciones-fila"><a class="btn btn-borde btn-p" href="#/clases">${icono('camara', 18)} Programar clase</a><a class="btn btn-p" href="#/curso/nuevo">${icono('mas', 18)} Nuevo curso</a></div></div>
    <div class="tiles">
      ${tile(r.estudiantes, 'niños y niñas activos', 'usuario', 'lila', '#/estudiantes')}
      ${tile(r.activos_semana, 'entraron esta semana', 'reloj', 'turq', '#/estudiantes')}
      ${tile(r.nuevos_semana, 'nuevos esta semana', 'chispa', 'amar')}
      ${tile(r.retos_semana, 'retos completados (7 días)', 'trofeo', 'fucsia')}
      ${tile(r.preguntas, 'preguntas por responder', 'chat', 'fucsia', '#/preguntas')}
      ${tile(r.fotos, 'fotos por revisar', 'foto', 'lila', '#/fotos')}
    </div>
    <div class="dos-columnas">
      <section class="caja"><h2>Próximas clases en vivo <a class="btn-mini" href="#/clases">Ver todas</a></h2>
        <div class="lista-simple">${r.clases.length ? r.clases.map((c) => `<a href="#/clases"><span class="ico" style="color:var(--turq-f)">${icono('camara', 24)}</span><span class="txt"><strong>${h(c.titulo)}</strong><small>${h(c.cuando)}${c.curso ? ' · ' + h(c.curso) : ''} · ${plural(c.reservas, 'reserva', 'reservas')}${c.cupos ? ' de ' + c.cupos : ''}${c.publicado ? '' : ' · borrador'}</small></span></a>`).join('')
          : '<p class="vacio-p">No hay clases programadas. <a href="#/clases">Programa una</a>.</p>'}</div></section>
      <section class="caja"><h2>Lo último que hicieron</h2>
        <div class="lista-simple">${r.actividad.length ? r.actividad.map((a) => `<div><img src="${img(a.avatar)}" alt=""><span class="txt"><strong>${h(a.nombre)} completó «${h(a.titulo)}»</strong><small>${h(a.cuando)}</small></span></div>`).join('')
          : '<p class="vacio-p">Cuando los niños completen retos, aparecerán aquí.</p>'}</div></section>
    </div>
    <section class="caja"><h2>Enlace del campus para las familias</h2>
      <p class="ayuda" style="margin-bottom:10px">Compártelo por WhatsApp: allí se registran y entran los niños.</p>
      <div class="acciones-fila" style="flex-wrap:wrap"><input class="entrada" readonly value="${h(campus)}" style="flex:1;min-width:220px" data-enlace>
        <button type="button" class="btn btn-p" data-copiar>Copiar enlace</button>
        <a class="btn btn-borde btn-p" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent('¡Hola! Este es el campus de MiWalela para los MiniDiseñadores: ' + campus)}">Enviar por WhatsApp</a></div></section>`;
  contenedor.querySelector('[data-copiar]').onclick = async () => {
    try { await navigator.clipboard.writeText(campus); aviso('Enlace copiado', 'bien'); } catch { contenedor.querySelector('[data-enlace]').select(); }
  };
}

/* ===================== Estudiantes ===================== */
export async function vistaEstudiantes({ panel, contenedor, query }) {
  const q = query.get('q') || '';
  const pagina = Math.max(1, Number(query.get('p')) || 1);
  const d = await api.get('admin/estudiantes', { q, pagina });
  const enlace = (p, texto) => `#/estudiantes?${new URLSearchParams({ ...(q ? { q } : {}), p }).toString()}`;
  contenedor.innerHTML = `
    <div class="p-cabeza"><div><h1>Estudiantes</h1><p>${plural(d.total, 'niño o niña registrado', 'niños y niñas registrados')}${q ? ` que coinciden con «${h(q)}»` : ''}.</p></div>
      <button type="button" class="btn btn-borde btn-p" data-csv>${icono('descargar', 18)} Descargar lista (Excel)</button></div>
    <section class="caja">
      <div class="campo" style="margin-bottom:14px"><input class="entrada" type="search" data-buscar placeholder="Buscar por nombre, usuario, adulto o correo…" value="${h(q)}" aria-label="Buscar estudiantes"></div>
      <div class="tabla-envoltura">${d.filas.length ? `<table class="tabla"><thead><tr><th></th><th>Nombre</th><th class="ocultar-movil">Edad · grado</th><th class="ocultar-movil">Adulto responsable</th><th>★</th><th class="ocultar-movil">Retos</th><th class="ocultar-movil">Último acceso</th></tr></thead><tbody>
      ${d.filas.map((e) => `<tr class="clic" data-id="${e.id}"><td><span class="avatar" style="width:40px;height:40px;border-width:2px"><img src="${img(e.avatar)}" alt=""></span></td>
        <td><strong>${h(e.nombre)}</strong> ${e.activo ? '' : '<span class="estado-pub no">Pausada</span>'}<br><small>@${h(e.usuario)}</small></td>
        <td class="ocultar-movil">${e.edad} años · ${h(e.grado)}</td><td class="ocultar-movil">${h(e.acudiente)}<br><small>${h(e.correo)}</small></td>
        <td><strong>${e.estrellas}</strong></td><td class="ocultar-movil">${e.retos}</td><td class="ocultar-movil">${h(e.acceso)}</td></tr>`).join('')}</tbody></table>`
        : `<p class="vacio-p">${q ? 'No encontramos a nadie con esa búsqueda.' : 'Aún no hay estudiantes. Comparte el enlace del campus con las familias.'}</p>`}</div>
      ${d.paginas > 1 ? `<div class="acciones-fila" style="justify-content:center;margin-top:14px">${pagina > 1 ? `<a class="btn-mini" href="${enlace(pagina - 1)}">← Anterior</a>` : ''}<span style="font-weight:800">Página ${pagina} de ${d.paginas}</span>${pagina < d.paginas ? `<a class="btn-mini" href="${enlace(pagina + 1)}">Siguiente →</a>` : ''}</div>` : ''}
    </section>`;
  const buscar = contenedor.querySelector('[data-buscar]');
  buscar.addEventListener('input', debounce(() => {
    const v = buscar.value.trim();
    location.hash = '/estudiantes' + (v ? '?q=' + encodeURIComponent(v) : '');
  }, 450));
  if (q) { buscar.focus(); buscar.setSelectionRange(q.length, q.length); }
  contenedor.querySelectorAll('tr[data-id]').forEach((tr) => (tr.onclick = () => panel.ir('/estudiante/' + tr.dataset.id)));
  contenedor.querySelector('[data-csv]').onclick = (ev) => conCarga(ev.currentTarget, async () => {
    try {
      let todas = [];
      for (let p = 1, total = 1; p <= total; p++) {
        const r = await api.get('admin/estudiantes', { q, pagina: p });
        total = r.paginas;
        todas = todas.concat(r.filas);
      }
      const col = ['Nombre', 'Usuario', 'Edad', 'Grado', 'Adulto', 'Correo', 'Celular', 'Estrellas', 'Retos completados', 'Último acceso', 'Registro', 'Estado'];
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const filas = todas.map((e) => [e.nombre, e.usuario, e.edad, e.grado, e.acudiente, e.correo, e.celular, e.estrellas, e.retos, e.acceso, soloFecha(e.creado_en), e.activo ? 'Activa' : 'Pausada'].map(esc).join(';'));
      const blob = new Blob(['﻿' + [col.map(esc).join(';'), ...filas].join('\r\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `estudiantes-miwalela-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e) { avisoError(e); }
  });
}

export async function vistaEstudiante({ panel, contenedor, params }) {
  const d = await api.get('admin/estudiante', { id: params[0] });
  const e = d.estudiante;
  const a = d.acudiente || {};
  const wa = whatsapp(a.celular);
  contenedor.innerHTML = `
    <div class="p-cabeza"><div><a class="enlace-sutil" href="#/estudiantes">${icono('izquierda', 18)} Estudiantes</a>
      <h1 style="display:flex;align-items:center;gap:14px"><span class="avatar" style="width:64px;height:64px"><img src="${img(e.avatar)}" alt=""></span>${h(e.nombre)}</h1>
      <p>@${h(e.usuario)} · ${e.edad} años · ${h(e.grado)} · ${h(e.nivel.nombre)} · <strong>${e.estrellas} ★</strong> · Racha: ${plural(e.racha_dias, 'día', 'días')}</p></div>
      <div class="acciones-fila" style="flex-wrap:wrap"><button type="button" class="btn btn-p" data-estrellas>${icono('estrella', 18)} Dar estrellas</button>
        <button type="button" class="btn btn-borde btn-p" data-activo>${e.activo ? 'Pausar cuenta' : 'Activar cuenta'}</button></div></div>
    ${e.activo ? '' : '<div class="alerta mal" style="margin-bottom:16px">Esta cuenta está pausada: no puede entrar al campus.</div>'}
    <div class="dos-columnas">
      <div>
        <section class="caja"><h2>Progreso en los cursos</h2>
          ${d.cursos.length ? d.cursos.map((c) => `<div style="margin-bottom:14px"><strong>${h(c.etiqueta)} · ${h(c.titulo)}</strong>${cinta(c.porcentaje, `${c.hechos} de ${c.total} retos`)}</div>`).join('') : '<p class="vacio-p">Todavía no ha empezado ningún curso.</p>'}</section>
        <section class="caja"><h2>Insignias (${d.insignias.length})</h2>
          <div class="insignias-p">${d.insignias.map((i) => `<div class="insignia-p" style="cursor:default"><span class="disco">${discoInsignia(i)}</span><strong>${h(i.nombre)}</strong><small>${h(soloFecha(i.ganada_en))}</small></div>`).join('') || '<p class="vacio-p">Aún no tiene insignias.</p>'}</div></section>
        <section class="caja"><h2>Su colección (${d.coleccion.length})</h2>
          <div class="fotos-p">${d.coleccion.map((c) => `<a class="foto-p" href="#/fotos" style="text-decoration:none;color:inherit"><img src="${img(c.imagen)}" alt="" loading="lazy"><div><strong>${h(c.titulo)}</strong><small>${c.estado === 'vista' ? 'Revisada' : 'Por revisar'} · ${h(soloFecha(c.creado_en))}</small></div></a>`).join('') || '<p class="vacio-p">No ha subido fotos.</p>'}</div></section>
      </div>
      <div>
        <section class="caja"><h2>Familia</h2>
          <div class="lista-simple">
            <div><span class="txt"><strong>${h(a.nombre || '—')}</strong><small>${h(a.parentesco || '')}</small></span></div>
            ${a.correo ? `<a href="mailto:${h(a.correo)}">${icono('enviar', 20)}<span class="txt"><strong>${h(a.correo)}</strong><small>Escribir correo</small></span></a>` : ''}
            ${wa ? `<a href="${h(wa)}" target="_blank" rel="noopener">${icono('chat', 20)}<span class="txt"><strong>${h(a.celular)}</strong><small>Escribir por WhatsApp${a.avisos_whatsapp ? ' · acepta avisos' : ''}</small></span></a>` : ''}
            ${d.hermanos.map((x) => `<a href="#/estudiante/${x.id}">${icono('usuario', 20)}<span class="txt"><strong>${h(x.nombre)}</strong><small>Hermano/a · @${h(x.usuario)}</small></span></a>`).join('')}
          </div>
          <div class="acciones-fila" style="margin-top:14px;flex-wrap:wrap"><button type="button" class="btn btn-borde btn-p" data-clave>${icono('candado', 18)} Nueva contraseña para la familia</button></div>
          <p class="ayuda" style="margin-top:8px">Registrado el ${h(soloFecha(e.creado_en))}. Último acceso: ${h(e.ultimo_acceso ? soloFecha(e.ultimo_acceso) : 'nunca')}.</p></section>
        <section class="caja"><h2>Estrellas recientes</h2>
          <div class="lista-simple">${d.movimientos.map((m) => `<div><span class="txt"><strong>${h(m.motivo)}</strong><small>${h(soloFecha(m.creado_en))}</small></span><strong style="color:${m.cantidad >= 0 ? 'var(--turq-f)' : '#B42340'}">${m.cantidad > 0 ? '+' : ''}${m.cantidad} ★</strong></div>`).join('') || '<p class="vacio-p">Sin movimientos.</p>'}</div></section>
        <section class="caja"><h2>Sus preguntas</h2>
          <div class="lista-simple">${d.preguntas.map((p) => `<a href="#/preguntas${p.respuesta ? '?estado=respondidas' : ''}"><span class="txt"><strong>${h(p.texto)}</strong><small>${p.respuesta ? 'Respondida' : 'Por responder'} · ${h(soloFecha(p.creado_en))}</small></span></a>`).join('') || '<p class="vacio-p">No ha hecho preguntas.</p>'}</div></section>
        <section class="caja"><h2>Zona delicada</h2>
          <p class="ayuda" style="margin-bottom:10px">Si la familia pide borrar sus datos, esto elimina al niño o niña, su progreso y sus fotos de forma permanente.</p>
          <button type="button" class="btn btn-borde fucsia btn-p" data-eliminar>${icono('basura', 18)} Eliminar datos de ${h(e.nombre)}</button></section>
      </div>
    </div>`;

  contenedor.querySelector('[data-estrellas]').onclick = () => {
    const { caja, cerrar } = ventana(`<h2>Dar estrellas a ${h(e.nombre)}</h2><form class="form" novalidate>
      <div class="fila-campos"><div class="campo"><label for="ce">Estrellas</label><input class="entrada" id="ce" name="cantidad" type="number" value="10" min="-1000" max="1000" required></div>
      <div class="campo"><label for="cm">¿Por qué?</label><input class="entrada" id="cm" name="motivo" maxlength="160" placeholder="¡Qué bonita presentación en clase!" required></div></div>
      <p class="ayuda">Usa un número negativo solo para corregir un error. Le llegará una notificación con el motivo.</p>
      <div class="pie-form"><button type="button" class="btn btn-borde btn-p" data-cancelar>Cancelar</button><button type="submit" class="btn btn-p">Dar estrellas</button></div></form>`);
    const f = caja.querySelector('form');
    caja.querySelector('[data-cancelar]').onclick = cerrar;
    f.motivo.focus();
    f.onsubmit = (ev) => {
      ev.preventDefault();
      conCarga(f.querySelector('[type=submit]'), async () => {
        try { await api.post('admin/estudiante/estrellas', { id: e.id, cantidad: Number(f.cantidad.value), motivo: f.motivo.value.trim() }); aviso('¡Estrellas enviadas!', 'estrellas'); cerrar(); panel.navegar(); } catch (err) { avisoError(err); }
      });
    };
  };
  contenedor.querySelector('[data-activo]').onclick = async (ev) => {
    const btn = ev.currentTarget;
    if (e.activo && !(await confirmar('¿Pausar la cuenta?', `${e.nombre} no podrá entrar al campus hasta que la actives de nuevo. Su progreso se conserva.`, { si: 'Pausar' }))) return;
    conCarga(btn, async () => { try { const r = await api.post('admin/estudiante/activo', { id: e.id, activo: !e.activo }); aviso(r.mensaje, 'bien'); panel.navegar(); } catch (err) { avisoError(err); } });
  };
  contenedor.querySelector('[data-clave]').onclick = () => {
    const sugerida = 'miwalela' + Math.floor(1000 + Math.random() * 9000);
    const { caja, cerrar } = ventana(`<h2>Nueva contraseña</h2><p class="ayuda">Para la cuenta de ${h(a.nombre || 'la familia')}. Sirve para todos sus niños. Compártela por WhatsApp.</p>
      <form class="form" novalidate><div class="campo"><label for="nc">Contraseña nueva</label><input class="entrada" id="nc" name="clave" value="${sugerida}" minlength="8" required></div>
      <div class="pie-form"><button type="button" class="btn btn-borde btn-p" data-cancelar>Cancelar</button><button type="submit" class="btn btn-p">Guardar contraseña</button></div></form>`);
    const f = caja.querySelector('form');
    caja.querySelector('[data-cancelar]').onclick = cerrar;
    f.onsubmit = (ev) => {
      ev.preventDefault();
      conCarga(f.querySelector('[type=submit]'), async () => {
        try {
          const r = await api.post('admin/acudiente/clave', { acudiente_id: a.id, clave: f.clave.value });
          cerrar();
          const texto = `Hola ${a.nombre || ''}, esta es la nueva contraseña del campus MiWalela: ${f.clave.value}\nUsuario: ${e.usuario}\n${api.RAIZ}`;
          ventana(`<h2>¡Listo!</h2><p>${h(r.mensaje)}</p><textarea class="entrada" rows="4" readonly>${h(texto)}</textarea>
            <div class="pie-form" style="margin-top:12px">${wa ? `<a class="btn btn-p" target="_blank" rel="noopener" href="${h(wa)}?text=${encodeURIComponent(texto)}">Enviar por WhatsApp</a>` : ''}</div>`);
        } catch (err) { avisoError(err); }
      });
    };
  };
  contenedor.querySelector('[data-eliminar]').onclick = () => {
    const sinHermanos = !d.hermanos.length;
    const { caja, cerrar } = ventana(`<h2>¿Eliminar los datos de ${h(e.nombre)}?</h2>
      <p>Se borrarán su usuario, progreso, estrellas, insignias, preguntas y fotos. <strong>No se puede deshacer.</strong></p>
      ${sinHermanos ? `<label class="interruptor" style="margin-top:12px"><input type="checkbox" data-familia checked> Borrar también la cuenta del adulto (${h(a.correo || '')})</label>` : ''}
      <div class="campo" style="margin-top:14px"><label for="conf">Escribe <b>${h(e.usuario)}</b> para confirmar</label><input class="entrada" id="conf" autocomplete="off"></div>
      <div class="pie-form" style="margin-top:12px"><button type="button" class="btn btn-borde btn-p" data-cancelar>Cancelar</button><button type="button" class="btn btn-p" style="background:#B42340" data-si disabled>Eliminar para siempre</button></div>`);
    const si = caja.querySelector('[data-si]');
    caja.querySelector('#conf').oninput = (ev) => { si.disabled = ev.target.value.trim().toLowerCase() !== e.usuario.toLowerCase(); };
    caja.querySelector('[data-cancelar]').onclick = cerrar;
    si.onclick = () => conCarga(si, async () => {
      try {
        await api.post('admin/estudiante/eliminar', { id: e.id, borrar_familia: !!caja.querySelector('[data-familia]')?.checked });
        cerrar(); aviso('Datos eliminados', 'bien'); panel.ir('/estudiantes');
      } catch (err) { avisoError(err); }
    });
  };
}

/* ===================== Preguntas ===================== */
export async function vistaPreguntas({ panel, contenedor, query }) {
  const respondidas = query.get('estado') === 'respondidas';
  const { filas } = await api.get('admin/preguntas', { estado: respondidas ? 'respondidas' : 'pendientes' });
  contenedor.innerHTML = `
    <div class="p-cabeza"><div><h1>Preguntas de los niños</h1><p>Lo que preguntan desde cada sesión. Al responder, les llega una notificación.</p></div></div>
    <div class="pestanas-p"><a class="btn-mini ${respondidas ? '' : 'primario'}" href="#/preguntas">Por responder</a><a class="btn-mini ${respondidas ? 'primario' : ''}" href="#/preguntas?estado=respondidas">Respondidas</a></div>
    <section class="caja">${filas.length ? filas.map((p) => `<article class="pregunta-p" data-id="${p.id}">
      <span class="avatar"><img src="${img(p.avatar)}" alt=""></span>
      <div class="cuerpo"><span class="meta"><a href="#/estudiante/${p.estudiante_id}">${h(p.estudiante)}</a> (@${h(p.usuario)}) · ${h(p.cuando)}${p.sesion ? ` · ${h(p.curso || '')} · ${h(p.sesion)}` : ''}</span>
        <blockquote>${h(p.texto)}</blockquote>
        ${p.respuesta ? `<div class="respuesta"><strong>Tu respuesta:</strong> ${h(p.respuesta)}</div>`
          : `<form class="form" novalidate style="gap:8px"><textarea class="entrada" name="respuesta" rows="2" maxlength="2000" placeholder="Escribe una respuesta sencilla y cariñosa…" aria-label="Respuesta"></textarea>
            <div class="acciones-fila"><button type="submit" class="btn btn-p">${icono('enviar', 18)} Responder</button><button type="button" class="btn-mini peligro" data-borrar>Eliminar</button></div></form>`}
        ${p.respuesta ? '<div class="acciones-fila"><button type="button" class="btn-mini peligro" data-borrar>Eliminar</button></div>' : ''}
      </div></article>`).join('')
      : `<p class="vacio-p">${respondidas ? 'Aún no has respondido preguntas.' : '¡Todo al día! No hay preguntas pendientes.'}</p>`}</section>`;
  contenedor.querySelectorAll('.pregunta-p').forEach((art) => {
    const id = Number(art.dataset.id);
    const f = art.querySelector('form');
    if (f) f.onsubmit = (ev) => {
      ev.preventDefault();
      conCarga(f.querySelector('[type=submit]'), async () => {
        try { await api.post('admin/pregunta/responder', { id, respuesta: f.respuesta.value.trim() }); aviso('¡Respuesta enviada!', 'bien'); panel.navegar(); } catch (err) { avisoError(err); }
      });
    };
    art.querySelector('[data-borrar]').onclick = async () => {
      if (!(await confirmar('¿Eliminar la pregunta?', 'Desaparecerá también para el niño o niña.', { si: 'Eliminar', peligro: true }))) return;
      try { await api.post('admin/pregunta/eliminar', { id }); panel.navegar(); } catch (err) { avisoError(err); }
    };
  });
}

/* ===================== Fotos ===================== */
export async function vistaFotos({ panel, contenedor, query }) {
  const vistas = query.get('estado') === 'vista';
  const { filas } = await api.get('admin/fotos', { estado: vistas ? 'vista' : 'pendiente' });
  contenedor.innerHTML = `
    <div class="p-cabeza"><div><h1>Fotos de los niños</h1><p>Sus creaciones. Al marcarlas como vistas ganan estrellas y reciben tu comentario.</p></div></div>
    <div class="pestanas-p"><a class="btn-mini ${vistas ? '' : 'primario'}" href="#/fotos">Por revisar</a><a class="btn-mini ${vistas ? 'primario' : ''}" href="#/fotos?estado=vista">Revisadas</a></div>
    <section class="caja">${filas.length ? `<div class="fotos-p">${filas.map((f, i) => `<button type="button" class="foto-p" data-i="${i}"><img src="${img(f.imagen)}" alt="" loading="lazy">
      <div><strong>${h(f.titulo)}</strong><small>${h(f.estudiante)} · ${h(f.cuando)}</small></div></button>`).join('')}</div>`
      : `<p class="vacio-p">${vistas ? 'Aún no has revisado fotos.' : '¡Todo al día! No hay fotos por revisar.'}</p>`}</section>`;
  contenedor.querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => {
    const f = filas[Number(b.dataset.i)];
    const origen = f.reto ? `Reto: ${f.reto}` : f.reto_semana ? `Reto de la semana: ${f.reto_semana}` : 'Colección libre';
    const { caja, cerrar } = ventana(`<img src="${img(f.imagen)}" alt="" style="width:100%;max-height:60vh;object-fit:contain;border-radius:18px;background:var(--crema)">
      <h2 style="margin-top:12px">${h(f.titulo)}</h2><p class="ayuda"><a href="#/estudiante/${f.estudiante_id}">${h(f.estudiante)}</a> (@${h(f.usuario)}) · ${h(origen)} · ${h(f.cuando)}</p>
      ${f.descripcion ? `<blockquote style="margin:10px 0;padding:10px 14px;border-radius:14px;background:var(--crema);font-weight:700">${h(f.descripcion)}</blockquote>` : ''}
      <form class="form" novalidate>${f.estado === 'vista'
        ? `<div class="respuesta" style="padding:10px 14px;border-radius:14px;background:var(--turq-s);font-weight:700">${f.comentario ? 'Tu comentario: ' + h(f.comentario) : 'Revisada sin comentario.'}</div>`
        : '<div class="campo"><label for="com">Comentario para el niño (opcional)</label><textarea class="entrada" id="com" name="comentario" rows="2" maxlength="500" placeholder="¡Me encantan los colores que elegiste!"></textarea></div>'}
      <div class="pie-form"><button type="button" class="btn btn-borde fucsia btn-p" data-borrar style="margin-right:auto">${icono('basura', 18)} Eliminar</button>
        <a class="btn btn-borde btn-p" href="${img(f.imagen)}" download="${h(f.titulo)}.webp">${icono('descargar', 18)} Descargar</a>
        ${f.estado === 'vista' ? '' : '<button type="submit" class="btn btn-p">¡La vi! Dar estrellas</button>'}</div></form>`, { clase: 'grande' });
    const form = caja.querySelector('form');
    form.onsubmit = (ev) => {
      ev.preventDefault();
      conCarga(form.querySelector('[type=submit]'), async () => {
        try { await api.post('admin/foto/revisar', { id: f.id, comentario: form.comentario.value.trim() }); aviso('¡Foto revisada! Le llegaron estrellas.', 'estrellas'); cerrar(); panel.navegar(); } catch (err) { avisoError(err); }
      });
    };
    caja.querySelector('[data-borrar]').onclick = async () => {
      if (!(await confirmar('¿Eliminar esta foto?', 'Se borrará de la colección del niño o niña.', { si: 'Eliminar', peligro: true }))) return;
      try { await api.post('admin/foto/eliminar', { id: f.id }); cerrar(); aviso('Foto eliminada', 'bien'); panel.navegar(); } catch (err) { avisoError(err); }
    };
  }));
}

/* ===================== Ajustes ===================== */
export async function vistaAjustes({ panel, contenedor }) {
  const [{ ajustes: aj }, { administradores }] = await Promise.all([api.get('admin/ajustes'), api.get('admin/profes')]);
  const campo = (clave, etiqueta, extra = '', ayuda = '') => `<div class="campo"><label for="a-${clave}">${etiqueta}</label><input class="entrada" id="a-${clave}" name="${clave}" value="${h(aj[clave] ?? '')}" ${extra}>${ayuda ? `<span class="ayuda">${ayuda}</span>` : ''}</div>`;
  contenedor.innerHTML = `
    <div class="p-cabeza"><div><h1>Ajustes</h1><p>Datos del campus, estrellas, tu contraseña y otras profes.</p></div></div>
    <div class="dos-columnas">
      <section class="caja"><h2>El campus</h2><form class="form" novalidate data-ajustes>
        ${campo('nombre_sitio', 'Nombre del campus', 'maxlength="120"')}
        ${campo('lema', 'Lema', 'maxlength="120"')}
        ${campo('mensaje_ayuda', 'Mensaje de ayuda (menú de los niños)', 'maxlength="160"')}
        <div class="fila-campos">${campo('whatsapp', 'WhatsApp de ayuda', 'maxlength="20" inputmode="tel"', 'Con indicativo, sin +. Ej.: 573001234567')}${campo('instagram', 'Instagram', 'maxlength="60"', 'Solo el usuario, sin @')}</div>
        ${campo('correo_contacto', 'Correo de contacto', 'type="email" maxlength="160"')}
        <h3 style="margin-top:8px">Estrellas automáticas</h3>
        <div class="fila-campos">${campo('estrellas_registro', 'Al registrarse', 'type="number" min="0" max="999"')}${campo('estrellas_clase_vivo', 'Por asistir a clase en vivo', 'type="number" min="0" max="999"')}</div>
        ${campo('estrellas_foto_revisada', 'Cuando revisas una foto', 'type="number" min="0" max="999"')}
        <div class="pie-form"><button type="submit" class="btn btn-p">Guardar ajustes</button></div></form></section>
      <div>
        <section class="caja"><h2>Mi contraseña</h2><form class="form" novalidate data-clave>
          <div class="campo"><label for="ca">Contraseña actual</label><input class="entrada" id="ca" name="actual" type="password" autocomplete="current-password"></div>
          <div class="campo"><label for="cn">Nueva contraseña</label><input class="entrada" id="cn" name="nueva" type="password" autocomplete="new-password" minlength="8"><span class="ayuda">Mínimo 8 caracteres.</span></div>
          <div class="pie-form"><button type="submit" class="btn btn-p">Cambiar contraseña</button></div></form></section>
        <section class="caja"><h2>Profes con acceso al panel</h2>
          <div class="lista-simple">${administradores.map((x) => `<div><span class="txt"><strong>${h(x.nombre)}${x.id === panel.admin.id ? ' (tú)' : ''}</strong><small>${h(x.correo)} · último acceso: ${h(x.ultimo_acceso ? soloFecha(x.ultimo_acceso) : 'nunca')}</small></span>
            ${x.id === panel.admin.id ? '' : `<label class="interruptor"><input type="checkbox" data-admin="${x.id}" ${x.activo ? 'checked' : ''}> Activa</label>`}</div>`).join('')}</div>
          <form class="form" novalidate data-nuevo-admin style="margin-top:16px"><h3>Agregar otra profe</h3>
            <div class="fila-campos"><div class="campo"><label for="na">Nombre</label><input class="entrada" id="na" name="nombre" maxlength="120"></div>
            <div class="campo"><label for="nco">Correo</label><input class="entrada" id="nco" name="correo" type="email" maxlength="160"></div></div>
            <div class="campo"><label for="ncl">Contraseña (mín. 8)</label><input class="entrada" id="ncl" name="clave" minlength="8" autocomplete="new-password"></div>
            <div class="pie-form"><button type="submit" class="btn btn-lila btn-p">${icono('mas', 18)} Agregar</button></div></form></section>
      </div>
    </div>`;
  const fa = contenedor.querySelector('[data-ajustes]');
  fa.onsubmit = (ev) => {
    ev.preventDefault();
    const ajustes = {};
    fa.querySelectorAll('input').forEach((i) => { ajustes[i.name] = i.value.trim(); });
    conCarga(fa.querySelector('[type=submit]'), async () => { try { await api.post('admin/ajustes', { ajustes }); aviso('¡Ajustes guardados!', 'bien'); } catch (err) { avisoError(err); } });
  };
  const fc = contenedor.querySelector('[data-clave]');
  fc.onsubmit = (ev) => {
    ev.preventDefault();
    conCarga(fc.querySelector('[type=submit]'), async () => {
      try { await api.post('admin/mi-clave', { actual: fc.actual.value, nueva: fc.nueva.value }); aviso('Contraseña actualizada', 'bien'); fc.reset(); } catch (err) { avisoError(err); if (err.datos?.campo) fc[err.datos.campo]?.focus(); }
    });
  };
  contenedor.querySelectorAll('[data-admin]').forEach((i) => (i.onchange = async () => {
    try { await api.post('admin/administrador', { id: Number(i.dataset.admin), activo: i.checked }); aviso(i.checked ? 'Acceso activado' : 'Acceso desactivado', 'bien'); } catch (err) { avisoError(err); i.checked = !i.checked; }
  }));
  const fn = contenedor.querySelector('[data-nuevo-admin]');
  fn.onsubmit = (ev) => {
    ev.preventDefault();
    conCarga(fn.querySelector('[type=submit]'), async () => {
      try { await api.post('admin/administrador', { nombre: fn.nombre.value.trim(), correo: fn.correo.value.trim(), clave: fn.clave.value }); aviso('¡Profe agregada!', 'bien'); panel.navegar(); } catch (err) { avisoError(err); }
    });
  };
}

/* ===================== Exportar el contenido (no aparece en el menú: #/exportar) ===================== */
export async function vistaExportar({ panel, contenedor }) {
  const locales = (JSON.stringify(contenidoActual()).match(/"local:[a-f0-9]{16}\//g) || []).length;
  contenedor.innerHTML = `
    <div class="p-cabeza"><div><h1>Exportar contenido</h1><p>Archivo <code>contenido.js</code> con cursos, sesiones, retos, guías, clases, insignias, niveles y ajustes.</p></div></div>
    <section class="caja"><div class="acciones-fila" style="justify-content:flex-start">
      <button type="button" class="btn btn-p" data-bajar>${icono('descargar', 18)} Descargar contenido.js</button>
      <button type="button" class="btn btn-borde btn-p" data-abrir-archivo>Abrir un contenido.js</button></div>
      ${locales ? `<p class="nota-p" style="margin-top:14px">${locales} video${locales === 1 ? '' : 's'} o PDF subido${locales === 1 ? '' : 's'} desde este computador no van dentro del archivo. Para que se vean en otros dispositivos, súbelos a <code>campus/assets/media</code> o usa un enlace de YouTube o Google Drive.</p>` : ''}</section>`;
  contenedor.querySelector('[data-bajar]').onclick = async () => {
    const { texto, fecha } = textoPublicacion();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([texto], { type: 'text/javascript;charset=utf-8' }));
    a.download = 'contenido.js';
    document.body.appendChild(a); a.click(); a.remove();
    await marcarExportado(fecha);
    aviso('Descargado', 'bien');
  };
  contenedor.querySelector('[data-abrir-archivo]').onclick = () => {
    const i = document.createElement('input');
    i.type = 'file';
    i.accept = '.js,text/javascript,application/javascript';
    i.onchange = async () => {
      const f = i.files && i.files[0];
      if (!f) return;
      if (!(await confirmar('¿Abrir este contenido?', 'Reemplaza el contenido actual del campus por el de este archivo.', { si: 'Sí, abrir' }))) return;
      try { await abrirArchivoContenido(await f.text()); aviso('Contenido abierto', 'bien'); panel.ir('/resumen'); } catch (err) { avisoError(err); }
    };
    i.click();
  };
}
