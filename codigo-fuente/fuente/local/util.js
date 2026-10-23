/**
 * Utilidades del motor local: errores, fechas en español, textos con género y claves.
 */

export class ErrorApi extends Error {
  constructor(mensaje, estado, datos) {
    super(mensaje);
    this.estado = estado;
    this.datos = datos || {};
  }
}

/** Corta la acción con un error amigable (equivale al fallar() de PHP). */
export function fallar(estado, mensaje, extra = {}) {
  throw new ErrorApi(mensaje, estado, { ok: false, error: mensaje, ...extra });
}

export const COLORES = ['fucsia', 'coral', 'lila', 'turquesa', 'menta', 'amarillo', 'rosa'];
export const PERSONAJES = ['walela', 'lalo', 'lala'];
export const GENEROS = ['nina', 'nino', 'otro'];
export const GRADOS = ['Transición', '1.º', '2.º', '3.º', '4.º', '5.º', '6.º', '7.º', 'Otro'];
export const PARENTESCOS = ['Mamá', 'Papá', 'Acudiente', 'Otro'];

/* ---------------- Fechas (hora local, formato 'AAAA-MM-DD HH:MM:SS') ---------------- */
const dos = (n) => String(n).padStart(2, '0');

export function formatear(d) {
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())} ${dos(d.getHours())}:${dos(d.getMinutes())}:${dos(d.getSeconds())}`;
}
export const ahora = () => formatear(new Date());
export const hoy = () => ahora().slice(0, 10);

export function aFecha(s) {
  if (!s) return null;
  const [f, h = '00:00:00'] = String(s).replace('T', ' ').trim().split(' ');
  const [y, m, d] = f.split('-').map(Number);
  const [hh = 0, mm = 0, ss = 0] = h.split(':').map(Number);
  const r = new Date(y, (m || 1) - 1, d || 1, hh, mm, ss);
  return isNaN(r.getTime()) ? null : r;
}
export const tiempo = (s) => { const d = aFecha(s); return d ? d.getTime() : NaN; };
export const diaDe = (d) => formatear(d).slice(0, 10);

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function hora(d) {
  const h = d.getHours();
  return `${h % 12 === 0 ? 12 : h % 12}:${dos(d.getMinutes())}${h < 12 ? ' a. m.' : ' p. m.'}`;
}

export const Formato = {
  fechaCorta(s) {
    const d = aFecha(s);
    return d ? `${d.getDate()} de ${MESES[d.getMonth()]}` : '';
  },
  diaHora(s) {
    const d = aFecha(s);
    if (!d) return '';
    const dia = diaDe(d);
    const man = new Date(); man.setDate(man.getDate() + 1);
    let cuando;
    if (dia === hoy()) cuando = 'Hoy';
    else if (dia === diaDe(man)) cuando = 'Mañana';
    else { const n = DIAS[d.getDay()]; cuando = `${n.charAt(0).toUpperCase()}${n.slice(1)} ${d.getDate()} de ${MESES[d.getMonth()]}`; }
    return `${cuando} · ${hora(d)}`;
  },
};

/* ---------------- Textos ---------------- */

/** "Bienvenid{a|o}" → Bienvenida / Bienvenido / Bienvenido(a). */
export function textoGenero(texto, genero) {
  if (texto === null || texto === undefined) return '';
  return String(texto).replace(/\{([^|{}]*)\|([^|{}]*)\}/g, (_, a, o) => (genero === 'nina' ? a : genero === 'nino' ? o : `${o}(${a})`));
}

export function lineas(texto) {
  if (!texto || !String(texto).trim()) return [];
  return String(texto).split(/\r\n|\r|\n/).map((l) => l.trim()).filter(Boolean);
}

export function slugUsuario(texto) {
  const t = String(texto || '').trim().toLowerCase()
    .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i').replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').replace(/ñ/g, 'n');
  return t.replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 24);
}

export function titulo(texto) {
  return String(texto || '').toLowerCase().replace(/(^|\s)(\S)/g, (m, e, l) => e + l.toUpperCase());
}

/** Ordena como "ORDER BY orden, id". */
export function porOrden(a, b) {
  return (a.orden ?? 0) - (b.orden ?? 0) || a.id - b.id;
}

/* ---------------- Claves ---------------- */

export function aleatorio(bytes = 16) {
  const a = new Uint8Array(bytes);
  (window.crypto || window.msCrypto).getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** SHA-256 en JavaScript puro (para cuando el navegador no ofrece crypto.subtle, p. ej. http en una red local). */
function sha256Puro(texto) {
  const K = [];
  const H = [];
  let n = 2;
  for (let c = 0; c < 64; n++) {
    let primo = true;
    for (let i = 2; i * i <= n; i++) if (n % i === 0) { primo = false; break; }
    if (primo) {
      if (c < 8) H[c] = (Math.pow(n, 1 / 2) * 2 ** 32) | 0;
      K[c++] = (Math.pow(n, 1 / 3) * 2 ** 32) | 0;
    }
  }
  const bytes = [...new TextEncoder().encode(texto)];
  const largo = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push(i > 3 ? 0 : (largo >>> (i * 8)) & 0xff);
  const rotar = (x, r) => (x >>> r) | (x << (32 - r));
  for (let j = 0; j < bytes.length; j += 64) {
    const w = [];
    for (let i = 0; i < 16; i++) w[i] = (bytes[j + i * 4] << 24) | (bytes[j + i * 4 + 1] << 16) | (bytes[j + i * 4 + 2] << 8) | bytes[j + i * 4 + 3];
    for (let i = 16; i < 64; i++) {
      const s0 = rotar(w[i - 15], 7) ^ rotar(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotar(w[i - 2], 17) ^ rotar(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rotar(e, 6) ^ rotar(e, 11) ^ rotar(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const t2 = ((rotar(a, 2) ^ rotar(a, 13) ^ rotar(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  return H.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
}

export async function sha256(texto) {
  try {
    if (window.crypto && window.crypto.subtle) {
      const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch { /* se usa la versión en JavaScript */ }
  return sha256Puro(texto);
}

/** Guarda la contraseña como sal + huella (nunca el texto). */
export async function cifrarClave(clave) {
  const sal = aleatorio(12);
  return `${sal}:${await sha256(sal + ':' + clave)}`;
}

export async function claveCorrecta(clave, guardada) {
  const [sal, huella] = String(guardada || '').split(':');
  if (!sal || !huella) return false;
  return (await sha256(sal + ':' + clave)) === huella;
}
