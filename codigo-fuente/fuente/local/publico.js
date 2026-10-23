/**
 * Arma los datos que ven las pantallas (mismo formato que la versión con servidor).
 */
import { bd } from './almacen.js';
import { porId, ordenada, ajuste } from './contenido.js';
import { PERSONAJES, Formato, aFecha, tiempo, hora, diaDe, hoy, formatear } from './util.js';
import { evaluarCurso } from './progreso.js';
import { nivel, premio } from './gamificacion.js';

export function avatarDe(personaje) {
  return `assets/img/personajes/avatar-${PERSONAJES.includes(personaje) ? personaje : 'walela'}.webp`;
}

export function sitioPublico() {
  return {
    nombre: ajuste('nombre_sitio', 'MiWalela · Campus MiniDiseñadores'),
    lema: ajuste('lema', 'Imagina · Diseña · Crea · Expresa'),
    whatsapp: String(ajuste('whatsapp', '') || '').replace(/\D+/g, ''),
    instagram: ajuste('instagram', ''),
    mensaje_ayuda: ajuste('mensaje_ayuda', 'Walela y tu profe te ayudan.'),
  };
}

export function estudiantePublico(e) {
  return {
    id: e.id, nombre: e.nombre, usuario: e.usuario, edad: Number(e.edad), grado: e.grado, genero: e.genero,
    personaje: e.personaje, color: e.color, avatar: avatarDe(e.personaje), estrellas: Number(e.estrellas || 0),
    racha: Number(e.racha_dias || 0), nivel: nivel(Number(e.estrellas || 0), e.genero),
    notificaciones: bd().notificaciones.filter((n) => n.estudiante_id === e.id && !n.leida_en).length,
  };
}

export function familiaPublica(acudienteId) {
  const a = bd().acudientes.find((x) => x.id === acudienteId);
  if (!a) return null;
  const hijos = bd().estudiantes.filter((e) => e.acudiente_id === a.id && e.activo !== 0)
    .sort((x, y) => x.nombre.localeCompare(y.nombre, 'es'))
    .map((e) => ({ id: e.id, nombre: e.nombre, usuario: e.usuario, personaje: e.personaje, color: e.color, avatar: avatarDe(e.personaje) }));
  return { id: a.id, nombre: a.nombre, correo: a.correo, estudiantes: hijos };
}

/** Estado de una clase en vivo para un estudiante. */
export function clasePublica(c, est) {
  const inicio = tiempo(c.inicia_en);
  const fin = inicio + 60000 * Number(c.duracion_min || 60);
  const ya = Date.now();
  const mia = est ? bd().reservas_clase.find((r) => r.clase_id === c.id && r.estudiante_id === est.id) : null;
  let estado = 'programada';
  if (ya > fin) estado = 'terminada';
  else if (ya >= inicio) estado = 'en_vivo';
  else if (ya >= inicio - 15 * 60000) estado = 'por_empezar';
  const cupos = c.cupos !== null && c.cupos !== undefined && c.cupos !== '' ? Number(c.cupos) : null;
  return {
    id: c.id,
    curso_id: c.curso_id ?? null,
    titulo: c.titulo,
    descripcion: c.descripcion,
    inicia_en: c.inicia_en,
    termina_en: formatear(new Date(fin)),
    cuando: Formato.diaHora(c.inicia_en),
    hora: hora(aFecha(c.inicia_en)),
    es_hoy: diaDe(aFecha(c.inicia_en)) === hoy(),
    duracion_min: Number(c.duracion_min || 60),
    modalidad: c.modalidad,
    lugar: c.lugar,
    cupos,
    cupos_libres: cupos !== null ? Math.max(0, cupos - bd().reservas_clase.filter((r) => r.clase_id === c.id).length) : null,
    reservada: !!mia,
    asistio: !!(mia && mia.asistio_en),
    estado,
    puede_unirse: ['por_empezar', 'en_vivo'].includes(estado) && c.modalidad !== 'presencial',
    segundos_para_empezar: Math.max(0, Math.floor((inicio - ya) / 1000)),
  };
}

