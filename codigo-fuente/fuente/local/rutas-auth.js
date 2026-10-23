/**
 * Cuentas en este dispositivo: entrar, registrarse, elegir perfil, cambiar la contraseña
 * y llevar el progreso a otro dispositivo (copia de seguridad).
 */
import { bd, insertar, quitar, sesion, fijarSesion, borrarSesion, TABLAS, leerFoto, guardarFoto, aDataUrl, aBlob, borrarFoto, sesionProfe, fijarSesionProfe, borrarSesionProfe } from './almacen.js';
import { ajuste } from './contenido.js';
import { fallar, ahora, hoy, slugUsuario, textoGenero, cifrarClave, claveCorrecta, aleatorio, GRADOS, GENEROS, PERSONAJES, COLORES, PARENTESCOS } from './util.js';
import { sitioPublico, estudiantePublico, familiaPublica } from './publico.js';
import { registrarActividad, evaluarInsignias, darEstrellas, notificar, premio } from './gamificacion.js';

const txt = (v, max) => String(v ?? '').trim().slice(0, max);

/* ---------------- Profe ---------------- */
export function profeActual() {
  const s = sesionProfe();
  if (!s.profe_id) return null;
  return bd().profes.find((p) => p.id === s.profe_id && p.activo !== 0) || null;
}

export function requerirProfe() {
  const p = profeActual();
  if (!p) fallar(401, 'Inicia sesión como profe para continuar.', { sesion: false });
  return p;
}

export const profePublico = (p) => ({ id: p.id, nombre: p.nombre, correo: p.correo });

const correoValido = (c) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c);

export function estudianteActual() {
  const s = sesion();
  if (!s.estudiante_id) return null;
  const e = bd().estudiantes.find((x) => x.id === s.estudiante_id);
  const a = e ? bd().acudientes.find((x) => x.id === e.acudiente_id) : null;
  if (!e || !a || e.activo === 0) return null;
  return e;
}

export function requerirEstudiante() {
  const e = estudianteActual();
  if (!e) fallar(401, 'Inicia sesión para continuar.', { sesion: false });
  return e;
}

function acudienteId() {
  const s = sesion();
  return s.acudiente_id && bd().acudientes.some((a) => a.id === s.acudiente_id) ? s.acudiente_id : 0;
}

function entrarComoEstudiante(id, recordar) {
  const e = bd().estudiantes.find((x) => x.id === id);
  fijarSesion({ estudiante_id: id, acudiente_id: e ? e.acudiente_id : 0 }, recordar);
  if (e) e.ultimo_acceso = ahora();
}

function entrarComoAcudiente(id, recordar = false) {
  fijarSesion({ estudiante_id: 0, acudiente_id: id }, recordar);
}

