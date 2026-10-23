/**
 * Contenidos que la profe crea y edita en su panel, con sus reglas (igual que la versión PHP).
 * Tipos de campo: texto, largo, entero, bool, opcion, ref, ruta, url_o_ruta, url, fecha_hora, fecha.
 */
import { fallar, COLORES, aFecha, formatear } from './util.js';

const ICONOS_RECUERDA = ['corazon', 'flor', 'estrella', 'lapiz', 'tijeras', 'boton', 'hilo', 'regla'];

export const RECURSOS = {
  cursos: {
    orden: 'orden', creado: true, actualizado: 'actualizado_en',
    campos: {
      tipo: ['opcion', ['modulo', 'taller', 'mini_reto'], 'modulo'],
      etiqueta: ['texto', 40, true],
      titulo: ['texto', 160, true],
      resaltar: ['texto', 80],
      descripcion: ['texto', 255],
      introduccion: ['texto', 255],
      portada: ['ruta'],
      portada_tipo: ['opcion', ['foto', 'icono'], 'foto'],
      color: ['opcion', COLORES, 'lila'],
      edad_minima: ['entero', 3, 18, 6],
      requisito_curso_id: ['ref', 'cursos'],
      sesiones_planeadas: ['entero', 0, 60, null],
      objetivos: ['largo', 4000],
      kit: ['largo', 4000],
      frase_recuerda: ['texto', 255],
      modalidad: ['opcion', ['virtual', 'presencial', 'mixta'], 'virtual'],
      publicado: ['bool', false],
    },
    validar: (d, id) => (id && Number(d.requisito_curso_id) === id ? 'Un curso no puede ser requisito de sí mismo.' : null),
  },
  sesiones: {
    padre: 'curso_id', orden: 'orden', creado: true,
    campos: {
      curso_id: ['ref', 'cursos', true],
      titulo: ['texto', 160, true],
      proposito: ['largo', 4000],
      conexion_dba: ['texto', 255],
      apertura: ['opcion', ['siempre', 'anterior', 'fecha'], 'anterior'],
      fecha_apertura: ['fecha_hora'],
      publicado: ['bool', true],
    },
    validar: (d) => (d.apertura === 'fecha' && !d.fecha_apertura ? 'Elige la fecha en que se abre la sesión.' : null),
  },
  retos: {
    padre: 'sesion_id', orden: 'orden', creado: true,
    campos: {
      sesion_id: ['ref', 'sesiones', true],
      tipo: ['opcion', ['actividad', 'video', 'guia'], 'actividad'],
      titulo: ['texto', 160, true],
      descripcion: ['largo', 4000],
      icono: ['ruta'],
      estrellas: ['entero', 0, 500, 10],
      permite_foto: ['bool', false],
      video_fuente: ['opcion', ['archivo', 'url', 'youtube'], null],
      video_url: ['url_o_ruta', 500],
      video_poster: ['ruta'],
      video_subtitulos: ['ruta'],
      video_duracion: ['entero', 0, 86400, null],
      guia_id: ['ref', 'guias'],
    },
    validar: (d) => {
      if (d.tipo === 'video' && !d.video_url) return 'Pega el enlace de YouTube o elige el archivo del video.';
      if (d.tipo === 'video' && d.video_fuente === 'youtube' && !/(youtube\.com|youtu\.be)\//i.test(String(d.video_url))) return 'El enlace de YouTube no parece válido.';
      if (d.tipo === 'guia' && !d.guia_id) return 'Elige la guía de este reto.';
      return null;
    },
  },
  guias: {
    orden: 'orden', creado: true,
    campos: {
      sesion_id: ['ref', 'sesiones'],
      etiqueta: ['texto', 60],
      titulo: ['texto', 160, true],
      resaltar: ['texto', 80],
      descripcion: ['texto', 255],
      portada: ['ruta'],
      pdf: ['url_o_ruta', 500],
      conexion_dba: ['texto', 255],
      frase_final: ['texto', 255],
      estrellas: ['entero', 0, 500, 20],
      publicado: ['bool', true],
    },
  },
  guia_pasos: {
    padre: 'guia_id', orden: 'orden',
    campos: {
      guia_id: ['ref', 'guias', true],
      etiqueta: ['texto', 60],
      numero: ['texto', 4],
      titulo: ['texto', 160, true],
      texto: ['largo', 2000],
      consejo: ['texto', 255],
      imagen: ['ruta'],
      recuerda_id: ['ref', 'guia_recuerda'],
    },
  },
  guia_recuerda: {
    padre: 'guia_id', orden: 'orden',
    campos: {
      guia_id: ['ref', 'guias', true],
      icono: ['opcion', ICONOS_RECUERDA, 'corazon'],
      texto: ['texto', 160, true],
    },
  },
  clases_vivo: {
    creado: true, ordenLista: (a, b) => String(b.inicia_en).localeCompare(String(a.inicia_en)),
    campos: {
      curso_id: ['ref', 'cursos'],
      titulo: ['texto', 160, true],
      descripcion: ['texto', 255],
      inicia_en: ['fecha_hora', true],
      duracion_min: ['entero', 10, 600, 60],
      modalidad: ['opcion', ['virtual', 'presencial'], 'virtual'],
      enlace: ['url', 500],
      lugar: ['texto', 160],
      cupos: ['entero', 1, 5000, null],
      publicado: ['bool', true],
    },
    validar: (d) => (d.modalidad === 'virtual' && !d.enlace ? 'Pega el enlace de la clase (Meet, Zoom, YouTube Live…).' : null),
  },
  retos_semana: {
    creado: true, ordenLista: (a, b) => String(b.inicia).localeCompare(String(a.inicia)),
    campos: {
      titulo: ['texto', 160, true],
      descripcion: ['texto', 255],
      estrellas: ['entero', 0, 500, 20],
      inicia: ['fecha', true],
      termina: ['fecha', true],
      publicado: ['bool', true],
    },
    validar: (d) => (d.inicia && d.termina && d.termina < d.inicia ? 'La fecha final debe ser después de la inicial.' : null),
  },
  insignias: {
    orden: 'orden', creado: true,
    campos: {
      nombre: ['texto', 80, true],
      descripcion: ['texto', 255],
      imagen: ['ruta'],
      icono: ['opcion', ['estrella', 'corazon', 'camara', 'foto', 'tijeras', 'hilo', 'boton', 'trofeo', 'cohete'], null],
      color: ['opcion', COLORES, 'amarillo'],
      criterio: ['opcion', ['registro', 'reto', 'sesion', 'curso', 'guia', 'clase_vivo', 'coleccion', 'estrellas', 'racha', 'videos'], 'reto'],
      referencia_id: ['entero', 1, 999999999, null],
      cantidad: ['entero', 1, 100000, null],
      activa: ['bool', true],
    },
    validar: (d) => {
      if (['reto', 'sesion', 'curso', 'guia'].includes(d.criterio) && !d.referencia_id) return `Elige a qué ${d.criterio} corresponde la insignia.`;
      if (['estrellas', 'racha'].includes(d.criterio) && !d.cantidad) return 'Indica la cantidad necesaria para ganarla.';
      return null;
    },
  },
  niveles: {
    ordenLista: (a, b) => a.estrellas_min - b.estrellas_min || a.numero - b.numero,
    campos: {
      numero: ['entero', 1, 100, null, true],
      nombre: ['texto', 80, true],
      estrellas_min: ['entero', 0, 1000000, 0],
    },
  },
};

export function recurso(nombre) {
  if (!RECURSOS[nombre]) fallar(404, 'Contenido desconocido.');
  return RECURSOS[nombre];
}

/** Archivo local del sitio (assets/…) o imagen/subtítulo incrustado (data:). */
export function rutaValida(v) {
  const s = String(v || '');
  if (!s) return true;
  if (/^data:(image\/(webp|jpeg|png|gif)|text\/vtt)[;,]/i.test(s)) return true;
  if (/^local:[a-f0-9]{16}\/[^"'<>\\\r\n]+$/.test(s)) return true;
  return /^(assets|uploads)\/[^"'<>\\\r\n]+$/.test(s) && !s.includes('..');
}

/** Valida y normaliza los datos según la definición (edición parcial: lo que no viene se conserva). */
export function datosRecurso(def, entrada, actual, existe) {
  const datos = {};
  Object.entries(def.campos).forEach(([campo, regla]) => {
    const tipo = regla[0];
    const viene = Object.prototype.hasOwnProperty.call(entrada, campo);
    if (!viene && actual) return;
    let v = viene ? entrada[campo] : null;
    if (typeof v === 'string') v = v.trim();
    const vacio = v === null || v === undefined || v === '';
    switch (tipo) {
      case 'texto':
      case 'largo': {
        const [, max, req] = regla;
        if (vacio) { if (req) fallar(422, `Completa el campo «${campo}».`, { campo }); datos[campo] = null; break; }
        if (String(v).length > max) fallar(422, `El campo «${campo}» es muy largo (máx. ${max}).`, { campo });
        datos[campo] = String(v);
        break;
      }
      case 'entero': {
        const [, min, max, def0 = null, req = false] = regla;
        if (vacio) { if (req) fallar(422, `Completa el campo «${campo}».`, { campo }); datos[campo] = def0; break; }
        const n = Number(v);
        if (!Number.isFinite(n) || Math.trunc(n) < min || Math.trunc(n) > max) fallar(422, `El campo «${campo}» debe ser un número entre ${min} y ${max}.`, { campo });
        datos[campo] = Math.trunc(n);
        break;
      }
      case 'bool':
        datos[campo] = viene ? (v === true || v === 1 || v === '1' || v === 'true' || v === 'on' ? 1 : 0) : (regla[1] ? 1 : 0);
        break;
      case 'opcion':
        if (vacio) { datos[campo] = regla[2] ?? null; break; }
        if (!regla[1].includes(v)) fallar(422, `Opción no válida en «${campo}».`, { campo });
        datos[campo] = v;
        break;
      case 'ref': {
        if (vacio) { if (regla[2]) fallar(422, `Falta elegir «${campo}».`, { campo }); datos[campo] = null; break; }
        if (!existe(regla[1], Number(v))) fallar(422, `No existe el elemento elegido en «${campo}».`, { campo });
        datos[campo] = Number(v);
        break;
      }
      case 'ruta':
        if (vacio) { datos[campo] = null; break; }
        if (!rutaValida(v)) fallar(422, `Archivo no válido en «${campo}».`, { campo });
        datos[campo] = String(v);
        break;
      case 'url':
      case 'url_o_ruta': {
        if (vacio) { datos[campo] = null; break; }
        const esUrl = /^https?:\/\/[^\s<>"]+$/i.test(String(v));
        if (!esUrl && !(tipo === 'url_o_ruta' && rutaValida(v))) fallar(422, `El enlace de «${campo}» debe empezar por https://`, { campo });
        if (String(v).length > (regla[1] || 500)) fallar(422, 'El enlace es muy largo.', { campo });
        datos[campo] = String(v);
        break;
      }
      case 'fecha_hora': {
        if (vacio) { if (regla[1]) fallar(422, 'Elige la fecha y hora.', { campo }); datos[campo] = null; break; }
        const f = aFecha(v);
        if (!f) fallar(422, 'Fecha no válida.', { campo });
        f.setSeconds(0);
        datos[campo] = formatear(f);
        break;
      }
      case 'fecha': {
        if (vacio) { if (regla[1]) fallar(422, 'Elige la fecha.', { campo }); datos[campo] = null; break; }
        const f = aFecha(v);
        if (!f) fallar(422, 'Fecha no válida.', { campo });
        datos[campo] = formatear(f).slice(0, 10);
        break;
      }
      default:
        break;
    }
  });
  return datos;
}
