/**
 * Panel de la profe: estudiantes, preguntas, fotos, asistencia a clases, ajustes y cuentas de profe.
 * Trabaja con los datos del campus guardados en este navegador.
 */
import { bd, insertar, quitar, urlFoto, borrarFoto } from './almacen.js';
import { contenido, porId, ordenada, tabla, ajuste } from './contenido.js';
import { fallar, ahora, hoy, Formato, tiempo, formatear, cifrarClave, claveCorrecta } from './util.js';
import { evaluarCurso, limpiarCache } from './progreso.js';
import { nivel, darEstrellas, notificar, evaluarInsignias, insigniaPublica } from './gamificacion.js';
import { avatarDe } from './publico.js';
import { requerirProfe, profePublico } from './rutas-auth.js';

const num = (v) => Number(v) || 0;
const txt = (v, max) => { const t = String(v ?? '').trim().slice(0, max); return t === '' ? null : t; };
const normalizar = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const estudiante = (id) => bd().estudiantes.find((e) => e.id === Number(id)) || null;
const acudiente = (id) => bd().acudientes.find((a) => a.id === Number(id)) || null;
const haceDias = (n) => formatear(new Date(Date.now() - n * 86400000));
const TABLAS_DEL_NINO = ['progreso_retos', 'progreso_pasos', 'descargas_guias', 'reflexiones', 'preguntas', 'reservas_clase', 'coleccion', 'insignias_estudiante', 'movimientos_estrellas', 'notificaciones'];

/** Datos que el panel muestra junto a cada contenido (cuántos niños, descargas, reservas…). */
export function datosDeUso(nombre, filas) {
  const D = bd();
  if (nombre === 'cursos') {
    filas.forEach((f) => {
      const sesiones = tabla('sesiones').filter((s) => s.curso_id === f.id).map((s) => s.id);
      const retos = new Set(tabla('retos').filter((r) => sesiones.includes(r.sesion_id)).map((r) => r.id));
      f.n_estudiantes = new Set(D.progreso_retos.filter((p) => retos.has(p.reto_id)).map((p) => p.estudiante_id)).size;
    });
  } else if (nombre === 'guias') {
    filas.forEach((f) => { f.descargas = D.descargas_guias.filter((x) => x.guia_id === f.id).length; });
  } else if (nombre === 'clases_vivo') {
    filas.forEach((f) => {
      f.reservas = D.reservas_clase.filter((r) => r.clase_id === f.id).length;
      f.asistentes = D.reservas_clase.filter((r) => r.clase_id === f.id && r.asistio_en).length;
    });
  } else if (nombre === 'insignias') {
    filas.forEach((f) => { f.ganadas = D.insignias_estudiante.filter((x) => x.insignia_id === f.id).length; });
  } else if (nombre === 'retos_semana') {
    filas.forEach((f) => { f.fotos = D.coleccion.filter((c) => c.reto_semana_id === f.id).length; });
  }
  return filas;
}

export const completados = (retoId) => bd().progreso_retos.filter((p) => p.reto_id === retoId && p.estado === 'completado').length;

const pendiente = (c) => c.estado !== 'vista';

