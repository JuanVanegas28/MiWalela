/**
 * Panel de la profe sin servidor: edita un borrador del contenido en este navegador.
 * Cuando la profe toca «Publicar», el borrador se guarda como datos/contenido.js.
 */
import { contenido, publicado, normalizar, TABLAS_CONTENIDO, usarContenido } from './contenido.js';
import { leerBorrador, guardarBorrador } from './borrador.js';
import { RECURSOS, recurso, datosRecurso } from './recursos.js';
import { ErrorApi, fallar, ahora, porOrden, aleatorio } from './util.js';
import { ARCHIVOS_INCLUIDOS } from './archivos-incluidos.js';

const AJUSTES_PERMITIDOS = {
  nombre_sitio: 120, lema: 120, whatsapp: 20, instagram: 60, mensaje_ayuda: 160, correo_contacto: 160,
  estrellas_registro: 4, estrellas_clase_vivo: 4, github_repo: 140, github_rama: 60,
};

/** Página de GitHub para subir archivos a una carpeta del repositorio (o null si no hay repositorio en Ajustes). */
export function enlaceSubidaGithub(carpeta) {
  const a = (contenido() || {}).ajustes || {};
  if (!a.github_repo) return null;
  return `https://github.com/${a.github_repo}/upload/${a.github_rama || 'main'}/${carpeta}`;
}

let borrador = null; // { contenido, base, cambios, exportado_en, actualizado_en }

const copiar = (o) => JSON.parse(JSON.stringify(o));
const t = (nombre) => contenido()[nombre];
const fila = (nombre, id) => t(nombre).find((f) => f.id === Number(id)) || null;

/** Firma del contenido sin la fecha de publicación (para saber si hay cambios). */
function firma(c) {
  if (!c) return '';
  const { publicado_en, version, ...resto } = c;
  return JSON.stringify(resto);
}

export function hayCambios() {
  return firma(contenido()) !== firma(publicado());
}

/** Abre el borrador guardado (o empieza uno desde lo publicado). Devuelve un aviso si hace falta. */
export async function iniciarBorrador() {
  const pub = publicado();
  const guardado = await leerBorrador();
  let aviso = null;
  const fechaPub = (pub && pub.publicado_en) || '';
  if (!guardado || !guardado.contenido) {
    borrador = { contenido: copiar(pub || { version: 1 }), base: fechaPub, cambios: false, exportado_en: null, actualizado_en: ahora() };
  } else {
    borrador = guardado;
    const conocida = [guardado.base || '', guardado.exportado_en || ''].sort().pop();
    if (fechaPub && fechaPub > conocida) {
      // El archivo publicado es más nuevo que lo que conoce este borrador (se publicó desde otro computador).
      if (!guardado.cambios) borrador = { contenido: copiar(pub), base: fechaPub, cambios: false, exportado_en: null, actualizado_en: ahora() };
      else aviso = 'nuevo-publicado';
    }
  }
  usarContenido(borrador.contenido);
  await guardarBorrador(borrador);
  return aviso;
}

export async function usarPublicado() {
  const pub = publicado();
  borrador = { contenido: copiar(pub), base: pub.publicado_en || '', cambios: false, exportado_en: null, actualizado_en: ahora() };
  usarContenido(borrador.contenido);
  await guardarBorrador(borrador);
}

export const estadoBorrador = () => borrador;

function nuevoId(nombre) {
  const c = contenido();
  c.secuencias[nombre] = Math.max(c.secuencias[nombre] || 0, ...t(nombre).map((f) => f.id || 0)) + 1;
  return c.secuencias[nombre];
}

