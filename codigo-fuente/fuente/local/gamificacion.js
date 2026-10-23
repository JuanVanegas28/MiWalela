/**
 * Estrellas, niveles, insignias, racha de días y notificaciones.
 */
import { bd, insertar } from './almacen.js';
import { porId, tabla, ordenada } from './contenido.js';
import { ahora, hoy, diaDe, textoGenero } from './util.js';
import { limpiarCache, retoCompletado, pasosLogrados, totalPasos } from './progreso.js';

const estudiante = (id) => bd().estudiantes.find((e) => e.id === id) || null;

/** Suma (o resta) estrellas. Si la referencia se repite, no se vuelven a dar. */
export function darEstrellas(estId, cantidad, motivo, ref) {
  if (!cantidad) return 0;
  if (ref && bd().movimientos_estrellas.some((m) => m.estudiante_id === estId && m.ref === ref)) return 0;
  insertar('movimientos_estrellas', { estudiante_id: estId, cantidad, motivo: String(motivo).slice(0, 160), ref: ref || null, creado_en: ahora() });
  const e = estudiante(estId);
  if (e) e.estrellas = Math.max(0, (e.estrellas || 0) + cantidad);
  return cantidad;
}

export function completarReto(estId, reto) {
  const lista = bd().progreso_retos;
  let p = lista.find((x) => x.estudiante_id === estId && x.reto_id === reto.id);
  if (p && p.estado === 'completado') return 0;
  if (!p) p = insertar('progreso_retos', { estudiante_id: estId, reto_id: reto.id, segundos_vistos: 0 });
  p.estado = 'completado';
  p.completado_en = ahora();
  p.actualizado_en = ahora();
  limpiarCache();
  return darEstrellas(estId, Number(reto.estrellas || 0), 'Reto: ' + reto.titulo, 'reto:' + reto.id);
}

/** Si todos los pasos de la guía están logrados, premia la guía y completa sus retos. */
export function revisarGuia(estId, guiaId) {
  const guia = porId('guias', guiaId);
  if (!guia) return 0;
  const total = totalPasos(guiaId);
  if (!total || pasosLogrados(guiaId, estId).length < total) return 0;
  let ganadas = darEstrellas(estId, Number(guia.estrellas || 0), 'Guía: ' + guia.titulo, 'guia:' + guiaId);
  tabla('retos').filter((r) => r.tipo === 'guia' && r.guia_id === guiaId).forEach((r) => { ganadas += completarReto(estId, r); });
  return ganadas;
}

export function nivel(estrellas, genero = 'otro') {
  let niveles = [...tabla('niveles')].sort((a, b) => a.estrellas_min - b.estrellas_min || a.numero - b.numero);
  if (!niveles.length) niveles = [{ numero: 1, nombre: 'Aprendiz', estrellas_min: 0 }];
  let actual = niveles[0];
  let siguiente = null;
  niveles.forEach((n, i) => {
    if (estrellas >= n.estrellas_min) { actual = n; siguiente = niveles[i + 1] || null; }
  });
  const min = Number(actual.estrellas_min);
  const max = siguiente ? Number(siguiente.estrellas_min) : null;
  return {
    numero: Number(actual.numero),
    nombre: textoGenero(actual.nombre, genero),
    min,
    siguiente: siguiente ? { numero: Number(siguiente.numero), nombre: textoGenero(siguiente.nombre, genero), min: max } : null,
    porcentaje: max ? Math.max(0, Math.min(100, Math.floor(((estrellas - min) * 100) / Math.max(1, max - min)))) : 100,
  };
}

/** Actualiza la racha de días seguidos. */
export function registrarActividad(est) {
  const h = hoy();
  if (est.ultima_actividad === h) return;
  const ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
  est.racha_dias = est.ultima_actividad === diaDe(ayer) ? (est.racha_dias || 0) + 1 : 1;
  est.ultima_actividad = h;
}

/** Avance de una insignia: [actual, meta]. */
export function avanceInsignia(ins, est) {
  const estId = est.id;
  const ref = Number(ins.referencia_id || 0);
  const meta = Math.max(1, Number(ins.cantidad || 1));
  const retosDe = (ids) => { const hechos = ids.filter((id) => retoCompletado(estId, id)).length; return [hechos, Math.max(1, ids.length)]; };
  switch (ins.criterio) {
    case 'registro': return [1, 1];
    case 'reto': return [retoCompletado(estId, ref) ? 1 : 0, 1];
    case 'sesion': return retosDe(tabla('retos').filter((r) => r.sesion_id === ref).map((r) => r.id));
    case 'curso': {
      const sesiones = new Set(tabla('sesiones').filter((s) => s.curso_id === ref && s.publicado).map((s) => s.id));
      return retosDe(tabla('retos').filter((r) => sesiones.has(r.sesion_id)).map((r) => r.id));
    }
    case 'guia': return [pasosLogrados(ref, estId).length, Math.max(1, totalPasos(ref))];
    case 'clase_vivo': return [bd().reservas_clase.filter((r) => r.estudiante_id === estId && r.asistio_en).length, meta];
    case 'coleccion': return [bd().coleccion.filter((c) => c.estudiante_id === estId).length, meta];
    case 'estrellas': return [Number(est.estrellas || 0), meta];
    case 'racha': return [Number(est.racha_dias || 0), meta];
    case 'videos': {
      const videos = new Set(tabla('retos').filter((r) => r.tipo === 'video').map((r) => r.id));
      return [bd().progreso_retos.filter((p) => p.estudiante_id === estId && p.estado === 'completado' && videos.has(p.reto_id)).length, meta];
    }
    default: return [0, 1];
  }
}

export function insigniaPublica(ins) {
  return { id: ins.id, nombre: ins.nombre, descripcion: ins.descripcion, imagen: ins.imagen, icono: ins.icono, color: ins.color };
}

/** Revisa y entrega las insignias nuevas. Devuelve las recién ganadas. */
export function evaluarInsignias(estId) {
  limpiarCache();
  const est = estudiante(estId);
  if (!est) return [];
  const tiene = new Set(bd().insignias_estudiante.filter((x) => x.estudiante_id === estId).map((x) => x.insignia_id));
  const nuevas = [];
  ordenada('insignias', (i) => i.activa && !tiene.has(i.id)).forEach((ins) => {
    const [actual, meta] = avanceInsignia(ins, est);
    if (actual >= meta) {
      insertar('insignias_estudiante', { estudiante_id: estId, insignia_id: ins.id, ganada_en: ahora() });
      nuevas.push(insigniaPublica(ins));
      notificar(estId, 'insignia', `¡Ganaste la insignia «${ins.nombre}»!`, ins.descripcion || '', '#/logros');
    }
  });
  return nuevas;
}

/** Paquete de premios para mostrar la celebración en pantalla. */
export function premio(estId, estrellasAntes, ganadas) {
  const insignias = evaluarInsignias(estId);
  const est = estudiante(estId) || {};
  const total = Number(est.estrellas || 0);
  const genero = est.genero || 'otro';
  const antes = nivel(estrellasAntes, genero);
  const ahoraN = nivel(total, genero);
  return { estrellas: ganadas, total, insignias, nivel: ahoraN, subio_nivel: ahoraN.numero > antes.numero };
}

export function notificar(estId, tipo, tituloTexto, texto = null, enlace = null) {
  insertar('notificaciones', {
    estudiante_id: estId, tipo, titulo: String(tituloTexto).slice(0, 160), texto: texto !== null ? String(texto).slice(0, 255) : null,
    enlace, leida_en: null, creado_en: ahora(),
  });
}