export const rutasComunidad = {
  'GET admin/estado': () => ({ admin: profePublico(requerirProfe()), sitio: {} }),

  'POST admin/salir': () => ({}),

  'GET admin/contadores': () => {
    requerirProfe();
    return { preguntas: bd().preguntas.filter((p) => !p.respuesta).length, fotos: bd().coleccion.filter(pendiente).length };
  },

  'GET admin/resumen': () => {
    requerirProfe();
    const D = bd();
    const semana = haceDias(7);
    const desde = Date.now() - 3 * 3600000;
    const clases = ordenada('clases_vivo', (c) => tiempo(c.inicia_en) >= desde).sort((a, b) => tiempo(a.inicia_en) - tiempo(b.inicia_en)).slice(0, 4).map((c) => {
      const curso = c.curso_id ? porId('cursos', c.curso_id) : null;
      return {
        id: c.id, titulo: c.titulo, cuando: Formato.diaHora(c.inicia_en), curso: curso ? curso.etiqueta : null,
        reservas: D.reservas_clase.filter((r) => r.clase_id === c.id).length, cupos: c.cupos ?? null, publicado: num(c.publicado),
      };
    });
    const actividad = D.progreso_retos.filter((p) => p.estado === 'completado' && p.completado_en)
      .sort((a, b) => String(b.completado_en).localeCompare(String(a.completado_en))).slice(0, 8)
      .map((p) => {
        const e = estudiante(p.estudiante_id);
        const r = porId('retos', p.reto_id);
        return e && r ? { nombre: e.nombre, personaje: e.personaje, titulo: r.titulo, avatar: avatarDe(e.personaje), cuando: Formato.diaHora(p.completado_en) } : null;
      }).filter(Boolean);
    return {
      estudiantes: D.estudiantes.filter((e) => e.activo !== 0).length,
      nuevos_semana: D.estudiantes.filter((e) => String(e.creado_en) >= semana).length,
      activos_semana: D.estudiantes.filter((e) => String(e.ultimo_acceso || '') >= semana).length,
      preguntas: D.preguntas.filter((p) => !p.respuesta).length,
      fotos: D.coleccion.filter(pendiente).length,
      retos_semana: D.progreso_retos.filter((p) => p.estado === 'completado' && String(p.completado_en || '') >= semana).length,
      clases, actividad,
    };
  },

  /* ----------- Estudiantes ----------- */
  'GET admin/estudiantes': (d) => {
    requerirProfe();
    const q = normalizar(String(d.q || '').trim());
    const pagina = Math.max(1, num(d.pagina) || 1);
    const porPagina = 30;
    let filas = bd().estudiantes.map((e) => ({ e, a: acudiente(e.acudiente_id) || {} }));
    if (q) filas = filas.filter(({ e, a }) => [e.nombre, e.usuario, a.nombre, a.correo].some((v) => normalizar(v).includes(q)));
    filas.sort((x, y) => String(y.e.creado_en).localeCompare(String(x.e.creado_en)) || y.e.id - x.e.id);
    const total = filas.length;
    const pag = filas.slice((pagina - 1) * porPagina, pagina * porPagina).map(({ e, a }) => ({
      id: e.id, nombre: e.nombre, usuario: e.usuario, edad: num(e.edad), grado: e.grado, personaje: e.personaje, color: e.color,
      estrellas: num(e.estrellas), activo: e.activo === 0 ? 0 : 1, ultimo_acceso: e.ultimo_acceso, creado_en: e.creado_en,
      acudiente: a.nombre || '', correo: a.correo || '', celular: a.celular || '', avatar: avatarDe(e.personaje),
      retos: bd().progreso_retos.filter((p) => p.estudiante_id === e.id && p.estado === 'completado').length,
      acceso: e.ultimo_acceso ? Formato.diaHora(e.ultimo_acceso) : 'Nunca',
    }));
    return { filas: pag, total, paginas: Math.ceil(total / porPagina) };
  },

  'GET admin/estudiante': async (d) => {
    requerirProfe();
    const e = estudiante(d.id);
    if (!e) fallar(404, 'No encontramos ese estudiante.');
    limpiarCache();
    const D = bd();
    const a = acudiente(e.acudiente_id) || {};
    const cursos = ordenada('cursos', (c) => c.publicado).map((c) => ({ c, ev: evaluarCurso(c, e) })).filter((x) => x.ev.total > 0)
      .map(({ c, ev }) => ({ etiqueta: c.etiqueta, titulo: c.titulo, porcentaje: ev.porcentaje, hechos: ev.hechos, total: ev.total, estado: ev.estado }));
    const insignias = D.insignias_estudiante.filter((x) => x.estudiante_id === e.id).map((x) => {
      const ins = porId('insignias', x.insignia_id);
      return ins ? { ...insigniaPublica(ins), ganada_en: x.ganada_en } : null;
    }).filter(Boolean);
    const coleccion = [];
    for (const c of D.coleccion.filter((x) => x.estudiante_id === e.id).sort((x, y) => y.id - x.id)) {
      coleccion.push({ id: c.id, titulo: c.titulo, estado: c.estado === 'vista' ? 'vista' : 'pendiente', comentario: c.comentario, creado_en: c.creado_en, imagen: await urlFoto(c.archivo) });
    }
    return {
      estudiante: { ...e, estrellas: num(e.estrellas), racha_dias: num(e.racha_dias), activo: e.activo === 0 ? 0 : 1, avatar: avatarDe(e.personaje), nivel: nivel(num(e.estrellas), e.genero) },
      acudiente: { id: a.id, nombre: a.nombre, parentesco: a.parentesco, correo: a.correo, celular: a.celular, avisos_whatsapp: a.avisos_whatsapp, correo_verificado_en: null, activo: 1, creado_en: a.creado_en },
      hermanos: D.estudiantes.filter((x) => x.acudiente_id === e.acudiente_id && x.id !== e.id).map((x) => ({ id: x.id, nombre: x.nombre, usuario: x.usuario })),
      cursos, insignias, coleccion,
      movimientos: D.movimientos_estrellas.filter((m) => m.estudiante_id === e.id).sort((x, y) => y.id - x.id).slice(0, 20).map((m) => ({ cantidad: num(m.cantidad), motivo: m.motivo, creado_en: m.creado_en })),
      preguntas: D.preguntas.filter((p) => p.estudiante_id === e.id).sort((x, y) => y.id - x.id).slice(0, 20).map((p) => ({ id: p.id, texto: p.texto, respuesta: p.respuesta, creado_en: p.creado_en })),
    };
  },

  'POST admin/estudiante/activo': (d) => {
    requerirProfe();
    const e = estudiante(d.id);
    if (!e) fallar(404, 'No encontramos ese estudiante.');
    e.activo = d.activo ? 1 : 0;
    return { mensaje: d.activo ? 'Cuenta activada' : 'Cuenta pausada' };
  },

  'POST admin/estudiante/estrellas': (d) => {
    requerirProfe();
    const e = estudiante(d.id);
    const cantidad = Math.trunc(num(d.cantidad));
    const motivo = txt(d.motivo, 160);
    if (!e) fallar(404, 'No encontramos ese estudiante.');
    if (!cantidad || cantidad < -1000 || cantidad > 1000) fallar(422, 'Escribe cuántas estrellas (entre -1000 y 1000).');
    if (!motivo) fallar(422, 'Escribe el motivo.', { campo: 'motivo' });
    darEstrellas(e.id, cantidad, motivo, null);
    if (cantidad > 0) {
      notificar(e.id, 'estrellas', `¡Tu profe te regaló ${cantidad} estrellas!`, motivo, '#/logros');
      evaluarInsignias(e.id);
    }
    return { estrellas: num(e.estrellas) };
  },

  'POST admin/estudiante/eliminar': async (d) => {
    requerirProfe();
    const e = estudiante(d.id);
    if (!e) fallar(404, 'No encontramos ese estudiante.');
    for (const c of bd().coleccion.filter((x) => x.estudiante_id === e.id)) await borrarFoto(c.archivo);
    TABLAS_DEL_NINO.forEach((t) => quitar(t, (f) => f.estudiante_id === e.id));
    quitar('estudiantes', (x) => x.id === e.id);
    if (d.borrar_familia && !bd().estudiantes.some((x) => x.acudiente_id === e.acudiente_id)) quitar('acudientes', (a) => a.id === e.acudiente_id);
    return { mensaje: 'Datos eliminados' };
  },

  'POST admin/acudiente/clave': async (d) => {
    requerirProfe();
    const a = acudiente(d.acudiente_id);
    if (!a) fallar(404, 'No encontramos esa familia.');
    if (String(d.clave || '').length < 8) fallar(422, 'La contraseña debe tener mínimo 8 caracteres.');
    a.clave_hash = await cifrarClave(String(d.clave));
    return { mensaje: 'Contraseña actualizada. Compártela con la familia.' };
  },

  /* ----------- Preguntas ----------- */
  'GET admin/preguntas': (d) => {
    requerirProfe();
    const respondidas = d.estado === 'respondidas';
    const filas = bd().preguntas.filter((p) => (respondidas ? !!p.respuesta : !p.respuesta))
      .sort((a, b) => (respondidas ? b.id - a.id : a.id - b.id)).slice(0, 100)
      .map((p) => {
        const e = estudiante(p.estudiante_id) || {};
        const s = p.sesion_id ? porId('sesiones', p.sesion_id) : null;
        const c = s ? porId('cursos', s.curso_id) : null;
        return {
          ...p, estudiante: e.nombre || 'Estudiante', usuario: e.usuario || '', personaje: e.personaje, avatar: avatarDe(e.personaje),
          sesion: s ? s.titulo : null, curso: c ? c.etiqueta : null, cuando: Formato.diaHora(p.creado_en),
        };
      });
    return { filas };
  },

  'POST admin/pregunta/responder': (d) => {
    const profe = requerirProfe();
    const p = bd().preguntas.find((x) => x.id === num(d.id));
    if (!p) fallar(404, 'No encontramos esa pregunta.');
    const respuesta = txt(d.respuesta, 2000);
    if (!respuesta) fallar(422, 'Escribe la respuesta.', { campo: 'respuesta' });
    p.respuesta = respuesta;
    p.respondida_en = ahora();
    p.respondida_por = profe.id;
    notificar(p.estudiante_id, 'respuesta', 'Tu profe respondió tu pregunta', String(p.texto).slice(0, 120), p.sesion_id ? `#/sesion/${p.sesion_id}?tab=preguntas` : '#/inicio');
    return { mensaje: 'Respuesta enviada' };
  },

  'POST admin/pregunta/eliminar': (d) => {
    requerirProfe();
    quitar('preguntas', (p) => p.id === num(d.id));
    return {};
  },

  /* ----------- Fotos ----------- */
  'GET admin/fotos': async (d) => {
    requerirProfe();
    const vistas = d.estado === 'vista';
    const lista = bd().coleccion.filter((c) => (vistas ? c.estado === 'vista' : pendiente(c)))
      .sort((a, b) => (vistas ? b.id - a.id : a.id - b.id)).slice(0, 120);
    const filas = [];
    for (const c of lista) {
      const e = estudiante(c.estudiante_id) || {};
      const r = c.reto_id ? porId('retos', c.reto_id) : null;
      const rs = c.reto_semana_id ? porId('retos_semana', c.reto_semana_id) : null;
      filas.push({
        id: c.id, estudiante_id: c.estudiante_id, titulo: c.titulo, estado: c.estado === 'vista' ? 'vista' : 'pendiente', comentario: c.comentario,
        estudiante: e.nombre || 'Estudiante', usuario: e.usuario || '', avatar: avatarDe(e.personaje),
        reto: r ? r.titulo : null, reto_semana: rs ? rs.titulo : null, cuando: Formato.diaHora(c.creado_en), imagen: await urlFoto(c.archivo),
      });
    }
    return { filas };
  },

  'POST admin/foto/revisar': (d) => {
    requerirProfe();
    const f = bd().coleccion.find((c) => c.id === num(d.id));
    if (!f) fallar(404, 'No encontramos esa foto.');
    const comentario = txt(d.comentario, 500);
    f.estado = 'vista';
    f.comentario = comentario;
    f.revisada_en = ahora();
    darEstrellas(f.estudiante_id, num(ajuste('estrellas_foto_revisada', '5')), 'Tu profe vio tu creación: ' + f.titulo, 'foto:' + f.id);
    notificar(f.estudiante_id, 'foto', `Tu profe vio «${f.titulo}»`, comentario || '¡Le encantó tu creación!', '#/logros');
    evaluarInsignias(f.estudiante_id);
    return { mensaje: 'Foto revisada' };
  },

  'POST admin/foto/eliminar': async (d) => {
    requerirProfe();
    const f = bd().coleccion.find((c) => c.id === num(d.id));
    if (f) { quitar('coleccion', (c) => c.id === f.id); await borrarFoto(f.archivo); }
    return {};
  },

  /* ----------- Clases en vivo ----------- */
  'GET admin/clase': (d) => {
    requerirProfe();
    const c = porId('clases_vivo', d.id);
    if (!c) fallar(404, 'No encontramos esa clase.');
    const reservas = bd().reservas_clase.filter((r) => r.clase_id === c.id).sort((a, b) => String(a.reservado_en).localeCompare(String(b.reservado_en))).map((r) => {
      const e = estudiante(r.estudiante_id) || {};
      const a = acudiente(e.acudiente_id) || {};
      return { id: e.id, nombre: e.nombre || 'Estudiante', usuario: e.usuario || '', avatar: avatarDe(e.personaje), acudiente: a.nombre || '', celular: a.celular || '', reservado_en: r.reservado_en, asistio_en: r.asistio_en };
    });
    return { clase: { ...c }, cuando: Formato.diaHora(c.inicia_en), reservas };
  },

  'POST admin/clase/asistencia': (d) => {
    requerirProfe();
    const c = porId('clases_vivo', d.clase_id);
    const e = estudiante(d.estudiante_id);
    if (!c || !e) fallar(404, 'No encontramos esa clase.');
    let r = bd().reservas_clase.find((x) => x.clase_id === c.id && x.estudiante_id === e.id);
    if (d.asistio) {
      if (!r) r = insertar('reservas_clase', { clase_id: c.id, estudiante_id: e.id, reservado_en: ahora(), asistio_en: null });
      r.asistio_en = ahora();
      darEstrellas(e.id, num(ajuste('estrellas_clase_vivo', '15')), 'Clase en vivo: ' + c.titulo, 'clase:' + c.id);
      evaluarInsignias(e.id);
    } else if (r) {
      r.asistio_en = null;
    }
    return {};
  },

  /* ----------- Cuentas de profe ----------- */
  'GET admin/profes': () => {
    requerirProfe();
    return { administradores: bd().profes.map((p) => ({ id: p.id, nombre: p.nombre, correo: p.correo, activo: p.activo === 0 ? 0 : 1, ultimo_acceso: p.ultimo_acceso })) };
  },

  'POST admin/mi-clave': async (d) => {
    const profe = requerirProfe();
    if (!(await claveCorrecta(String(d.actual || ''), profe.clave_hash))) fallar(422, 'La contraseña actual no es correcta.', { campo: 'actual' });
    if (String(d.nueva || '').length < 8) fallar(422, 'La nueva contraseña debe tener mínimo 8 caracteres.', { campo: 'nueva' });
    profe.clave_hash = await cifrarClave(String(d.nueva));
    return { mensaje: 'Contraseña actualizada' };
  },

  'POST admin/administrador': async (d) => {
    const profe = requerirProfe();
    if (d.id) {
      if (num(d.id) === profe.id) fallar(422, 'No puedes desactivar tu propia cuenta.');
      const p = bd().profes.find((x) => x.id === num(d.id));
      if (!p) fallar(404, 'No encontramos esa cuenta.');
      p.activo = d.activo ? 1 : 0;
      return { mensaje: 'Actualizado' };
    }
    const nombre = txt(d.nombre, 120);
    const correo = String(txt(d.correo, 160) || '').toLowerCase();
    if (!nombre) fallar(422, 'Escribe el nombre.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) fallar(422, 'Correo no válido.');
    if (String(d.clave || '').length < 8) fallar(422, 'La contraseña debe tener mínimo 8 caracteres.');
    if (bd().profes.some((p) => p.correo === correo)) fallar(409, 'Ya existe una profe con ese correo.');
    insertar('profes', { nombre, correo, clave_hash: await cifrarClave(String(d.clave)), activo: 1, creado_en: ahora(), ultimo_acceso: null });
    return { mensaje: 'Profe agregada' };
  },
};

export { hoy, contenido };
