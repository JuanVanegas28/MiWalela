/**
 * Constructor de formularios del panel: textos, números, fechas, listas, interruptores,
 * colores y subida de imágenes, videos, PDF y subtítulos con barra de progreso.
 */
import * as api from '../comun/api.js';
import { h, icono, COLORES, avisoError, aviso } from '../comun/ui.js';

/** Texto corto para mostrar una ruta (las imágenes van dentro del contenido como data:). */
function nombreRuta(x) {
  if (!x) return 'Sin archivo';
  if (/^data:image/.test(x)) return 'Imagen lista ✓';
  if (/^data:text\/vtt/.test(x)) return 'Subtítulos listos ✓';
  return x;
}

let contador = 0;

function valorInicial(c, v) {
  let x = v[c.nombre];
  if (x === undefined || x === null) x = c.defecto !== undefined ? c.defecto : '';
  if (c.tipo === 'fecha_hora' && x) x = String(x).replace(' ', 'T').slice(0, 16);
  return x;
}

function vistaArchivo(c, x) {
  if (!x) return `<span>${icono(c.tipo === 'imagen' ? 'foto' : c.subtipo === 'video' ? 'camara' : 'libro', 26)}</span>`;
  if (c.tipo === 'imagen') return `<img src="${h(api.url(x))}" alt="">`;
  return `<span>${icono(c.subtipo === 'video' ? 'camara' : c.subtipo === 'pdf' ? 'libro' : 'subtitulos', 26)}</span>`;
}

function htmlCampo(c, v) {
  const id = 'f' + ++contador + '-' + c.nombre;
  const x = valorInicial(c, v);
  const req = c.requerido ? 'required' : '';
  const ayuda = c.ayuda ? `<span class="ayuda">${h(c.ayuda)}</span>` : '';
  const etiqueta = `<label for="${id}">${h(c.etiqueta)}${c.requerido ? ' *' : ''}</label>`;
  let control = '';
  switch (c.tipo) {
    case 'largo':
    case 'lineas':
      control = `${etiqueta}<textarea class="entrada" id="${id}" name="${c.nombre}" rows="${c.filas || 3}" ${req} maxlength="${c.max || 4000}" placeholder="${h(c.placeholder || '')}">${h(x)}</textarea>`;
      break;
    case 'numero':
      control = `${etiqueta}<input class="entrada" id="${id}" name="${c.nombre}" type="number" inputmode="numeric" ${c.min !== undefined ? `min="${c.min}"` : ''} ${c.maximo !== undefined ? `max="${c.maximo}"` : ''} value="${h(x)}" ${req} placeholder="${h(c.placeholder || '')}">`;
      break;
    case 'fecha_hora':
      control = `${etiqueta}<input class="entrada" id="${id}" name="${c.nombre}" type="datetime-local" value="${h(x)}" ${req}>`;
      break;
    case 'fecha':
      control = `${etiqueta}<input class="entrada" id="${id}" name="${c.nombre}" type="date" value="${h(x)}" ${req}>`;
      break;
    case 'select':
      control = `${etiqueta}<select class="entrada" id="${id}" name="${c.nombre}" ${req}>${(c.opciones || []).map(([val, txt]) => `<option value="${h(val)}" ${String(val) === String(x ?? '') ? 'selected' : ''}>${h(txt)}</option>`).join('')}</select>`;
      break;
    case 'bool':
      control = `<label class="interruptor"><input type="checkbox" name="${c.nombre}" ${x === true || x === 1 || x === '1' ? 'checked' : ''}> ${h(c.etiqueta)}</label>`;
      break;
    case 'color':
      control = `<span class="rotulo">${h(c.etiqueta)}</span><div class="paleta" role="radiogroup" data-paleta="${c.nombre}">${Object.entries(COLORES).map(([k, col]) => `<button type="button" role="radio" aria-label="${col.nombre}" aria-checked="${k === x}" data-valor="${k}" style="background:${col.fuerte}"></button>`).join('')}</div><input type="hidden" name="${c.nombre}" value="${h(x)}">`;
      break;
    case 'imagen':
    case 'archivo':
      control = `<span class="rotulo">${h(c.etiqueta)}${c.requerido ? ' *' : ''}</span>
        <div class="subida" data-subida="${c.nombre}">
          <span class="vista">${vistaArchivo(c, x)}</span>
          <div class="info"><span data-info>${h(nombreRuta(x))}</span><div class="cinta" hidden><span></span></div></div>
          <label class="btn-mini primario" style="position:relative;overflow:hidden">${icono('descargar', 16, 'style="transform:rotate(180deg)"')} Subir
            <input type="file" accept="${h(c.aceptar || (c.tipo === 'imagen' ? 'image/*' : ''))}" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>
          <button type="button" class="btn-mini peligro" data-quitar ${x ? '' : 'hidden'}>Quitar</button>
        </div>
        ${c.enlace ? `<input class="entrada" data-enlace placeholder="${h(c.enlace)}" value="${/^https?:/i.test(x) ? h(x) : ''}" style="margin-top:6px">` : ''}
        <input type="hidden" name="${c.nombre}" value="${h(x)}">`;
      break;
    default:
      control = `${etiqueta}<input class="entrada" id="${id}" name="${c.nombre}" type="${c.tipo === 'url' ? 'url' : c.tipo === 'correo' ? 'email' : 'text'}" value="${h(x)}" ${req} maxlength="${c.max || 255}" placeholder="${h(c.placeholder || '')}">`;
  }
  return `<div class="campo" data-campo="${c.nombre}">${control}${ayuda}</div>`;
}

