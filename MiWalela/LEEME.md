# MiWalela · Campus MiniDiseñadores — versión sin servidor

Es el mismo campus de la versión con base de datos: mismo diseño, cursos, sesiones, videos, guías paso a paso, retos, estrellas, niveles, insignias, colección de fotos y Panel de la profe. La diferencia es que **no necesita PHP, MySQL ni un hosting pagado**: son archivos HTML, CSS y JavaScript que se pueden publicar gratis o abrir con doble clic.

```
miwalela-sin-servidor/
├── campus/          ← ESTA es la carpeta que se publica en internet
│   ├── index.html        Campus de los niños
│   ├── admin/            Panel de la profe
│   ├── datos/contenido.js   Todo el contenido (lo genera el panel con «Publicar»)
│   └── assets/           Estilos, programa, imágenes, videos y PDF del Módulo 1
├── codigo-fuente/   ← Solo para programadores (no se publica)
└── LEEME.md
```

---

## Qué cambia frente a la versión con base de datos

| | Con servidor (PHP + MySQL) | Sin servidor (esta versión) |
|---|---|---|
| Dónde se guarda el progreso de cada niño | En la base de datos | En el navegador del dispositivo donde estudia |
| Usar otro celular, tablet o computador | Entrar con el usuario | Llevar una **copia** (Mis logros → «Guardar una copia» → en el otro dispositivo «Traer mi progreso») |
| Preguntas a la profe | Llegan al panel | Se envían por **WhatsApp** |
| Fotos de las creaciones | La profe las revisa en el panel | El niño se la **envía por WhatsApp** (botón «Enviar a mi profe») |
| Reservar cupo en una clase | Cupos automáticos | Se pide por WhatsApp y la profe confirma |
| Ver el avance de un niño | Panel → Estudiantes | La familia envía su **copia de progreso** y la profe la abre en Panel → «Progreso de un niño» |
| Olvidé mi contraseña | Enlace por correo | Con el correo **y** el celular que registró el adulto |
| Cambiar contenido | Se guarda al instante | Se edita en el panel, se toca «Publicar» y se sube la carpeta otra vez |
| Costo | Hosting con PHP y MySQL | **Gratis** |

---

## 1. Probarlo en tu computador

No hay que instalar nada:

- **Campus de los niños:** doble clic en `campus/index.html`
- **Panel de la profe:** doble clic en `campus/admin/index.html`

Usa **Chrome o Edge** (también funciona en Firefox y Safari). Ten en cuenta:

- Los videos de **YouTube** solo se ven cuando el campus está publicado en internet; con doble clic se ven los MP4 de la carpeta.
- Las letras del diseño se descargan de Google Fonts: sin internet se ven con una letra parecida.

## 2. Publicarlo gratis en internet

### Opción recomendada: Cloudflare Pages

Es gratis y no tiene límite de visitas para sitios como este.

1. Crea una cuenta gratis en <https://dash.cloudflare.com/sign-up>.
2. En el panel de Cloudflare entra a **Workers & Pages** → **Crear** → **Pages** → **Subir archivos** (*Upload assets*).
3. Ponle un nombre al proyecto, por ejemplo `miwalela` (la dirección será `miwalela.pages.dev`; si está ocupado, prueba con otro).
4. Arrastra la carpeta **campus** completa y toca **Desplegar** (*Deploy*). En unos segundos el campus queda en línea.
5. Comparte la dirección con las familias por WhatsApp.

Límites del plan gratis:

- hasta 20.000 archivos por sitio;
- **25 MB por archivo**, así que los videos largos van mejor en YouTube.

### Otras opciones gratis

