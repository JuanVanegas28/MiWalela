/**
 * Subir la foto de una creación: elegir, ver, ponerle nombre y subir con barra de progreso.
 */
import * as api from '../comun/api.js';
import { h, icono, ventana, avisoError, reducirImagen } from '../comun/ui.js';
import { compartirFoto } from './compartir.js';

export function subirFoto({ ruta, datos = {}, titulo = '', encabezado = 'Sube la foto de tu creación' }) {
  return new Promise((resolver) => {
    const entrada = document.createElement('input');
    entrada.type = 'file';
    entrada.accept = 'image/*';
    entrada.onchange = async () => {
      const original = entrada.files && entrada.files[0];
      if (!original) return resolver(null);
      if (!/^image\//.test(original.type)) { avisoError({ message: 'Ese archivo no es una foto.' }); return resolver(null); }
      const archivo = await reducirImagen(original);
      const vista = URL.createObjectURL(archivo);
      let resultado = null;
      const { caja, cerrar } = ventana(`
        <h2>${h(encabezado)}</h2>
        <img src="${vista}" alt="Vista previa" style="width:100%;max-height:320px;object-fit:contain;border-radius:20px;background:var(--crema);margin:10px 0 16px">
        <div class="campo"><label for="titulo-foto">¿Cómo se llama tu creación?</label>
          <input class="entrada" id="titulo-foto" maxlength="120" value="${h(titulo)}" placeholder="Ej.: Mi falda de corazones"></div>
        <div class="cinta" data-barra hidden style="margin-top:16px"><span></span></div>
        <div class="acciones" style="justify-content:flex-end;margin-top:18px">
          <button type="button" class="btn btn-borde" data-cancelar>Cancelar</button>
          <button type="button" class="btn" data-subir>${icono('foto', 20)} Subir foto</button></div>`,
        { alCerrar: () => { URL.revokeObjectURL(vista); resolver(resultado); } });
      caja.querySelector('[data-cancelar]').onclick = cerrar;
      const boton = caja.querySelector('[data-subir]');
      boton.onclick = async () => {
        if (boton.classList.contains('cargando')) return;
        boton.classList.add('cargando');
        const barra = caja.querySelector('[data-barra]');
        barra.hidden = false;
        const fd = new FormData();
        Object.entries(datos).forEach(([k, v]) => fd.append(k, v));
        fd.append('titulo', caja.querySelector('#titulo-foto').value.trim());
        fd.append('imagen', archivo, archivo.name || 'foto.jpg');
        try {
          resultado = await api.subir(ruta, fd, (p) => { barra.firstElementChild.style.width = p + '%'; });
          // Paso 2: la foto quedó en su colección; ahora puede mostrársela a su profe.
          const nombre = caja.querySelector('#titulo-foto').value.trim() || titulo || 'Mi creación';
          caja.querySelectorAll('.campo, [data-barra], .acciones').forEach((el) => el.remove());
          caja.querySelector('h2').textContent = '¡Quedó guardada en tu colección!';
          caja.insertAdjacentHTML('beforeend', `
            <p style="font-size:17px;font-weight:700;color:var(--tinta-2);text-align:center">¿Se la mostramos a tu profe? ¡Le encantará ver lo que creaste!</p>
            <div class="acciones" style="justify-content:center;margin-top:16px">
              <button type="button" class="btn btn-borde" data-luego>Ahora no</button>
              <button type="button" class="btn btn-turq" data-enviar>${icono('chat', 20)} Enviar a mi profe</button></div>`);
          caja.querySelector('[data-luego]').onclick = cerrar;
          caja.querySelector('[data-enviar]').onclick = async () => {
            await compartirFoto({ blob: archivo, titulo: nombre }).catch(() => {});
            cerrar();
          };
        } catch (e) {
          avisoError(e);
          boton.classList.remove('cargando');
          barra.hidden = true;
        }
      };
    };
    entrada.click();
  });
}