function eliminarEnCascada(nombre, id) {
  const quitar = (tab, fn) => { contenido()[tab] = t(tab).filter((f) => !fn(f)); };
  const nulo = (tab, campo, valor) => t(tab).forEach((f) => { if (f[campo] === valor) f[campo] = null; });
  switch (nombre) {
    case 'cursos':
      t('sesiones').filter((s) => s.curso_id === id).forEach((s) => eliminarEnCascada('sesiones', s.id));
      nulo('cursos', 'requisito_curso_id', id);
      nulo('clases_vivo', 'curso_id', id);
      break;
    case 'sesiones':
      quitar('retos', (r) => r.sesion_id === id);
      nulo('guias', 'sesion_id', id);
      break;
    case 'guias':
      quitar('guia_pasos', (p) => p.guia_id === id);
      quitar('guia_recuerda', (r) => r.guia_id === id);
      nulo('retos', 'guia_id', id);
      break;
    case 'guia_recuerda':
      nulo('guia_pasos', 'recuerda_id', id);
      break;
    default:
      break;
  }
  quitar(nombre, (f) => f.id === id);
}

function lista(nombre) {
  const def = recurso(nombre);
  let filas = [...t(nombre)];
  filas.sort(def.ordenLista || porOrden);
  filas = filas.map((f) => ({ ...f }));
  if (nombre === 'cursos') {
    filas.forEach((f) => {
      const ses = t('sesiones').filter((s) => s.curso_id === f.id).map((s) => s.id);
      f.n_sesiones = ses.length;
      f.n_retos = t('retos').filter((r) => ses.includes(r.sesion_id)).length;
    });
  } else if (nombre === 'guias') {
    filas.forEach((f) => {
      f.n_pasos = t('guia_pasos').filter((p) => p.guia_id === f.id).length;
      const s = f.sesion_id ? fila('sesiones', f.sesion_id) : null;
      f.sesion = s ? s.titulo : null;
    });
  } else if (nombre === 'clases_vivo') {
    filas.forEach((f) => { const c = f.curso_id ? fila('cursos', f.curso_id) : null; f.curso = c ? c.etiqueta : null; });
  }
  return filas;
}

/* ---------------- Archivos: sin servidor, las imágenes viajan dentro de contenido.js ---------------- */
function leerComoDataUrl(blob) {
  return new Promise((resolver, rechazar) => {
    const r = new FileReader();
    r.onload = () => resolver(r.result);
    r.onerror = () => rechazar(r.error);
    r.readAsDataURL(blob);
  });
}