export function proximaClase(cursoId, est) {
  const desde = Date.now() - 4 * 3600000;
  const lista = ordenada('clases_vivo', (c) => c.publicado && tiempo(c.inicia_en) >= desde && (cursoId === null || c.curso_id === cursoId))
    .sort((a, b) => tiempo(a.inicia_en) - tiempo(b.inicia_en));
  for (const c of lista.slice(0, 5)) {
    const pub = clasePublica(c, est);
    if (pub.estado !== 'terminada') return pub;
  }
  return null;
}

/** Tarjeta de curso con su estado para el estudiante. */
export function cursoTarjeta(c, est) {
  const ev = evaluarCurso(c, est);
  const nSesiones = Math.max(Number(c.sesiones_planeadas || 0), ev.sesiones.length);
  let nVideos = 0;
  ev.sesiones.forEach((s) => s.fila.retos.forEach((r) => { if (r.tipo === 'video') nVideos++; }));
  let clase = null;
  const meta = [];
  if (c.tipo === 'taller') {
    clase = proximaClase(c.id, est);
    meta.push(clase ? clase.cuando : 'Pronto anunciaremos la fecha');
    meta.push({ virtual: 'Virtual', presencial: 'Presencial', mixta: 'Virtual y presencial' }[c.modalidad] || 'Virtual');
  } else {
    if (nSesiones > 0) meta.push(nSesiones + (nSesiones === 1 ? ' sesión' : ' sesiones'));
    if (nVideos > 0) meta.push(nVideos + (nVideos === 1 ? ' video' : ' videos'));
    meta.push(`Desde ${Number(c.edad_minima || 0)} años`);
  }
  let chip = null;
  if (ev.estado === 'en_progreso') chip = { texto: 'En progreso', color: 'lila' };
  else if (ev.estado === 'completado') chip = { texto: '¡Completado!', color: 'turquesa' };
  else if (ev.estado === 'nuevo' && tiempo(c.creado_en) > Date.now() - 86400000 * 45) chip = { texto: '¡Nuevo!', color: 'fucsia' };
  else if (ev.estado === 'en_vivo') {
    chip = clase && clase.cupos_libres !== null
      ? { texto: clase.cupos_libres > 0 ? `Quedan ${clase.cupos_libres} cupos` : 'Sin cupos', color: 'amarillo' }
      : { texto: 'En vivo', color: 'amarillo' };
  }
  let cta = { texto: 'Empezar', bloqueado: false };
  if (ev.estado === 'bloqueado') cta = { texto: ev.bloqueo, bloqueado: true };
  else if (ev.estado === 'completado') cta.texto = 'Repasar';
  else if (ev.estado === 'en_progreso') cta.texto = 'Continuar';
  else if (ev.estado === 'en_vivo') cta.texto = clase && clase.reservada ? 'Ver mi clase' : clase && clase.cupos !== null ? 'Reservar cupo' : 'Ver taller';
  else if (ev.total === 0) cta.texto = 'Ver curso';
  return {
    id: c.id, tipo: c.tipo, etiqueta: c.etiqueta, titulo: c.titulo, descripcion: c.descripcion, portada: c.portada,
    portada_tipo: c.portada_tipo, color: c.color, estado: ev.estado, bloqueo: ev.bloqueo, porcentaje: ev.porcentaje,
    hechos: ev.hechos, total: ev.total, meta: meta.join(' · '), chip, cta, clase, orden: Number(c.orden || 0),
  };
}

/** ¿Puede el estudiante abrir la guía? [abierta, motivo] */
export function guiaAccesible(guia, est) {
  if (!guia.sesion_id) return [true, null];
  const sesion = porId('sesiones', guia.sesion_id);
  const curso = sesion ? porId('cursos', sesion.curso_id) : null;
  if (!sesion || !curso || !curso.publicado || !sesion.publicado) return [false, 'Muy pronto'];
  const ev = evaluarCurso(curso, est);
  if (ev.bloqueo !== null) return [false, ev.bloqueo];
  const s = ev.sesiones.find((x) => x.id === sesion.id);
  if (s) return [s.abierta, s.abierta ? null : (s.motivo || 'Se abre con la sesión')];
  return [false, 'Se abre con la sesión'];
}

export function premioVacio(estId) {
  const e = bd().estudiantes.find((x) => x.id === estId);
  return premio(estId, Number((e && e.estrellas) || 0), 0);
}
