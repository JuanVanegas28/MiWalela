/**
 * Reproductor de video para niños: botones grandes, subtítulos grandes, velocidad lenta,
 * barra con estrellita y reanudación donde quedó. Soporta MP4/WebM y YouTube.
 */
import * as api from '../comun/api.js';
import { h, icono } from '../comun/ui.js';

const fmt = (s) => {
  s = Math.max(0, Math.floor(s || 0));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};

function idYoutube(enlace) {
  const m = String(enlace).match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

let promesaYT = null;
function cargarYoutube() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (!promesaYT) {
    promesaYT = new Promise((resolver, rechazar) => {
      const previo = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (previo) previo(); resolver(window.YT); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.onerror = () => rechazar(new Error('No se pudo cargar YouTube'));
      document.head.appendChild(s);
    });
  }
  return promesaYT;
}

/**
 * @param {HTMLElement} el contenedor .reproductor
 * @param {object} video {fuente, url, poster, subtitulos, duracion}
 * @param {object} op {etiqueta, inicio, alProgreso(seg, dur), alTerminar()}
 * @returns {Function} limpiar
 */
export function crearReproductor(el, video, op = {}) {
  if (!video || !video.url) {
    el.innerHTML = `<div class="video-vacio"><img src="${h(api.url('assets/img/personajes/walela-piensa.webp'))}" alt=""><p>Tu profe pronto subirá este video.</p></div>`;
    return () => {};
  }
  if (video.fuente === 'youtube') return youtube(el, video, op);
  return nativo(el, video, op);
}

function nativo(el, video, op) {
  const velocidades = [1, 0.75, 1.25];
  let iVel = 0;
  let ultimoEnvio = 0;
  let terminado = false;
  let temporizador = null;
  el.innerHTML = `
    <video playsinline preload="metadata" ${video.poster ? `poster="${h(api.url(video.poster))}"` : ''}>
      <source src="${h(api.url(video.url))}">
      ${video.subtitulos ? `<track kind="subtitles" srclang="es" label="Español" src="${h(api.url(video.subtitulos))}" default>` : ''}
    </video>
    <span class="titulo-video">${icono('play', 14, 'style="color:#FBAFBF"')}<span>${h(op.etiqueta || '')}</span></span>
    <button type="button" class="play-grande" aria-label="Reproducir video">${icono('play', 46, 'style="margin-left:6px"')}</button>
    <div class="subs" hidden></div>
    <div class="controles">
      <button type="button" data-play aria-label="Reproducir">${icono('play', 26)}</button>
      <span class="tiempo" data-tiempo>0:00 / ${fmt(video.duracion)}</span>
      <div class="barra-video" role="slider" tabindex="0" aria-label="Progreso del video" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-barra>
        <div class="pista"><div class="relleno" data-relleno style="width:0%"></div></div>
        <svg class="estrella" data-estrella viewBox="0 0 24 24" aria-hidden="true" style="left:0%"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" fill="#FDCC82" stroke="#fff" stroke-width="1.5"/></svg>
      </div>
      <button type="button" class="vel" data-vel aria-label="Velocidad: normal">1x</button>
      ${video.subtitulos ? `<button type="button" data-cc aria-pressed="true" aria-label="Subtítulos">${icono('subtitulos', 24)}</button>` : ''}
      <span class="volumen"><button type="button" data-mute aria-label="Silenciar">${icono('volumen', 24)}</button><input type="range" min="0" max="1" step="0.05" value="1" aria-label="Volumen" data-vol></span>
      <button type="button" data-pantalla aria-label="Pantalla completa">${icono('pantalla', 22)}</button>
    </div>`;
  const v = el.querySelector('video');
  const q = (s) => el.querySelector(s);
  const subs = q('.subs');
  const barra = q('[data-barra]');
  let subsActivos = !!video.subtitulos;

  const duracion = () => (isFinite(v.duration) && v.duration > 0 ? v.duration : video.duracion || 0);
  const pintar = () => {
    const d = duracion();
    const pct = d ? (v.currentTime / d) * 100 : 0;
    q('[data-relleno]').style.width = pct + '%';
    q('[data-estrella]').style.left = pct + '%';
    q('[data-tiempo]').textContent = `${fmt(v.currentTime)} / ${fmt(d)}`;
    barra.setAttribute('aria-valuenow', String(Math.round(pct)));
    barra.setAttribute('aria-valuetext', `${fmt(v.currentTime)} de ${fmt(d)}`);
  };
  const enviar = (forzar = false) => {
    const ahora = Date.now();
    if (!op.alProgreso || (!forzar && ahora - ultimoEnvio < 10000)) return;
    ultimoEnvio = ahora;
    op.alProgreso(Math.floor(v.currentTime), Math.round(duracion()));
  };
  const mostrarControles = () => {
    el.classList.remove('oculto-controles');
    clearTimeout(temporizador);
    if (!v.paused) temporizador = setTimeout(() => el.classList.add('oculto-controles'), 2600);
  };
  const alternar = () => (v.paused ? v.play().catch(() => {}) : v.pause());

  v.addEventListener('loadedmetadata', () => {
    if (op.inicio && op.inicio > 2 && op.inicio < duracion() - 5) v.currentTime = op.inicio;
    pintar();
    if (v.textTracks[0]) v.textTracks[0].mode = 'hidden';
  });
  v.addEventListener('timeupdate', () => { pintar(); enviar(); });
  v.addEventListener('play', () => {
    q('.play-grande').hidden = true;
    q('[data-play]').innerHTML = icono('pausa', 26);
    q('[data-play]').setAttribute('aria-label', 'Pausar');
    mostrarControles();
  });
  v.addEventListener('pause', () => {
    q('.play-grande').hidden = false;
    q('[data-play]').innerHTML = icono('play', 26);
    q('[data-play]').setAttribute('aria-label', 'Reproducir');
    el.classList.remove('oculto-controles');
    enviar(true);
  });
  v.addEventListener('ended', () => {
    enviar(true);
    if (!terminado) { terminado = true; if (op.alTerminar) op.alTerminar(); }
  });
  v.addEventListener('click', alternar);
  if (v.textTracks && v.textTracks[0]) {
    const pista = v.textTracks[0];
    pista.mode = 'hidden';
    pista.addEventListener('cuechange', () => {
      const cue = pista.activeCues && pista.activeCues[0];
      subs.textContent = cue ? cue.text.replace(/<[^>]+>/g, '') : '';
      subs.hidden = !subsActivos || !cue;
    });
  }
  q('.play-grande').onclick = alternar;
  q('[data-play]').onclick = alternar;
  q('[data-vel]').onclick = () => {
    iVel = (iVel + 1) % velocidades.length;
    v.playbackRate = velocidades[iVel];
    q('[data-vel]').textContent = velocidades[iVel] + 'x';
    q('[data-vel]').setAttribute('aria-label', 'Velocidad: ' + (velocidades[iVel] < 1 ? 'más lento' : velocidades[iVel] > 1 ? 'más rápido' : 'normal'));
  };
  const cc = q('[data-cc]');
  if (cc) cc.onclick = () => { subsActivos = !subsActivos; cc.setAttribute('aria-pressed', String(subsActivos)); if (!subsActivos) subs.hidden = true; };
  q('[data-mute]').onclick = () => { v.muted = !v.muted; q('[data-mute]').innerHTML = icono(v.muted ? 'silencio' : 'volumen', 24); };
  q('[data-vol]').oninput = (e) => { v.volume = Number(e.target.value); v.muted = v.volume === 0; };
  q('[data-pantalla]').onclick = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
  };
  const buscarEn = (clientX) => {
    const r = barra.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    if (duracion()) v.currentTime = pct * duracion();
    pintar();
  };
  let arrastrando = false;
  barra.addEventListener('pointerdown', (e) => { arrastrando = true; barra.setPointerCapture(e.pointerId); buscarEn(e.clientX); });
  barra.addEventListener('pointermove', (e) => { if (arrastrando) buscarEn(e.clientX); });
  barra.addEventListener('pointerup', () => { arrastrando = false; });
  barra.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { v.currentTime = Math.min(duracion(), v.currentTime + 5); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { v.currentTime = Math.max(0, v.currentTime - 5); e.preventDefault(); }
  });
  el.addEventListener('mousemove', mostrarControles);
  el.addEventListener('touchstart', mostrarControles, { passive: true });
  el.tabIndex = -1;
  el.addEventListener('keydown', (e) => {
    if (e.target.closest('input')) return;
    if (e.key === ' ' || e.key === 'k') { if (e.target === el || e.target === v) { e.preventDefault(); alternar(); } }
  });
  return () => {
    clearTimeout(temporizador);
    try { if (!v.paused) enviar(true); v.pause(); v.removeAttribute('src'); v.load(); } catch { /* nada */ }
  };
}