async function imagenLiviana(archivo, maxLado) {
  if (!/^image\//.test(archivo.type)) fallar(422, 'Ese archivo no es una imagen.');
  if (archivo.size > 25 * 1024 * 1024) fallar(422, 'La imagen pesa más de 25 MB.');
  let bmp;
  try { bmp = await createImageBitmap(archivo, { imageOrientation: 'from-image' }); } catch { fallar(422, 'No pudimos leer esa imagen. Prueba con una JPG o PNG.'); }
  const esc = Math.min(1, maxLado / Math.max(bmp.width, bmp.height));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.max(1, Math.round(bmp.width * esc));
  lienzo.height = Math.max(1, Math.round(bmp.height * esc));
  lienzo.getContext('2d').drawImage(bmp, 0, 0, lienzo.width, lienzo.height);
  const intentar = (tipo, q) => new Promise((r) => lienzo.toBlob(r, tipo, q));
  let blob = await intentar('image/webp', 0.8);
  if (!blob || blob.type !== 'image/webp') blob = await intentar(archivo.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.82);
  return leerComoDataUrl(blob);
}

function duracionVideo(archivo) {
  return new Promise((resolver) => {
    const v = document.createElement('video');
    const url = URL.createObjectURL(archivo);
    const fin = (d) => { URL.revokeObjectURL(url); resolver(d); };
    v.preload = 'metadata';
    v.onloadedmetadata = () => fin(Number.isFinite(v.duration) ? Math.round(v.duration) : null);
    v.onerror = () => fin(null);
    v.src = url;
    setTimeout(() => fin(null), 8000);
  });
}

async function subir(datos, archivo) {
  if (!archivo) fallar(422, 'Elige un archivo.');
  const tipo = datos.tipo || 'imagen';
  const nombre = archivo.name || 'archivo';
  if (tipo === 'imagen') {
    const max = datos.carpeta === 'guias' ? 1400 : datos.carpeta === 'insignias' || datos.carpeta === 'retos' ? 600 : 1100;
    return { ruta: await imagenLiviana(archivo, max) };
  }
  if (tipo === 'subtitulos') {
    if (!/\.(vtt|srt)$/i.test(nombre) || archivo.size > 2 * 1024 * 1024) fallar(422, 'Los subtítulos deben ser un archivo .vtt o .srt.');
    let texto = (await archivo.text()).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
    if (/\.srt$/i.test(nombre) || !texto.trimStart().startsWith('WEBVTT')) texto = 'WEBVTT\n\n' + texto.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2').trimStart();
    return { ruta: 'data:text/vtt;charset=utf-8,' + encodeURIComponent(texto) };
  }
  if (tipo === 'video' || tipo === 'pdf') {
    if (tipo === 'video' && !/\.(mp4|webm|m4v)$/i.test(nombre)) fallar(422, 'El video debe ser MP4 (o WebM).');
    if (tipo === 'pdf' && !/\.pdf$/i.test(nombre)) fallar(422, 'Elige un archivo PDF.');
    if (/[\\/"'<>]/.test(nombre)) fallar(422, 'Cambia el nombre del archivo: no puede tener comillas ni barras.');
    const ruta = 'assets/media/' + nombre.trim();
    const r = { ruta, copiar: nombre.trim() };
    if (tipo === 'video') r.duracion = await duracionVideo(archivo);
    return r;
  }
  fallar(422, 'Tipo de archivo no soportado.');
  return null;
}

/** Archivos que el contenido usa y que no venían con el campus: hay que copiarlos en assets/media. */
export function archivosPorCopiar() {
  const usados = new Set();
  const c = contenido();
  TABLAS_CONTENIDO.forEach((tab) => (c[tab] || []).forEach((f) => Object.values(f).forEach((v) => {
    if (typeof v === 'string' && /^(assets|uploads)\//.test(v)) usados.add(v);
  })));
  return [...usados].filter((r) => !ARCHIVOS_INCLUIDOS.includes(r)).sort();
}

/** Texto completo de datos/contenido.js */
export function textoPublicacion() {
  const c = copiar(contenido());
  c.version = 1;
  c.publicado_en = ahora();
  const ordenado = { version: 1, publicado_en: c.publicado_en, ...c };
  return {
    fecha: c.publicado_en,
    texto: '/* Contenido del campus MiWalela (cursos, sesiones, retos, guías, clases, insignias y niveles).\n'
      + '   Lo genera el Panel de la profe con el botón «Publicar». No hace falta editarlo a mano. */\n'
      + 'window.MIWALELA_CONTENIDO = ' + JSON.stringify(ordenado, null, 1) + ';\n',
  };
}

export async function marcarExportado(fecha) {
  borrador.exportado_en = fecha;
  borrador.cambios = false;
  await guardarBorrador(borrador);
}

/** Lee un datos/contenido.js (por ejemplo, el de otro computador) y lo vuelve el borrador. */
export async function abrirArchivoContenido(texto) {
  const m = String(texto).match(/MIWALELA_CONTENIDO\s*=\s*([\s\S]*?);?\s*$/);
  let c = null;
  try { c = JSON.parse(m ? m[1].trim().replace(/;$/, '') : texto); } catch { c = null; }
  if (!c || !Array.isArray(c.cursos)) throw new ErrorApi('Ese archivo no es un contenido.js del campus.', 422);
  borrador = { contenido: normalizar(c), base: c.publicado_en || '', cambios: true, exportado_en: null, actualizado_en: ahora() };
  usarContenido(borrador.contenido);
  await guardarBorrador(borrador);
}

export const rutasAdmin = {
  'GET admin/estado': () => ({ admin: { id: 1, nombre: 'Profe', correo: '' }, sitio: {} }),
  'GET admin/contadores': () => ({ preguntas: 0, fotos: 0 }),

  'GET admin/lista': (d) => ({ filas: lista(d.recurso) }),

  'GET admin/obtener': (d) => {
    recurso(d.recurso);
    const f = fila(d.recurso, d.id);
    if (!f) fallar(404, 'No encontramos ese contenido.');
    return { fila: { ...f } };
  },

  'POST admin/guardar': (d) => {
    const nombre = d.recurso;
    const def = recurso(nombre);
    const id = d.id ? Number(d.id) : null;
    const actual = id ? fila(nombre, id) : null;
    if (id && !actual) fallar(404, 'No encontramos ese contenido.');
    const datos = datosRecurso(def, d.datos || {}, actual, (tab, ref) => !!fila(tab, ref));
    if (def.validar) {
      const error = def.validar({ ...(actual || {}), ...datos }, id);
      if (error) fallar(422, error);
    }
    let f;
    if (actual) {
      if (def.actualizado) datos[def.actualizado] = ahora();
      Object.assign(actual, datos);
      f = actual;
    } else {
      if (def.orden) {
        const hermanos = def.padre ? t(nombre).filter((x) => x[def.padre] === datos[def.padre]) : t(nombre);
        datos[def.orden] = Math.max(0, ...hermanos.map((x) => Number(x[def.orden]) || 0)) + 1;
      }
      if (def.creado) datos.creado_en = ahora();
      f = { id: nuevoId(nombre), ...datos };
      t(nombre).push(f);
    }
    return { fila: { ...f }, mensaje: 'Guardado' };
  },

  'POST admin/eliminar': (d) => {
    recurso(d.recurso);
    if (d.recurso === 'niveles' && t('niveles').length <= 1) fallar(422, 'Debe existir al menos un nivel.');
    eliminarEnCascada(d.recurso, Number(d.id));
    return { mensaje: 'Eliminado' };
  },

  'POST admin/ordenar': (d) => {
    const def = recurso(d.recurso);
    if (!def.orden) fallar(422, 'Este contenido no se puede ordenar.');
    (d.ids || []).forEach((id, i) => { const f = fila(d.recurso, id); if (f) f[def.orden] = i + 1; });
    return {};
  },

  'POST admin/subir': (d, archivo) => subir(d, archivo),

  'GET admin/opciones': () => {
    const cursos = [...t('cursos')].sort(porOrden);
    const ordenCurso = new Map(cursos.map((c, i) => [c.id, i]));
    const sesiones = [...t('sesiones')].sort((a, b) => (ordenCurso.get(a.curso_id) ?? 99) - (ordenCurso.get(b.curso_id) ?? 99) || porOrden(a, b))
      .map((s) => ({ id: s.id, titulo: s.titulo, curso_id: s.curso_id, etiqueta: (fila('cursos', s.curso_id) || {}).etiqueta || '' }));
    const ordenSesion = new Map(sesiones.map((s, i) => [s.id, i]));
    const retos = [...t('retos')].sort((a, b) => (ordenSesion.get(a.sesion_id) ?? 999) - (ordenSesion.get(b.sesion_id) ?? 999) || porOrden(a, b))
      .map((r) => { const s = fila('sesiones', r.sesion_id) || {}; return { id: r.id, titulo: r.titulo, sesion: s.titulo || '', etiqueta: (fila('cursos', s.curso_id) || {}).etiqueta || '' }; });
    return {
      cursos: cursos.map((c) => ({ id: c.id, etiqueta: c.etiqueta, titulo: c.titulo })),
      sesiones,
      guias: [...t('guias')].sort(porOrden).map((g) => ({ id: g.id, etiqueta: g.etiqueta, titulo: g.titulo })),
      retos,
    };
  },

  'GET admin/curso': (d) => {
    const curso = fila('cursos', d.id);
    if (!curso) fallar(404, 'No encontramos ese curso.');
    const sesiones = t('sesiones').filter((s) => s.curso_id === curso.id).sort(porOrden)
      .map((s) => ({ ...s, retos: t('retos').filter((r) => r.sesion_id === s.id).sort(porOrden).map((r) => ({ ...r })) }));
    return { curso: { ...curso }, sesiones };
  },

  'GET admin/guia': (d) => {
    const guia = fila('guias', d.id);
    if (!guia) fallar(404, 'No encontramos esa guía.');
    return {
      guia: { ...guia },
      pasos: t('guia_pasos').filter((p) => p.guia_id === guia.id).sort(porOrden).map((p) => ({ ...p })),
      recuerda: t('guia_recuerda').filter((r) => r.guia_id === guia.id).sort(porOrden).map((r) => ({ ...r })),
    };
  },

  'GET admin/ajustes': () => ({ ajustes: { ...contenido().ajustes } }),

  'POST admin/ajustes': (d) => {
    const entrada = d.ajustes || {};
    Object.entries(AJUSTES_PERMITIDOS).forEach(([clave, max]) => {
      if (!Object.prototype.hasOwnProperty.call(entrada, clave)) return;
      let v = String(entrada[clave] ?? '').trim();
      if (v.length > max) fallar(422, `El ajuste «${clave}» es muy largo.`);
      if (clave.startsWith('estrellas_') && !/^\d+$/.test(v)) fallar(422, 'Las estrellas deben ser un número.');
      if (clave === 'whatsapp') v = v.replace(/\D+/g, '');
      if (clave === 'instagram') v = v.replace(/^@/, '');
      if (clave === 'github_repo' && v) {
        // Acepta «usuario/repositorio» o el enlace completo del repositorio.
        v = v.replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/\.git$/i, '').replace(/\/+$/, '').split('/').slice(0, 2).join('/');
        if (!/^[\w.-]+\/[\w.-]+$/.test(v)) fallar(422, 'Escribe el repositorio como usuario/nombre-del-repositorio.', { campo: 'github_repo' });
      }
      if (clave === 'github_rama' && v && !/^[\w./-]+$/.test(v)) fallar(422, 'El nombre de la rama no es válido.', { campo: 'github_rama' });
      contenido().ajustes[clave] = v;
    });
    return { mensaje: 'Ajustes guardados' };
  },
};

/** Atiende las peticiones del panel sobre el borrador y lo guarda si cambió. */
export function crearServidorAdmin() {
  let cola = Promise.resolve();
  async function ejecutar(metodo, ruta, datos, archivo) {
    const fn = rutasAdmin[`${metodo} ${ruta}`];
    if (!fn) fallar(404, 'Esta opción no está disponible en la versión sin servidor.');
    const antes = JSON.stringify(borrador.contenido);
    try {
      const r = await fn(datos || {}, archivo || null);
      if (JSON.stringify(borrador.contenido) !== antes) {
        borrador.cambios = true;
        borrador.actualizado_en = ahora();
        await guardarBorrador(borrador);
        window.dispatchEvent(new CustomEvent('miwalela:borrador'));
      }
      return { ok: true, ...(r || {}) };
    } catch (e) {
      borrador.contenido = JSON.parse(antes);
      usarContenido(borrador.contenido);
      if (e instanceof ErrorApi) throw e;
      console.error('[MiWalela panel]', e);
      throw new ErrorApi(e && e.message ? e.message : 'Ups, algo salió mal. Intenta de nuevo.', 500);
    }
  }
  return (metodo, ruta, datos, archivo) => {
    const tarea = cola.then(() => ejecutar(metodo, ruta, datos, archivo));
    cola = tarea.catch(() => {});
    return tarea;
  };
}

export { aleatorio, RECURSOS };