/** HTML del formulario. Los campos con `fila` iguales se ponen lado a lado. */
export function formulario(campos, valores = {}) {
  const partes = [];
  for (let i = 0; i < campos.length; i++) {
    const c = campos[i];
    if (c.fila && campos[i + 1] && campos[i + 1].fila === c.fila) {
      partes.push(`<div class="fila-campos">${htmlCampo(c, valores)}${htmlCampo(campos[i + 1], valores)}</div>`);
      i++;
    } else {
      partes.push(htmlCampo(c, valores));
    }
  }
  return partes.join('');
}

function leerDuracion(ruta) {
  return new Promise((resolver) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => resolver(isFinite(v.duration) ? Math.round(v.duration) : null);
    v.onerror = () => resolver(null);
    v.src = api.url(ruta);
    setTimeout(() => resolver(null), 8000);
  });
}

/** Activa subidas, paletas y campos condicionales. Devuelve funciones para leer los datos. */
export function activarFormulario(raiz, campos, { alCambiar } = {}) {
  const valorDe = (nombre) => {
    const el = raiz.querySelector(`[name="${nombre}"]`);
    if (!el) return undefined;
    return el.type === 'checkbox' ? el.checked : el.value;
  };
  const leer = () => {
    const datos = {};
    campos.forEach((c) => {
      const val = valorDe(c.nombre);
      if (val !== undefined) datos[c.nombre] = typeof val === 'string' ? val.trim() : val;
    });
    return datos;
  };
  const condiciones = () => {
    const d = leer();
    campos.forEach((c) => {
      if (!c.si) return;
      const caja = raiz.querySelector(`[data-campo="${c.nombre}"]`);
      if (caja) caja.hidden = !c.si(d);
    });
  };
  raiz.querySelectorAll('[data-paleta]').forEach((p) => {
    p.querySelectorAll('button').forEach((b) => {
      b.onclick = () => {
        p.querySelectorAll('button').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
        raiz.querySelector(`[name="${p.dataset.paleta}"]`).value = b.dataset.valor;
        condiciones();
      };
    });
  });
  raiz.querySelectorAll('[data-subida]').forEach((caja) => {
    const nombre = caja.dataset.subida;
    const c = campos.find((x) => x.nombre === nombre);
    const oculto = raiz.querySelector(`input[type=hidden][name="${nombre}"]`);
    const info = caja.querySelector('[data-info]');
    const barra = caja.querySelector('.cinta');
    const quitar = caja.querySelector('[data-quitar]');
    const enlace = caja.parentElement.querySelector('[data-enlace]');
    const fijar = async (ruta, duracion) => {
      oculto.value = ruta || '';
      info.textContent = nombreRuta(ruta);
      caja.querySelector('.vista').innerHTML = vistaArchivo(c, ruta);
      quitar.hidden = !ruta;
      if (enlace && !/^https?:/i.test(ruta || '')) enlace.value = '';
      if (c.duracionEn && ruta && !/youtu/i.test(ruta)) {
        const d = duracion || (duracion === undefined ? await leerDuracion(ruta) : null);
        const campoDur = raiz.querySelector(`[name="${c.duracionEn}"]`);
        if (d && campoDur) campoDur.value = d;
      }
      condiciones();
      if (alCambiar) alCambiar(leer());
    };
    caja.querySelector('input[type=file]').onchange = async (ev) => {
      const archivo = ev.target.files[0];
      ev.target.value = '';
      if (!archivo) return;
      const fd = new FormData();
      fd.append('tipo', c.tipo === 'imagen' ? 'imagen' : c.subtipo);
      if (c.carpeta) fd.append('carpeta', c.carpeta);
      fd.append('archivo', archivo, archivo.name);
      barra.hidden = false;
      info.textContent = 'Subiendo ' + archivo.name + '…';
      try {
        const r = await api.subir('admin/subir', fd, (p) => { barra.firstElementChild.style.width = p + '%'; info.textContent = `Subiendo ${archivo.name}… ${p}%`; });
        await fijar(r.ruta, r.duracion === undefined ? undefined : r.duracion || null);
        if (r.copiar) aviso(`Recuerda copiar «${r.copiar}» en la carpeta assets/media del campus.`, 'bien');
      } catch (e) {
        avisoError(e);
        info.textContent = nombreRuta(oculto.value);
      } finally { barra.hidden = true; barra.firstElementChild.style.width = '0'; }
    };
    quitar.onclick = () => fijar('');
    if (enlace) {
      // El enlace pegado cuenta de inmediato (aunque guarden sin salir del campo).
      enlace.addEventListener('input', () => { const v = enlace.value.trim(); if (/^https?:\/\/\S+$/i.test(v)) oculto.value = v; });
      enlace.addEventListener('change', () => fijar(enlace.value.trim()));
    }
  });
  raiz.addEventListener('input', condiciones);
  raiz.addEventListener('change', condiciones);
  condiciones();
  return { leer };
}