function validarAdulto(d, { conClave = true } = {}) {
  const nombre = txt(d.nombre, 120);
  const correo = txt(d.correo, 160).toLowerCase();
  const celular = String(d.celular || '').replace(/\D+/g, '');
  if (nombre.length < 3) fallar(422, 'Escribe tu nombre y apellido.', { campo: 'nombre' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) fallar(422, 'Ese correo no parece válido.', { campo: 'correo' });
  if (celular.length < 7 || celular.length > 15) fallar(422, 'Revisa el número de celular.', { campo: 'celular' });
  if (conClave) {
    if (String(d.clave || '').length < 8) fallar(422, 'La contraseña debe tener mínimo 8 caracteres.', { campo: 'clave' });
    if (d.clave !== d.clave2) fallar(422, 'Las contraseñas no coinciden.', { campo: 'clave2' });
  }
  return { nombre, correo, celular };
}

export const rutasAuth = {
  'GET auth/estado': () => {
    const datos = { csrf: '', sitio: sitioPublico(), estudiante: null, familia: null };
    const est = estudianteActual();
    if (est) {
      if (est.ultima_actividad !== hoy()) {
        registrarActividad(est);
        evaluarInsignias(est.id);
      }
      datos.estudiante = estudiantePublico(est);
    }
    if (acudienteId()) datos.familia = familiaPublica(acudienteId());
    return datos;
  },

  'POST auth/entrar': async (d) => {
    const ident = txt(d.identificador, 160).toLowerCase();
    const clave = String(d.clave || '');
    if (!ident) fallar(422, 'Escribe tu usuario o correo.', { campo: 'identificador' });
    if (!clave) fallar(422, 'Escribe tu contraseña.', { campo: 'clave' });
    let est = null;
    let acu = null;
    if (ident.includes('@')) {
      acu = bd().acudientes.find((a) => a.correo === ident) || null;
    } else {
      est = bd().estudiantes.find((e) => e.usuario === ident) || null;
      acu = est ? bd().acudientes.find((a) => a.id === est.acudiente_id) : null;
    }
    if (!acu) fallar(401, 'El usuario o la contraseña no coinciden. ¡Inténtalo otra vez!', { campo: 'identificador' });
    if (!(await claveCorrecta(clave, acu.clave_hash))) fallar(401, 'El usuario o la contraseña no coinciden. ¡Inténtalo otra vez!', { campo: 'clave' });
    if (est && est.activo === 0) fallar(403, 'Este perfil está pausado.');
    const recordar = !!d.recordar;
    if (est) { entrarComoEstudiante(est.id, recordar); return { destino: 'inicio' }; }
    const hijos = bd().estudiantes.filter((e) => e.acudiente_id === acu.id && e.activo !== 0);
    if (hijos.length === 1) { entrarComoEstudiante(hijos[0].id, recordar); return { destino: 'inicio' }; }
    entrarComoAcudiente(acu.id, recordar);
    return { destino: hijos.length ? 'elegir' : 'registro-perfil', familia: familiaPublica(acu.id) };
  },

  'POST auth/elegir': (d) => {
    const acuId = acudienteId();
    const id = Number(d.estudiante_id);
    const est = bd().estudiantes.find((e) => e.id === id && e.acudiente_id === acuId && e.activo !== 0);
    if (!acuId || !est) fallar(403, 'No pudimos abrir ese perfil. Inicia sesión de nuevo.');
    entrarComoEstudiante(id, !!sesion().recordar);
    return { destino: 'inicio' };
  },

  'POST auth/salir': () => { borrarSesion(); return { csrf: '' }; },

  'POST auth/registro-adulto': async (d) => {
    const { nombre, correo, celular } = validarAdulto(d);
    if (!d.autoriza) fallar(422, 'Necesitamos tu autorización para el tratamiento de datos de tu hija o hijo.', { campo: 'autoriza' });
    if (bd().acudientes.some((a) => a.correo === correo)) {
      fallar(409, 'Este correo ya tiene una cuenta. Inicia sesión con él para agregar otro MiniDiseñador.', { campo: 'correo' });
    }
    const a = insertar('acudientes', {
      nombre, parentesco: PARENTESCOS.includes(d.parentesco) ? d.parentesco : 'Mamá', correo, celular,
      clave_hash: await cifrarClave(String(d.clave)), autoriza_datos_en: ahora(), avisos_whatsapp: d.avisos ? 1 : 0, creado_en: ahora(),
    });
    entrarComoAcudiente(a.id, true);
    return { destino: 'registro-perfil', familia: familiaPublica(a.id) };
  },

  'GET auth/usuario-disponible': (d) => {
    const u = slugUsuario(d.usuario);
    if (u.length < 3) return { disponible: false, usuario: u, mensaje: 'Mínimo 3 letras' };
    const ocupado = (x) => bd().estudiantes.some((e) => e.usuario === x);
    const libre = !ocupado(u);
    let sugerencia = u;
    if (!libre) {
      for (let i = 0; i < 30; i++) {
        const prueba = u.slice(0, 20) + (2 + Math.floor(Math.random() * 998));
        if (!ocupado(prueba)) { sugerencia = prueba; break; }
      }
    }
    return { disponible: libre, usuario: u, sugerencia };
  },

  'POST auth/registro-estudiante': (d) => {
    const acuId = acudienteId();
    if (!acuId) fallar(401, 'Primero un adulto debe completar el paso 1.', { sesion: false });
    if (bd().estudiantes.filter((e) => e.acudiente_id === acuId).length >= 10) fallar(422, 'Esta familia ya tiene el máximo de perfiles.');
    const nombre = txt(d.nombre, 60);
    const usuario = slugUsuario(d.usuario);
    const edad = Number(d.edad);
    if (!nombre) fallar(422, 'Escribe tu nombre o apodo.', { campo: 'nombre' });
    if (!Number.isInteger(edad) || edad < 4 || edad > 17) fallar(422, 'Cuéntanos cuántos años tienes.', { campo: 'edad' });
    if (!GRADOS.includes(d.grado)) fallar(422, 'Cuéntanos en qué grado estás.', { campo: 'grado' });
    if (usuario.length < 3) fallar(422, 'Tu usuario debe tener mínimo 3 letras o números.', { campo: 'usuario' });
    if (bd().estudiantes.some((e) => e.usuario === usuario)) fallar(409, 'Ese usuario ya existe. Prueba con otro.', { campo: 'usuario' });
    const genero = GENEROS.includes(d.genero) ? d.genero : 'otro';
    const e = insertar('estudiantes', {
      acudiente_id: acuId, nombre, usuario, edad, grado: d.grado, genero,
      personaje: PERSONAJES.includes(d.personaje) ? d.personaje : 'walela', color: COLORES.includes(d.color) ? d.color : 'fucsia',
      estrellas: 0, racha_dias: 1, ultima_actividad: hoy(), ultimo_acceso: ahora(), activo: 1, creado_en: ahora(),
    });
    const bono = Number(ajuste('estrellas_registro', '10'));
    darEstrellas(e.id, bono, textoGenero('¡Bienvenid{a|o} al universo!', genero), 'registro');
    notificar(e.id, 'bienvenida', textoGenero('¡Bienvenid{a|o} al campus, ', genero) + nombre + '!', 'Tu aventura creativa empieza hoy.', '#/inicio');
    const p = premio(e.id, 0, bono);
    entrarComoEstudiante(e.id, !!sesion().recordar);
    return { estudiante: estudiantePublico(e), premio: p };
  },

  /** Sin correo que enviar: el adulto demuestra que es él con el correo y el celular que registró. */
  'POST auth/olvide': async (d) => {
    const correo = txt(d.correo, 160).toLowerCase();
    const celular = String(d.celular || '').replace(/\D+/g, '');
    const acu = bd().acudientes.find((a) => a.correo === correo);
    if (!acu || !celular || acu.celular !== celular) fallar(422, 'El correo y el celular no coinciden con ninguna familia registrada.');
    if (String(d.clave || '').length < 8) fallar(422, 'La contraseña debe tener mínimo 8 caracteres.', { campo: 'clave' });
    if (d.clave !== d.clave2) fallar(422, 'Las contraseñas no coinciden.', { campo: 'clave2' });
    acu.clave_hash = await cifrarClave(String(d.clave));
    return { mensaje: '¡Listo! Ya pueden entrar con la nueva contraseña.' };
  },

  /* ---------- Cuenta de la profe ---------- */
  'GET profe/estado': () => {
    const p = profeActual();
    return { profe: p ? profePublico(p) : null, hay_profes: bd().profes.length > 0 };
  },

  'POST profe/registro': async (d) => {
    const nombre = txt(d.nombre, 120);
    const correo = txt(d.correo, 160).toLowerCase();
    const clave = String(d.clave || '');
    if (nombre.length < 2) fallar(422, 'Escribe tu nombre.', { campo: 'nombre' });
    if (!correoValido(correo)) fallar(422, 'Ese correo no parece válido.', { campo: 'correo' });
    if (clave.length < 8) fallar(422, 'La contraseña debe tener mínimo 8 caracteres.', { campo: 'clave' });
    if (clave !== d.clave2) fallar(422, 'Las contraseñas no coinciden.', { campo: 'clave2' });
    if (bd().profes.some((p) => p.correo === correo)) fallar(409, 'Ya existe una cuenta de profe con ese correo. Inicia sesión.', { campo: 'correo' });
    const p = insertar('profes', { nombre, correo, clave_hash: await cifrarClave(clave), activo: 1, creado_en: ahora(), ultimo_acceso: ahora() });
    fijarSesionProfe(p.id, true);
    return { profe: profePublico(p) };
  },

  'POST profe/entrar': async (d) => {
    const correo = txt(d.correo, 160).toLowerCase();
    const clave = String(d.clave || '');
    if (!correo) fallar(422, 'Escribe tu correo.', { campo: 'correo' });
    if (!clave) fallar(422, 'Escribe tu contraseña.', { campo: 'clave' });
    const p = bd().profes.find((x) => x.correo === correo);
    if (!p || !(await claveCorrecta(clave, p.clave_hash))) fallar(401, 'El correo o la contraseña no coinciden.', { campo: 'clave' });
    if (p.activo === 0) fallar(403, 'Esta cuenta de profe está desactivada.');
    p.ultimo_acceso = ahora();
    fijarSesionProfe(p.id, !!d.recordar);
    return { profe: profePublico(p) };
  },

  'POST profe/olvide': async (d) => {
    const correo = txt(d.correo, 160).toLowerCase();
    const p = bd().profes.find((x) => x.correo === correo);
    if (!p) fallar(422, 'No hay una cuenta de profe con ese correo.', { campo: 'correo' });
    if (String(d.clave || '').length < 8) fallar(422, 'La contraseña debe tener mínimo 8 caracteres.', { campo: 'clave' });
    if (d.clave !== d.clave2) fallar(422, 'Las contraseñas no coinciden.', { campo: 'clave2' });
    p.clave_hash = await cifrarClave(String(d.clave));
    return { mensaje: '¡Listo! Ya puedes entrar con tu nueva contraseña.' };
  },

  'POST profe/salir': () => { borrarSesionProfe(); return {}; },

  /** Copia de la familia (cuentas, progreso y fotos) para llevarla a otro dispositivo. */
  'GET cuenta/exportar': async () => {
    const est = requerirEstudiante();
    const acu = bd().acudientes.find((a) => a.id === est.acudiente_id);
    const ids = new Set(bd().estudiantes.filter((e) => e.acudiente_id === acu.id).map((e) => e.id));
    const copia = { tipo: 'miwalela-copia', version: 1, creada_en: ahora(), acudiente: { ...acu }, tablas: {} };
    TABLAS.filter((t) => t !== 'acudientes').forEach((t) => {
      copia.tablas[t] = bd()[t].filter((f) => (t === 'estudiantes' ? ids.has(f.id) : ids.has(f.estudiante_id))).map((f) => ({ ...f }));
    });
    for (const f of copia.tablas.coleccion) {
      const blob = await leerFoto(f.archivo);
      f.foto = blob ? await aDataUrl(blob) : null;
    }
    const nombres = copia.tablas.estudiantes.map((e) => e.usuario).join('-') || 'familia';
    return { copia, nombre: `miwalela-progreso-${nombres}-${hoy()}.json` };
  },

  'POST cuenta/importar': async (d) => {
    const c = d.copia;
    if (!c || c.tipo !== 'miwalela-copia' || !c.acudiente || !c.tablas || !Array.isArray(c.tablas.estudiantes)) {
      fallar(422, 'Ese archivo no es una copia del campus MiWalela.');
    }
    // Si la familia ya estaba en este dispositivo, se reemplaza por la copia.
    const vieja = bd().acudientes.find((a) => a.correo === String(c.acudiente.correo || '').toLowerCase());
    if (vieja) {
      const viejos = new Set(bd().estudiantes.filter((e) => e.acudiente_id === vieja.id).map((e) => e.id));
      for (const f of bd().coleccion.filter((x) => viejos.has(x.estudiante_id))) await borrarFoto(f.archivo);
      TABLAS.filter((t) => t !== 'acudientes' && t !== 'estudiantes').forEach((t) => quitar(t, (f) => viejos.has(f.estudiante_id)));
      quitar('estudiantes', (e) => viejos.has(e.id));
      quitar('acudientes', (a) => a.id === vieja.id);
    }
    const { id: _a, ...datosAcu } = c.acudiente;
    const acu = insertar('acudientes', { ...datosAcu, correo: String(datosAcu.correo || '').toLowerCase() });
    const mapa = new Map();
    const usuarios = [];
    c.tablas.estudiantes.forEach((e) => {
      let usuario = slugUsuario(e.usuario) || 'minidisenador';
      while (bd().estudiantes.some((x) => x.usuario === usuario)) usuario = usuario.slice(0, 20) + (2 + Math.floor(Math.random() * 998));
      const { id, ...resto } = e;
      const nuevo = insertar('estudiantes', { ...resto, usuario, acudiente_id: acu.id });
      mapa.set(id, nuevo.id);
      usuarios.push(usuario);
    });
    for (const t of TABLAS.filter((x) => x !== 'acudientes' && x !== 'estudiantes')) {
      for (const f of c.tablas[t] || []) {
        if (!mapa.has(f.estudiante_id)) continue;
        const { id, foto, ...resto } = f;
        const fila = { ...resto, estudiante_id: mapa.get(f.estudiante_id) };
        if (t === 'coleccion') {
          if (!foto) continue;
          fila.archivo = await guardarFoto(aleatorio(8), await aBlob(foto));
        }
        insertar(t, fila);
      }
    }
    return { mensaje: '¡Listo! Tu progreso ya está en este dispositivo.', usuarios };
  },
};
