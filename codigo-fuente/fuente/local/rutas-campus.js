/**
 * Campus de los niños: inicio, cursos, sesiones, retos, guías, logros, colección, clases y búsqueda.
 * Misma lógica que la versión con servidor, guardando en este dispositivo.
 */
import { bd, insertar, quitar, guardarFoto, urlFoto, borrarFoto } from './almacen.js';
import { porId, tabla, ordenada, ajuste } from './contenido.js';
import { fallar, ahora, hoy, Formato, lineas, tiempo, aleatorio, COLORES, PERSONAJES } from './util.js';
import * as P from './progreso.js';
import * as G from './gamificacion.js';
import { estudiantePublico, clasePublica, proximaClase, cursoTarjeta, guiaAccesible, sitioPublico } from './publico.js';
import { requerirEstudiante } from './rutas-auth.js';

const num = (v) => Number(v) || 0;
const txt = (v, max) => { const t = String(v ?? '').trim().slice(0, max); return t === '' ? null : t; };
const normalizar = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const guiaPublicada = (id) => { const g = porId('guias', id); return g && g.publicado ? g : null; };

function enlaceWhatsapp(mensaje) {
  const n = sitioPublico().whatsapp;
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(mensaje)}` : null;
}

function retoPublico(r, estId) {
  const p = P.progresoRetos(estId).get(r.id);
  let video = null;
  if (r.tipo === 'video' && r.video_url) {
    video = { fuente: r.video_fuente || 'archivo', url: r.video_url, poster: r.video_poster, subtitulos: r.video_subtitulos, duracion: num(r.video_duracion) };
  }
  let guia = null;
  if (r.tipo === 'guia' && r.guia_id) {
    const g = guiaPublicada(r.guia_id);
    if (g) guia = { id: g.id, titulo: g.titulo, portada: g.portada, pasos: P.totalPasos(g.id), logrados: P.pasosLogrados(g.id, estId).length };
  }
  return {
    id: r.id, tipo: r.tipo, titulo: r.titulo, descripcion: r.descripcion, icono: r.icono, estrellas: num(r.estrellas),
    permite_foto: !!num(r.permite_foto), estado: p ? p.estado : 'pendiente', segundos: p ? num(p.segundos_vistos) : 0,
    video, guia, fotos: bd().coleccion.filter((c) => c.estudiante_id === estId && c.reto_id === r.id).length,
  };
}

function retoSemanaActual(estId) {
  const h = hoy();
  const r = [...tabla('retos_semana')].filter((x) => x.publicado && x.inicia <= h && x.termina >= h)
    .sort((a, b) => String(b.inicia).localeCompare(String(a.inicia)) || b.id - a.id)[0];
  if (!r) return null;
  return {
    id: r.id, titulo: r.titulo, descripcion: r.descripcion, estrellas: num(r.estrellas), termina: Formato.fechaCorta(r.termina),
    subido: bd().coleccion.some((c) => c.estudiante_id === estId && c.reto_semana_id === r.id),
  };
}

async function coleccionPublica(c) {
  const reto = c.reto_id ? porId('retos', c.reto_id) : null;
  return {
    id: c.id, titulo: c.titulo, imagen: await urlFoto(c.archivo), estado: c.estado || 'guardada', comentario: c.comentario || null,
    fecha: Formato.fechaCorta(c.creado_en), reto: reto ? reto.titulo : null,
  };
}

function fotosDeHoy(estId) {
  const h = hoy();
  return bd().coleccion.filter((c) => c.estudiante_id === estId && String(c.creado_en).slice(0, 10) === h).length;
}

function guiaResumen(g, estId) {
  const total = P.totalPasos(g.id);
  const hechos = P.pasosLogrados(g.id, estId).length;
  return { total, hechos };
}

export const rutasCampus = {
  'GET inicio': () => {
    const est = requerirEstudiante();
    const prioridad = { en_progreso: 0, en_vivo: 1, nuevo: 2, completado: 3, bloqueado: 4 };
    const tarjetas = ordenada('cursos', (c) => c.publicado).map((c) => cursoTarjeta(c, est))
      .sort((a, b) => (prioridad[a.estado] ?? 9) - (prioridad[b.estado] ?? 9) || a.orden - b.orden);
    const guias = [];
    ordenada('guias', (g) => g.publicado).forEach((g) => {
      const [abierta] = guiaAccesible(g, est);
      if (!abierta) return;
      const { total, hechos } = guiaResumen(g, est.id);
      guias.push({ id: g.id, etiqueta: g.etiqueta, titulo: g.titulo, portada: g.portada, pdf: !!g.pdf, pasos: total, logrados: hechos });
    });
    const lista = (g) => (g.pasos > 0 && g.logrados >= g.pasos ? 1 : 0);
    guias.sort((a, b) => lista(a) - lista(b));
    return {
      estudiante: estudiantePublico(est), continuar: P.continuar(est), clase: proximaClase(null, est),
      reto_semana: retoSemanaActual(est.id), cursos: tarjetas.slice(0, 3), guias: guias.slice(0, 2),
    };
  },

  'GET cursos': () => {
    const est = requerirEstudiante();
    return { cursos: ordenada('cursos', (c) => c.publicado).map((c) => cursoTarjeta(c, est)) };
  },

  'GET curso': (d) => {
    const est = requerirEstudiante();
    const curso = porId('cursos', d.id);
    if (!curso || !curso.publicado) fallar(404, 'No encontramos ese curso.');
    const ev = P.evaluarCurso(curso, est);
    const prog = P.progresoRetos(est.id);
    const sesiones = ev.sesiones.map((s) => {
      const tipos = { actividad: 0, video: 0, guia: 0 };
      const retos = s.fila.retos.map((r) => {
        tipos[r.tipo] = (tipos[r.tipo] || 0) + 1;
        const p = prog.get(r.id);
        return { id: r.id, icono: r.icono, titulo: r.titulo, estado: p ? p.estado : 'pendiente' };
      });
      const meta = [s.retos_total + (s.retos_total === 1 ? ' reto' : ' retos')];
      if (tipos.video) meta.push(tipos.video + (tipos.video === 1 ? ' video' : ' videos'));
      const guia = ordenada('guias', (g) => g.sesion_id === s.id && g.publicado)[0] || null;
      if (guia || tipos.guia) meta.push('guía paso a paso');
      return {
        id: s.id, numero: s.numero, titulo: s.titulo, estado: s.estado, motivo: s.motivo, retos_total: s.retos_total,
        retos_hechos: s.retos_hechos, meta: meta.join(' · '), retos, guia_id: guia ? guia.id : null,
      };
    });
    const planeadas = num(curso.sesiones_planeadas);
    for (let n = sesiones.length + 1; n <= planeadas; n++) {
      sesiones.push({ id: null, numero: n, titulo: 'Sesión ' + n, estado: 'pronto', motivo: '¡Muy pronto!', retos_total: 0, retos_hechos: 0, meta: '', retos: [], guia_id: null });
    }
    const objetivos = lineas(curso.objetivos);
    const desde = Date.now() - 4 * 3600000;
    const clases = ordenada('clases_vivo', (c) => c.publicado && c.curso_id === curso.id && tiempo(c.inicia_en) >= desde)
      .sort((a, b) => tiempo(a.inicia_en) - tiempo(b.inicia_en)).slice(0, 4)
      .map((c) => clasePublica(c, est)).filter((c) => c.estado !== 'terminada');
    const siguiente = P.continuar(est);
    const sesionesIds = new Set(ev.sesiones.map((s) => s.id));
    return {
      curso: {
        id: curso.id, tipo: curso.tipo, etiqueta: curso.etiqueta, titulo: curso.titulo, resaltar: curso.resaltar,
        introduccion: curso.introduccion || curso.descripcion, portada: curso.portada, portada_tipo: curso.portada_tipo, color: curso.color,
        edad_minima: num(curso.edad_minima), modalidad: curso.modalidad, objetivos, kit: lineas(curso.kit), frase: curso.frase_recuerda,
        n_sesiones: Math.max(planeadas, ev.sesiones.length),
        n_videos: tabla('retos').filter((r) => r.tipo === 'video' && sesionesIds.has(r.sesion_id)).length,
      },
      estado: ev.estado, bloqueo: ev.bloqueo, porcentaje: ev.porcentaje, hechos: ev.hechos, total: ev.total,
      objetivos_logrados: Math.floor((objetivos.length * ev.porcentaje) / 100),
      sesiones, clases, continuar: siguiente && siguiente.curso.id === curso.id ? siguiente : null,
    };
  },

  'GET sesion': (d) => {
    const est = requerirEstudiante();
    const [sesion, curso, ev] = P.sesionAccesible(num(d.id), est);
    let numero = 1;
    let siguiente = null;
    let filas = [];
    ev.sesiones.forEach((s, i) => {
      if (s.id !== sesion.id) return;
      numero = s.numero;
      filas = s.fila.retos;
      const sig = ev.sesiones[i + 1];
      if (sig) siguiente = { id: sig.id, titulo: sig.titulo, abierta: sig.abierta, motivo: sig.motivo };
    });
    const retos = filas.map((r) => retoPublico(r, est.id));
    const guia = ordenada('guias', (g) => g.sesion_id === sesion.id && g.publicado)[0] || null;
    const ref = bd().reflexiones.find((x) => x.estudiante_id === est.id && x.sesion_id === sesion.id);
    const preguntas = bd().preguntas.filter((p) => p.estudiante_id === est.id && p.sesion_id === sesion.id)
      .sort((a, b) => b.id - a.id).map((p) => ({ id: p.id, texto: p.texto, respuesta: p.respuesta || null, creado_en: p.creado_en, fecha: Formato.fechaCorta(p.creado_en) }));
    const ins = ordenada('insignias', (i) => i.activa && i.criterio === 'sesion' && i.referencia_id === sesion.id)[0];
    const insignia = ins ? { ...G.insigniaPublica(ins), ganada: bd().insignias_estudiante.some((x) => x.estudiante_id === est.id && x.insignia_id === ins.id) } : null;
    return {
      curso: { id: curso.id, etiqueta: curso.etiqueta, titulo: curso.titulo },
      sesion: { id: sesion.id, numero, titulo: sesion.titulo, proposito: sesion.proposito, conexion_dba: sesion.conexion_dba },
      retos, hechos: retos.filter((r) => r.estado === 'completado').length, total: retos.length,
      guia: guia ? { id: guia.id, titulo: guia.titulo, pdf: !!guia.pdf } : null,
      reflexion: ref ? { me_gusto: ref.me_gusto || '', material_nuevo: ref.material_nuevo || '', aprendi: ref.aprendi || '', quiero_crear: ref.quiero_crear || '' }
        : { me_gusto: '', material_nuevo: '', aprendi: '', quiero_crear: '' },
      preguntas, insignia, siguiente,
      whatsapp: !!sitioPublico().whatsapp,
    };
  },

  'POST reto/progreso': (d) => {
    const est = requerirEstudiante();
    const reto = P.retoAccesible(num(d.reto_id), est);
    if (reto.tipo !== 'video') fallar(422, 'Este reto no es un video.');
    const seg = Math.max(0, Math.min(86400, Math.floor(num(d.segundos))));
    const dur = Math.max(0, Math.min(86400, Math.floor(num(d.duracion))));
    let p = bd().progreso_retos.find((x) => x.estudiante_id === est.id && x.reto_id === reto.id);
    const yaCompleto = !!p && p.estado === 'completado';
    if (!p) p = insertar('progreso_retos', { estudiante_id: est.id, reto_id: reto.id, estado: 'en_curso', completado_en: null });
    p.segundos_vistos = seg;
    p.actualizado_en = ahora();
    P.limpiarCache();
    const duracion = dur || num(reto.video_duracion);
    if (duracion > 0 && seg >= duracion * 0.9 && !yaCompleto) {
      const antes = num(est.estrellas);
      const ganadas = G.completarReto(est.id, reto);
      return { completado: true, premio: G.premio(est.id, antes, ganadas) };
    }
    return { completado: yaCompleto };
  },

  'POST reto/completar': (d) => {
    const est = requerirEstudiante();
    const reto = P.retoAccesible(num(d.reto_id), est);
    if (reto.tipo === 'guia') fallar(422, 'Termina todos los pasos de la guía para completar este reto.');
    const antes = num(est.estrellas);
    const ganadas = G.completarReto(est.id, reto);
    return { premio: G.premio(est.id, antes, ganadas) };
  },

  'POST reto/foto': async (d, archivo) => {
    const est = requerirEstudiante();
    const reto = P.retoAccesible(num(d.reto_id), est);
    if (!num(reto.permite_foto)) fallar(422, 'Este reto no pide foto.');
    if (!archivo) fallar(422, 'Elige una foto.');
    if (fotosDeHoy(est.id) >= 20) fallar(429, '¡Wow, hoy guardaste muchas fotos! Mañana puedes guardar más.');
    const antes = num(est.estrellas);
    const ruta = await guardarFoto(aleatorio(8), archivo);
    insertar('coleccion', { estudiante_id: est.id, titulo: txt(d.titulo, 120) || reto.titulo, archivo: ruta, reto_id: reto.id, reto_semana_id: null, estado: 'guardada', creado_en: ahora() });
    const ganadas = G.completarReto(est.id, reto);
    return { premio: G.premio(est.id, antes, ganadas) };
  },

  'POST reflexion': (d) => {
    const est = requerirEstudiante();
    const [sesion] = P.sesionAccesible(num(d.sesion_id), est);
    let r = bd().reflexiones.find((x) => x.estudiante_id === est.id && x.sesion_id === sesion.id);
    if (!r) r = insertar('reflexiones', { estudiante_id: est.id, sesion_id: sesion.id });
    ['me_gusto', 'material_nuevo', 'aprendi', 'quiero_crear'].forEach((k) => { if (k in d) r[k] = txt(d[k], 500); });
    r.actualizado_en = ahora();
    return { guardado: true };
  },

  /** La pregunta se guarda aquí y se envía a la profe por WhatsApp (ella responde por ahí). */
  'POST pregunta': (d) => {
    const est = requerirEstudiante();
    const texto = txt(d.texto, 1000);
    if (!texto || texto.length < 3) fallar(422, 'Escribe un poquito más tu pregunta.', { campo: 'texto' });
    const sesionId = num(d.sesion_id) || null;
    let donde = '';
    if (sesionId) {
      const [sesion, curso, ev] = P.sesionAccesible(sesionId, est);
      const s = ev.sesiones.find((x) => x.id === sesion.id);
      donde = ` sobre «${curso.etiqueta} · Sesión ${s ? s.numero : ''}: ${sesion.titulo}»`;
    }
    const p = insertar('preguntas', { estudiante_id: est.id, sesion_id: sesionId, texto, respuesta: null, creado_en: ahora() });
    const mensaje = `¡Hola, profe! Soy ${est.nombre} (@${est.usuario}) de MiniDiseñadores. Tengo una pregunta${donde}:\n\n${texto}`;
    return { pregunta: { id: p.id, texto, respuesta: null, fecha: Formato.fechaCorta(p.creado_en) }, whatsapp: enlaceWhatsapp(mensaje) };
  },

  'GET guias': () => {
    const est = requerirEstudiante();
    const ordenCurso = (g) => { const s = g.sesion_id ? porId('sesiones', g.sesion_id) : null; const c = s ? porId('cursos', s.curso_id) : null; return c ? num(c.orden) : -1; };
    const lista = tabla('guias').filter((g) => {
      if (!g.publicado) return false;
      if (!g.sesion_id) return true;
      const s = porId('sesiones', g.sesion_id);
      const c = s ? porId('cursos', s.curso_id) : null;
      return !!(s && c && s.publicado && c.publicado);
    }).sort((a, b) => ordenCurso(a) - ordenCurso(b) || num(a.orden) - num(b.orden) || a.id - b.id).map((g) => {
      const [abierta, motivo] = guiaAccesible(g, est);
      const { total, hechos } = guiaResumen(g, est.id);
      const s = g.sesion_id ? porId('sesiones', g.sesion_id) : null;
      const c = s ? porId('cursos', s.curso_id) : null;
      return {
        id: g.id, etiqueta: g.etiqueta, titulo: g.titulo, resaltar: g.resaltar, descripcion: g.descripcion, portada: g.portada, pdf: !!g.pdf,
        conexion_dba: g.conexion_dba, pasos: total, logrados: hechos, completada: total > 0 && hechos >= total,
        descargada: bd().descargas_guias.some((x) => x.estudiante_id === est.id && x.guia_id === g.id),
        abierta, motivo, curso_id: c ? c.id : null, curso: c ? c.etiqueta : null,
        nueva: tiempo(g.creado_en) > Date.now() - 86400000 * 21,
      };
    });
    const pronto = [];
    for (const c of ordenada('cursos', (x) => x.publicado && x.sesiones_planeadas)) {
      const existentes = tabla('sesiones').filter((s) => s.curso_id === c.id && s.publicado).length;
      for (let n = existentes + 1; n <= num(c.sesiones_planeadas) && pronto.length < 2; n++) {
        pronto.push({ etiqueta: `${String(c.etiqueta).toUpperCase()} · SESIÓN ${n}`, curso: c.etiqueta });
      }
      if (pronto.length >= 2) break;
    }
    let destacada = null;
    lista.forEach((g) => { if (g.abierta && !g.completada && g.pasos > 0) destacada = g.id; });
    return { guias: lista, pronto, destacada: destacada ?? (lista[0] ? lista[0].id : null) };
  },

  'GET guia': (d) => {
    const est = requerirEstudiante();
    const guia = guiaPublicada(d.id);
    if (!guia) fallar(404, 'No encontramos esa guía.');
    const [abierta, motivo] = guiaAccesible(guia, est);
    if (!abierta) fallar(403, 'Esta guía todavía está cerrada. ' + (motivo || ''));
    const logrados = new Set(P.pasosLogrados(guia.id, est.id).map((x) => x.paso_id));
    const pasos = ordenada('guia_pasos', (p) => p.guia_id === guia.id).map((p) => ({
      id: p.id, etiqueta: p.etiqueta, numero: p.numero, titulo: p.titulo, texto: p.texto, consejo: p.consejo, imagen: p.imagen,
      recuerda_id: p.recuerda_id ?? null, logrado: logrados.has(p.id),
    }));
    const recuerda = ordenada('guia_recuerda', (r) => r.guia_id === guia.id).map((r) => ({ id: r.id, icono: r.icono, texto: r.texto }));
    const s = guia.sesion_id ? porId('sesiones', guia.sesion_id) : null;
    return {
      guia: {
        id: guia.id, etiqueta: guia.etiqueta, titulo: guia.titulo, resaltar: guia.resaltar, descripcion: guia.descripcion, pdf: !!guia.pdf,
        frase_final: guia.frase_final, estrellas: num(guia.estrellas), conexion_dba: guia.conexion_dba,
      },
      pasos, recuerda,
      completada: pasos.length > 0 && pasos.every((p) => p.logrado),
      sesion: s ? { id: s.id, titulo: s.titulo, curso_id: s.curso_id } : null,
    };
  },

  'POST guia/paso': (d) => {
    const est = requerirEstudiante();
    const paso = porId('guia_pasos', d.paso_id);
    const guia = paso ? guiaPublicada(paso.guia_id) : null;
    if (!paso || !guia) fallar(404, 'No encontramos ese paso.');
    const [abierta, motivo] = guiaAccesible(guia, est);
    if (!abierta) fallar(403, 'Esta guía todavía está cerrada. ' + (motivo || ''));
    const antes = num(est.estrellas);
    let ganadas = 0;
    if (d.logrado) {
      if (!bd().progreso_pasos.some((x) => x.estudiante_id === est.id && x.paso_id === paso.id)) {
        insertar('progreso_pasos', { estudiante_id: est.id, paso_id: paso.id, logrado_en: ahora() });
      }
      ganadas = G.revisarGuia(est.id, guia.id);
    } else {
      quitar('progreso_pasos', (x) => x.estudiante_id === est.id && x.paso_id === paso.id);
    }
    const { total, hechos } = guiaResumen(guia, est.id);
    return { logrados: hechos, total, completada: total > 0 && hechos >= total, premio: G.premio(est.id, antes, ganadas) };
  },

  'POST guia/descargada': (d) => {
    const est = requerirEstudiante();
    const guia = guiaPublicada(d.id);
    if (guia && !bd().descargas_guias.some((x) => x.estudiante_id === est.id && x.guia_id === guia.id)) {
      insertar('descargas_guias', { estudiante_id: est.id, guia_id: guia.id, descargada_en: ahora() });
    }
    return {};
  },

  'GET logros': async () => {
    const est = requerirEstudiante();
    P.limpiarCache();
    const ganadas = new Map(bd().insignias_estudiante.filter((x) => x.estudiante_id === est.id).map((x) => [x.insignia_id, x.ganada_en]));
    const insignias = [];
    let cercana = null;
    ordenada('insignias', (i) => i.activa).forEach((ins) => {
      const [actual, meta] = G.avanceInsignia(ins, est);
      const gana = ganadas.has(ins.id);
      const item = { ...G.insigniaPublica(ins), ganada: gana, fecha: gana ? Formato.fechaCorta(ganadas.get(ins.id)) : null, actual: Math.min(actual, meta), meta };
      insignias.push(item);
      if (!gana && meta > 1 && actual > 0 && (!cercana || meta - actual < cercana.meta - cercana.actual)) cercana = item;
    });
    const nGanadas = insignias.filter((i) => i.ganada).length;
    const coleccion = [];
    for (const c of bd().coleccion.filter((x) => x.estudiante_id === est.id).sort((a, b) => b.id - a.id)) coleccion.push(await coleccionPublica(c));
    const movimientos = bd().movimientos_estrellas.filter((m) => m.estudiante_id === est.id).sort((a, b) => b.id - a.id).slice(0, 12)
      .map((m) => ({ cantidad: num(m.cantidad), motivo: m.motivo, creado_en: m.creado_en, fecha: Formato.fechaCorta(m.creado_en) }));
    let mensaje;
    if (cercana) {
      const faltan = cercana.meta - cercana.actual;
      mensaje = `¡Vas increíble! Te ${faltan === 1 ? 'falta 1 reto' : `faltan ${faltan} retos`} para tu insignia «${cercana.nombre}».`;
    } else if (nGanadas > 0) mensaje = '¡Estoy muy orgullosa de ti! Sigue creando para ganar más insignias.';
    else mensaje = '¡Completa tu primer reto y gana tu primera insignia!';
    return {
      estudiante: estudiantePublico(est),
      stats: {
        estrellas: num(est.estrellas), insignias: nGanadas, insignias_total: insignias.length, racha: num(est.racha_dias),
        retos: bd().progreso_retos.filter((p) => p.estudiante_id === est.id && p.estado === 'completado' && porId('retos', p.reto_id)).length,
      },
      insignias, coleccion, movimientos, mensaje, reto_semana: retoSemanaActual(est.id), whatsapp: !!sitioPublico().whatsapp,
    };
  },

  'POST coleccion': async (d, archivo) => {
    const est = requerirEstudiante();
    if (!archivo) fallar(422, 'Elige una foto.');
    if (fotosDeHoy(est.id) >= 20) fallar(429, '¡Wow, hoy guardaste muchas fotos! Mañana puedes guardar más.');
    let titulo = txt(d.titulo, 120) || 'Mi creación';
    let retoSemana = null;
    if (num(d.reto_semana_id)) {
      const h = hoy();
      retoSemana = tabla('retos_semana').find((r) => r.id === num(d.reto_semana_id) && r.publicado && r.inicia <= h && r.termina >= h);
      if (!retoSemana) fallar(422, 'Ese reto de la semana ya terminó.');
      if (titulo === 'Mi creación') titulo = String(retoSemana.titulo).slice(0, 120);
    }
    const antes = num(est.estrellas);
    const ruta = await guardarFoto(aleatorio(8), archivo);
    insertar('coleccion', { estudiante_id: est.id, titulo, archivo: ruta, reto_id: null, reto_semana_id: retoSemana ? retoSemana.id : null, estado: 'guardada', creado_en: ahora() });
    let ganadas = 0;
    if (retoSemana) ganadas = G.darEstrellas(est.id, num(retoSemana.estrellas), 'Reto de la semana: ' + retoSemana.titulo, 'semana:' + retoSemana.id);
    return { premio: G.premio(est.id, antes, ganadas) };
  },

  'POST coleccion/eliminar': async (d) => {
    const est = requerirEstudiante();
    const item = bd().coleccion.find((c) => c.id === num(d.id) && c.estudiante_id === est.id);
    if (!item) fallar(404, 'No encontramos esa foto.');
    quitar('coleccion', (c) => c.id === item.id);
    await borrarFoto(item.archivo);
    return {};
  },

  'POST perfil': (d) => {
    const est = requerirEstudiante();
    if (PERSONAJES.includes(d.personaje)) est.personaje = d.personaje;
    if (COLORES.includes(d.color)) est.color = d.color;
    return { estudiante: estudiantePublico(est) };
  },

  'GET buscar': (d) => {
    requerirEstudiante();
    const q = normalizar(String(d.q || '').trim());
    if (q.length < 2) return { resultados: [] };
    const tiene = (...campos) => campos.some((c) => normalizar(c).includes(q));
    const res = [];
    ordenada('cursos', (c) => c.publicado && tiene(c.titulo, c.descripcion, c.etiqueta)).slice(0, 5)
      .forEach((c) => res.push({ tipo: 'curso', titulo: c.titulo, detalle: c.etiqueta, enlace: '#/curso/' + c.id }));
    const cursosPub = ordenada('cursos', (c) => c.publicado);
    const retos = [];
    cursosPub.forEach((c) => P.estructura(c.id).forEach((s) => s.retos.forEach((r) => { if (tiene(r.titulo, r.descripcion)) retos.push([r, s]); })));
    retos.slice(0, 6).forEach(([r, s]) => res.push({ tipo: r.tipo === 'video' ? 'video' : 'reto', titulo: r.titulo, detalle: s.titulo, enlace: `#/sesion/${s.id}?reto=${r.id}` }));
    ordenada('guias', (g) => g.publicado && tiene(g.titulo, g.descripcion)).slice(0, 5)
      .forEach((g) => res.push({ tipo: 'guia', titulo: g.titulo, detalle: g.etiqueta, enlace: '#/guia/' + g.id }));
    return { resultados: res };
  },

  'GET notificaciones': () => {
    const est = requerirEstudiante();
    const lista = bd().notificaciones.filter((n) => n.estudiante_id === est.id).sort((a, b) => b.id - a.id).slice(0, 15)
      .map((n) => ({ id: n.id, tipo: n.tipo, titulo: n.titulo, texto: n.texto, enlace: n.enlace, leida_en: n.leida_en, creado_en: n.creado_en, leida: !!n.leida_en, fecha: Formato.fechaCorta(n.creado_en) }));
    return { notificaciones: lista };
  },

  'POST notificaciones/leidas': () => {
    const est = requerirEstudiante();
    bd().notificaciones.forEach((n) => { if (n.estudiante_id === est.id && !n.leida_en) n.leida_en = ahora(); });
    return {};
  },

  /** Reservar: queda anotado aquí y se abre WhatsApp para que la profe confirme el cupo. */
  'POST clase/reservar': (d) => {
    const est = requerirEstudiante();
    const clase = porId('clases_vivo', d.clase_id);
    if (!clase || !clase.publicado) fallar(404, 'No encontramos esa clase.');
    const pub = clasePublica(clase, est);
    if (pub.estado === 'terminada') fallar(422, 'Esta clase ya terminó.');
    if (!pub.reservada) insertar('reservas_clase', { clase_id: clase.id, estudiante_id: est.id, reservado_en: ahora(), asistio_en: null });
    const mensaje = `¡Hola, profe! Quiero reservar un cupo para ${est.nombre} (@${est.usuario}) en la clase «${clase.titulo}» del ${pub.cuando}.`;
    return { clase: clasePublica(clase, est), whatsapp: enlaceWhatsapp(mensaje) };
  },

  'POST clase/cancelar': (d) => {
    const est = requerirEstudiante();
    const clase = porId('clases_vivo', d.clase_id);
    if (!clase) fallar(404, 'No encontramos esa clase.');
    quitar('reservas_clase', (r) => r.clase_id === clase.id && r.estudiante_id === est.id && !r.asistio_en);
    return { clase: clasePublica(clase, est) };
  },

  'POST clase/unirme': (d) => {
    const est = requerirEstudiante();
    const clase = porId('clases_vivo', d.clase_id);
    if (!clase || !clase.publicado) fallar(404, 'No encontramos esa clase.');
    const pub = clasePublica(clase, est);
    if (!pub.puede_unirse) fallar(422, pub.estado === 'terminada' ? 'Esta clase ya terminó.' : 'La clase se abre 15 minutos antes de empezar.');
    if (!clase.enlace) fallar(422, 'Tu profe todavía no ha puesto el enlace de la clase.');
    const antes = num(est.estrellas);
    let r = bd().reservas_clase.find((x) => x.clase_id === clase.id && x.estudiante_id === est.id);
    if (!r) r = insertar('reservas_clase', { clase_id: clase.id, estudiante_id: est.id, reservado_en: ahora(), asistio_en: null });
    if (!r.asistio_en) r.asistio_en = ahora();
    const ganadas = G.darEstrellas(est.id, num(ajuste('estrellas_clase_vivo', '15')), 'Clase en vivo: ' + clase.titulo, 'clase:' + clase.id);
    return { enlace: clase.enlace, premio: G.premio(est.id, antes, ganadas) };
  },
};