- **Netlify Drop** (<https://app.netlify.com/drop>):
  - Es la más rápida: arrastras la carpeta `campus` y listo. Sirve muy bien para mostrársela a la clienta.
  - Sin cuenta, el sitio queda protegido con una contraseña temporal hasta que lo reclames creando una cuenta.
  - El plan gratis trae 300 créditos al mes. Cada GB de tráfico gasta 20 y cada publicación gasta 15, así que alcanza para unos 15 GB al mes.
- **GitHub Pages:**
  - Gratis con un repositorio público.
  - Máximo 1 GB por sitio y unos 100 GB de tráfico al mes.

> Cada dirección guarda sus propios datos: si más adelante cambias de dirección (por ejemplo, a un dominio propio), las familias deben pasar su progreso con «Guardar una copia» y «Traer mi progreso».

## 3. Cómo la profe cambia el contenido

1. En **su computador**, abre `campus/admin/index.html` (mejor en Chrome o Edge).
2. Edita cursos, sesiones, videos, guías, clases, reto de la semana, insignias, niveles y ajustes. Todo se guarda solo en ese navegador.
3. Toca **Ver en el campus** para probarlo como lo verán los niños. Abajo aparece la franja «Vista previa»; tócala para salir.
4. Toca **Publicar**:
   - En **Chrome o Edge** pregunta dónde guardar: elige la carpeta `campus/datos` y **reemplaza** `contenido.js`. La siguiente vez recuerda la carpeta.
   - En otros navegadores el archivo queda en **Descargas**: muévelo a `campus/datos` y reemplaza el anterior.
5. Si agregó un **MP4 o PDF** desde su computador, cópialo en `campus/assets/media`. El panel le dice exactamente cuáles.
6. **Sube otra vez la carpeta `campus`**:
   - En Cloudflare: entra al proyecto → *Crear nueva implementación* → arrastra la carpeta.
   - En Netlify: entra al proyecto → *Deploys* → arrastra la carpeta.

Importante:

- Edita siempre en el **mismo computador y navegador**, porque el borrador vive allí.
- Para cambiar de computador, lleva la carpeta `campus` actualizada. El panel toma el contenido de `datos/contenido.js`; en *Ajustes* también puedes abrir un `contenido.js` o descargar una copia del borrador.

## 4. Videos, imágenes y PDF

- **Videos:**
  - Lo recomendado es subirlos a YouTube como **«No listado»** y pegar el enlace: no gastan espacio y se ven bien en celulares.
  - Si usas un MP4 propio, que pese menos de 25 MB (720p alcanza) y cópialo en `assets/media`.
  - Los dos videos del Módulo 1 que vienen son **de muestra (20 segundos)**: reemplázalos.
- **Imágenes:** el panel las achica y las guarda dentro de `contenido.js`. No hay que copiarlas a ninguna carpeta.
- **PDF de las guías:**
  - Cópialos en `assets/media`, o pega un enlace de Google Drive.
  - Los del Módulo 1 ya vienen incluidos.
- **Subtítulos (.vtt o .srt):** se guardan dentro de `contenido.js`.

## 5. Lo que deben saber las familias

- **Registro:** se registran y entran igual que en la versión con servidor (adulto + perfil de cada niño). Varios hermanos comparten la contraseña del adulto.
- **El progreso queda en el dispositivo y navegador donde estudian:**
  - Si borran los datos del navegador o usan modo incógnito, se pierde.
  - Por eso conviene tocar de vez en cuando **Mis logros → Guardar una copia**.
- **Para seguir en otro dispositivo:** «Guardar una copia» en el primero y, en el nuevo, «¿Te registraste en otro dispositivo? Traer mi progreso».
- **Contacto con la profe:** las preguntas, las fotos y la reserva de cupos abren **WhatsApp** con el mensaje listo. El número se cambia en Panel → **Ajustes** (viene el del PDF: 318 885 0173).
- **Olvidé mi contraseña:** el adulto la cambia con su correo y su celular.

## 6. Privacidad y seguridad

- **No hay una base de datos central que se pueda filtrar.** Cada familia guarda sus datos en su propio dispositivo, y solo salen de allí cuando ella misma envía algo por WhatsApp.
- **Contraseñas:** se guardan cifradas (con sal) en el navegador.
  - Sirven para separar perfiles en un dispositivo compartido.
  - No son tan fuertes como las de un servidor: alguien con acceso al dispositivo y conocimientos técnicos podría leer el progreso guardado.
- **El panel publicado no cambia nada:** si alguien abre `/admin` en internet, solo edita un borrador en *su* navegador. Lo que ven las familias solo cambia cuando se sube un nuevo `contenido.js`. Si prefieres, no subas la carpeta `admin`.
- **Autorización de datos:** el registro sigue pidiendo la autorización del tratamiento de datos (Ley 1581 de 2012).

## 7. Contenido de ejemplo

- **Contenido real del PDF:** el **Módulo 1** (sesiones, retos, guías, PDF, insignias y niveles).
- **Ejemplos para que el campus se vea como el mockup:**
  - el Módulo 2 y el Módulo 3 («muy pronto»);
  - el taller «¡Le doy vida a mi falda!»;
  - las dos clases en vivo;
  - el reto de la semana.

  Edítalos o bórralos desde el panel.

## 8. Para programadores

- `codigo-fuente/fuente/` tiene el código en módulos:
  - `campus/` y `admin/`: las pantallas.
  - `local/`: el motor que reemplaza a PHP + MySQL.
- `local/` atiende **las mismas rutas** que la API en PHP (`inicio`, `sesion`, `reto/completar`…). Por eso pasar después a la versión con servidor no exige rehacer las pantallas.
- Para regenerar `campus/assets/js/campus.js` y `panel.js`:
  ```
  cd codigo-fuente
  npm install
  npm run construir          (o  npm run construir:legible  para no minificar)
  ```
- Dónde se guardan los datos en el navegador:
  - progreso: `localStorage["miwalela:campus:v1"]`;
  - fotos: IndexedDB `miwalela-fotos`;
  - borrador del panel: IndexedDB `miwalela-panel`.

## 9. Solución de problemas

| Problema | Solución |
|---|---|
| «No encontramos esa cuenta en este dispositivo» | La familia se registró en otro dispositivo o navegador: que use «Traer mi progreso» con su copia. |
| Los cambios del panel no aparecen en el campus publicado | Falta reemplazar `campus/datos/contenido.js` por el que guardó «Publicar» y volver a subir la carpeta. |
| Un video MP4 no se ve | Revisa que el archivo esté en `campus/assets/media` con el mismo nombre, y que pese menos de 25 MB. O usa YouTube. |
| Un video de YouTube no se ve con doble clic | Es normal: YouTube solo funciona con el campus publicado en internet. |
| «No hay espacio para guardar» | El navegador se quedó sin espacio: borra fotos viejas de la colección (después de guardar una copia). |
| El campus se ve sin las letras del diseño | No hay internet para cargar Google Fonts; el campus funciona igual. |