function youtube(el, video, op) {
  const id = idYoutube(video.url);
  if (!id) {
    el.innerHTML = '<div class="video-vacio"><p>El enlace de este video no es válido.</p></div>';
    return () => {};
  }
  el.innerHTML = `<div class="yt"></div><span class="titulo-video">${icono('play', 14, 'style="color:#FBAFBF"')}<span>${h(op.etiqueta || '')}</span></span>`;
  let jugador = null;
  let intervalo = null;
  let terminado = false;
  let vivo = true;
  cargarYoutube().then((YT) => {
    if (!vivo) return;
    jugador = new YT.Player(el.querySelector('.yt'), {
      host: 'https://www.youtube-nocookie.com',
      videoId: id,
      playerVars: { rel: 0, modestbranding: 1, playsinline: 1, cc_lang_pref: 'es', hl: 'es', start: op.inicio > 2 ? Math.floor(op.inicio) : 0 },
      events: {
        onStateChange: (ev) => {
          const titulo = el.querySelector('.titulo-video');
          if (ev.data === YT.PlayerState.PLAYING) {
            if (titulo) titulo.style.opacity = '0';
            clearInterval(intervalo);
            intervalo = setInterval(() => {
              if (op.alProgreso && jugador.getCurrentTime) op.alProgreso(Math.floor(jugador.getCurrentTime()), Math.round(jugador.getDuration()));
            }, 10000);
          } else {
            clearInterval(intervalo);
            if (op.alProgreso && jugador.getCurrentTime && ev.data === YT.PlayerState.PAUSED) op.alProgreso(Math.floor(jugador.getCurrentTime()), Math.round(jugador.getDuration()));
          }
          if (ev.data === YT.PlayerState.ENDED && !terminado) {
            terminado = true;
            if (op.alProgreso) op.alProgreso(Math.round(jugador.getDuration()), Math.round(jugador.getDuration()));
            if (op.alTerminar) op.alTerminar();
          }
        },
      },
    });
  }).catch(() => {
    el.innerHTML = `<div class="video-vacio"><p>No pudimos cargar YouTube.</p><a class="btn btn-borde" href="${h(video.url)}" target="_blank" rel="noopener">Ver en YouTube</a></div>`;
  });
  return () => { vivo = false; clearInterval(intervalo); try { if (jugador && jugador.destroy) jugador.destroy(); } catch { /* nada */ } };
}
