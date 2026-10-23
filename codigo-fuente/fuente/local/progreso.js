/**
 * Reglas de avance: qué cursos y sesiones están abiertos, qué lleva cada estudiante
 * y cuál es el siguiente reto para «Sigue donde quedaste».
 */
import { bd } from './almacen.js';
import { porId, ordenada, tabla } from './contenido.js';
import { fallar, tiempo, Formato, titulo } from './util.js';

let cacheProgreso = new Map();
let cacheEstructura = new Map();

export function limpiarCache() {
  cacheProgreso = new Map();
  cacheEstructura = new Map();
}

/** reto_id → fila de progreso */
export function progresoRetos(estId) {
  if (!cacheProgreso.has(estId)) {
    const mapa = new Map();
    bd().progreso_retos.filter((p) => p.estudiante_id === estId).forEach((p) => mapa.set(p.reto_id, p));
    cacheProgreso.set(estId, mapa);
  }
  return cacheProgreso.get(estId);
}

export function retoCompletado(estId, retoId) {
  const p = progresoRetos(estId).get(retoId);
  return !!p && p.estado === 'completado';
}

/** Sesiones publicadas de un curso con sus retos. */
export function estructura(cursoId) {
  if (!cacheEstructura.has(cursoId)) {
    const sesiones = ordenada('sesiones', (s) => s.curso_id === cursoId && s.publicado).map((s) => ({
      ...s,
      retos: ordenada('retos', (r) => r.sesion_id === s.id),
    }));
    cacheEstructura.set(cursoId, sesiones);
  }
  return cacheEstructura.get(cursoId);
}

export function nombreCorto(curso) {
  const e = String(curso.etiqueta || '').trim();
  return e ? titulo(e) : curso.titulo;
}

export function motivoBloqueo(curso, est, profundidad = 0) {
  if (Number(est.edad) < Number(curso.edad_minima || 0)) return `Desde los ${curso.edad_minima} años`;
  if (curso.requisito_curso_id && profundidad < 5) {
    const req = porId('cursos', curso.requisito_curso_id);
    if (req && req.publicado) {
      const ev = evaluarCurso(req, est, profundidad + 1);
      if (ev.estado !== 'completado') return 'Al terminar el ' + nombreCorto(req);
    }
  }
  return null;
}

export function evaluarCurso(curso, est, profundidad = 0) {
  const prog = progresoRetos(est.id);
  const sesiones = estructura(curso.id);
  let total = 0;
  let hechos = 0;
  let conActividad = false;
  let anteriorCompleta = true;
  const salida = [];
  const ahora = Date.now();
  sesiones.forEach((s, i) => {
    const nRetos = s.retos.length;
    let nHechos = 0;
    let tocada = false;
    s.retos.forEach((r) => {
      const p = prog.get(r.id);
      if (p) {
        tocada = true;
        if (p.estado === 'completado') nHechos++;
      }
    });
    const completa = nRetos > 0 && nHechos === nRetos;
    let motivo = null;
    let abierta;
    if (nRetos === 0) {
      abierta = false;
      motivo = '¡Muy pronto!';
    } else if (s.apertura === 'siempre') {
      abierta = true;
    } else if (s.apertura === 'fecha') {
      abierta = !s.fecha_apertura || tiempo(s.fecha_apertura) <= ahora;
      if (!abierta) motivo = 'Se abre el ' + Formato.fechaCorta(s.fecha_apertura);
    } else {
      abierta = i === 0 || anteriorCompleta;
      if (!abierta) motivo = 'Se abre cuando termines la Sesión ' + i;
    }
    const estado = !abierta ? 'bloqueada' : completa ? 'completada' : tocada ? 'en_curso' : 'disponible';
    total += nRetos;
    hechos += nHechos;
    conActividad = conActividad || tocada;
    anteriorCompleta = completa;
    salida.push({ id: s.id, numero: i + 1, titulo: s.titulo, estado, abierta, motivo, retos_total: nRetos, retos_hechos: nHechos, fila: s });
  });
  const bloqueo = motivoBloqueo(curso, est, profundidad);
  let estado;
  if (bloqueo !== null) estado = 'bloqueado';
  else if (total > 0 && hechos === total) estado = 'completado';
  else if (conActividad) estado = 'en_progreso';
  else if (curso.tipo === 'taller') estado = 'en_vivo';
  else estado = 'nuevo';
  return { estado, bloqueo, total, hechos, porcentaje: total > 0 ? Math.floor((hechos * 100) / total) : 0, sesiones: salida };
}

/** Carga una sesión verificando que el estudiante pueda verla: [sesion, curso, evaluación]. */
export function sesionAccesible(sesionId, est) {
  const sesion = porId('sesiones', sesionId);
  const curso = sesion && sesion.publicado ? porId('cursos', sesion.curso_id) : null;
  if (!sesion || !sesion.publicado || !curso || !curso.publicado) fallar(404, 'No encontramos esa sesión.');
  const ev = evaluarCurso(curso, est);
  if (ev.bloqueo !== null) fallar(403, 'Este curso aún no está abierto para ti: ' + ev.bloqueo.toLowerCase() + '.');
  const s = ev.sesiones.find((x) => x.id === sesion.id);
  if (!s) fallar(404, 'No encontramos esa sesión.');
  if (!s.abierta) fallar(403, 'Esta sesión todavía está cerrada. ' + (s.motivo || ''));
  return [sesion, curso, ev];
}

export function retoAccesible(retoId, est) {
  const reto = porId('retos', retoId);
  if (!reto) fallar(404, 'No encontramos ese reto.');
  sesionAccesible(reto.sesion_id, est);
  return reto;
}

/** Siguiente reto pendiente, empezando por el último curso en el que trabajó. */
export function continuar(est) {
  const prog = progresoRetos(est.id);
  const mios = [...prog.values()].filter((p) => porId('retos', p.reto_id)).sort((a, b) => String(b.actualizado_en).localeCompare(String(a.actualizado_en)) || b.id - a.id);
  let cursoUltimo = null;
  if (mios.length) {
    const s = porId('sesiones', porId('retos', mios[0].reto_id).sesion_id);
    cursoUltimo = s ? s.curso_id : null;
  }
  const cursos = ordenada('cursos', (c) => c.publicado);
  if (cursoUltimo !== null) cursos.sort((a, b) => (b.id === cursoUltimo) - (a.id === cursoUltimo));
  for (const c of cursos) {
    const ev = evaluarCurso(c, est);
    if (ev.bloqueo !== null || ev.estado === 'completado') continue;
    for (const s of ev.sesiones) {
      if (!s.abierta || s.estado === 'completada') continue;
      for (const r of s.fila.retos) {
        const p = prog.get(r.id);
        if (!p || p.estado !== 'completado') {
          return {
            curso: { id: c.id, etiqueta: c.etiqueta, titulo: c.titulo },
            sesion: { id: s.id, numero: s.numero, titulo: s.titulo },
            reto: { id: r.id, titulo: r.titulo, tipo: r.tipo, icono: r.icono },
            hechos: s.retos_hechos,
            total: s.retos_total,
          };
        }
      }
    }
  }
  return null;
}

/** Pasos logrados de una guía por un estudiante. */
export function pasosLogrados(guiaId, estId) {
  const ids = new Set(tabla('guia_pasos').filter((p) => p.guia_id === guiaId).map((p) => p.id));
  return bd().progreso_pasos.filter((pp) => pp.estudiante_id === estId && ids.has(pp.paso_id));
}

export const totalPasos = (guiaId) => tabla('guia_pasos').filter((p) => p.guia_id === guiaId).length;
