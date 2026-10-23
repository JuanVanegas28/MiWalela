# MiWalela · Campus MiniDiseñadores

Campus web para las niñas y niños de MiWalela (desde los 6 años). Incluye:

- cursos, sesiones y videos;
- guías paso a paso con PDF;
- retos, estrellas, niveles e insignias;
- colección de fotos de sus creaciones;
- clases en vivo;
- el **Panel de la profe** para manejar todo el contenido.

Es un **sitio estático**: HTML, CSS y JavaScript, sin base de datos ni servidor. Está listo para subirlo a GitHub y desplegarlo en **Vercel**.

| | Dirección |
|---|---|
| Campus de los niños | `https://TU-PROYECTO.vercel.app/` |
| Panel de la profe | `https://TU-PROYECTO.vercel.app/admin/` |

---

## Estructura del repositorio

```
├── campus/                 ← lo que se publica (Vercel sirve esta carpeta)
│   ├── index.html              Campus de los niños
│   ├── admin/index.html        Panel de la profe
│   ├── datos/contenido.js      Todo el contenido: cursos, retos, guías, clases… (lo genera el panel)
│   └── assets/                 css, js, imágenes, videos y PDF del Módulo 1
├── codigo-fuente/          ← código fuente (módulos JavaScript) y script de construcción
├── package.json            ← «npm run build» genera campus/assets/js/campus.js y panel.js
├── vercel.json             ← configuración de Vercel (no hay que tocar nada en el panel de Vercel)
└── README.md
```

---

## 1. Subir el proyecto a GitHub

### Opción A: desde el navegador (sin instalar nada)

1. En GitHub toca **New repository**.
   - Nombre: por ejemplo `miwalela-campus`.
   - Puede ser **privado**.
   - **No** marques «Add a README».
   - Toca **Create repository**.
2. En la página del repositorio vacío toca **uploading an existing file**.
3. Descomprime el ZIP y abre la carpeta `miwalela-campus`.
4. Selecciona **todo lo que hay adentro** (`campus`, `codigo-fuente`, `package.json`, `vercel.json`, `README.md`) y arrástralo a GitHub.
5. Toca **Commit changes**.

> ⚠️ Arrastra el **contenido** de la carpeta, no la carpeta misma: `vercel.json` debe quedar en la raíz del repositorio.
>
> Son 78 archivos; GitHub permite 100 por subida y 25 MB por archivo.
>
> Si `.gitignore` no aparece porque está oculto en tu computador, no importa.

### Opción B: con git

```bash
cd miwalela-campus
git init
git add .
git commit -m "Campus MiWalela"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/miwalela-campus.git
git push -u origin main
```

## 2. Desplegar en Vercel

1. Entra a <https://vercel.com> y crea tu cuenta **con GitHub**.
2. Toca **Add New… → Project** e **importa** el repositorio `miwalela-campus`.
3. No cambies nada: Vercel lee `vercel.json`, que ya define:
   - *Framework*: Other
   - *Build*: `npm run build`
   - *Output*: `campus`
4. Toca **Deploy**. En menos de un minuto tendrás la dirección `https://miwalela-campus.vercel.app` (o parecida).
5. Desde ahora, **cada cambio que se suba a la rama `main` se publica solo**.

Qué hace `vercel.json`:

- **Instala y construye:** instala `esbuild`, construye el JavaScript desde `codigo-fuente/` y publica solo la carpeta `campus/`. El código fuente no queda expuesto.
- **Contenido siempre al día:** hace que `datos/contenido.js`, el JavaScript y el CSS se vuelvan a pedir en cada visita, así las familias ven los cambios enseguida.
- **Seguridad y buscadores:** agrega encabezados de seguridad y `noindex`, para que el campus no aparezca en Google.

> ### ⚠️ Importante: plan de Vercel
>
> El plan gratis de Vercel (**Hobby**) es solo para uso **personal y no comercial**. Según sus reglas, un sitio hecho para un negocio, o por el que alguien cobra por crearlo o mantenerlo, es uso comercial y necesita el plan **Pro** (de pago). Ver [Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage).
>
> Si prefieres no pagar, este mismo repositorio funciona en **Cloudflare Pages** (plan gratis, visitas ilimitadas a archivos estáticos):
> 1. Conecta el repositorio de GitHub.
> 2. Comando de build: `npm run build`.
> 3. Carpeta de salida: `campus`.

## 3. Cómo la profe cambia el contenido

1. Abre el panel: `https://TU-PROYECTO.vercel.app/admin/` (mejor en Chrome o Edge, en su computador).
2. Edita cursos, sesiones, videos, guías, clases, reto de la semana, insignias, niveles y ajustes. Todo queda guardado como **borrador en ese navegador**.
3. Con **Ver en el campus** prueba los cambios como los verán los niños. Solo ella los ve.
4. Toca **Publicar**: se descarga el archivo `contenido.js`.
5. En GitHub, entra a la carpeta **`campus/datos`** → **Add file → Upload files**, arrastra `contenido.js` y toca **Commit changes**. Así reemplaza al anterior.
6. Vercel publica solo en uno o dos minutos. Al recargar el panel debe decir **«Todo publicado»**.

Consejos:

- **Botones directos a GitHub:** en **Panel → Ajustes → Publicación** escribe el repositorio (`usuario/miwalela-campus`). Así el botón «Publicar» muestra botones que abren directamente la carpeta correcta de GitHub.
- **Permiso para subir:** para que la profe pueda subir archivos, agrégala como colaboradora del repositorio (**Settings → Collaborators → Add people**). También puede enviarte el `contenido.js` y lo subes tú.
- **Un solo navegador:** el borrador vive en el navegador donde se edita, así que conviene editar siempre en el mismo. En *Ajustes* se puede descargar o abrir una copia del borrador.

## 4. Videos, imágenes y PDF

- **Videos:**
  - Lo recomendado es subirlos a **YouTube como «No listado»** y pegar el enlace en el panel: no ocupan espacio y se ven bien en celulares.
  - Si eliges un **MP4**, el panel te recuerda subirlo a GitHub en `campus/assets/media`. Máximo 25 MB por archivo desde el navegador; 720p alcanza.
  - Los dos videos del Módulo 1 que vienen son **de muestra (20 s)**: reemplázalos.
- **Imágenes:** el panel las reduce y las guarda dentro de `contenido.js`. No hay que subirlas aparte.
- **PDF de las guías:** súbelos a `campus/assets/media` o pega un enlace de Google Drive.

## 5. Cómo funciona sin servidor

| | Cómo es |
|---|---|
| Progreso de cada niño | Se guarda en el navegador del dispositivo donde estudia |
| Cambiar de dispositivo | *Mis logros → Guardar una copia* → en el otro dispositivo *Traer mi progreso* |
| Preguntas, fotos y reservas de cupo | Le llegan a la profe por **WhatsApp**, con el mensaje listo. El número se cambia en *Panel → Ajustes* |
| Ver el avance de un niño | La familia toca *Enviar copia a mi profe* y la profe abre el archivo en *Panel → Progreso de un niño* |
| Olvidé mi contraseña | El adulto la cambia con el correo y el celular que registró |

**Privacidad:**

- No hay una base de datos central: cada familia guarda sus datos en su dispositivo, y solo salen cuando ella misma envía algo por WhatsApp.
- Las contraseñas se guardan cifradas con sal en el navegador.
- El panel publicado en `/admin/` no puede cambiar el campus de nadie: edita un borrador en el navegador de quien lo abre. Lo que ven las familias solo cambia cuando se sube un nuevo `contenido.js` a GitHub.

**Contenido incluido:**

- **Real, del PDF:** el **Módulo 1** (sesiones, retos, guías, PDF, insignias y niveles).
- **Ejemplos para que el campus se vea como el mockup**, que se editan o borran desde el panel:
  - el Módulo 2 y el Módulo 3 («muy pronto»);
  - el taller «¡Le doy vida a mi falda!»;
  - las dos clases en vivo;
  - el reto de la semana.

## 6. Desarrollo local

```bash
npm install
npm run build          # genera campus/assets/js/campus.js y panel.js (minificados)
npm run build:legible  # igual, sin minificar
npm run dev            # sirve la carpeta campus en http://localhost:3000
```

- **Sin servidor:** también se puede abrir `campus/index.html` y `campus/admin/index.html` con doble clic. Los videos de YouTube solo funcionan con el sitio servido por http(s).
- **Código fuente:** está en `codigo-fuente/fuente/`.
  - `campus/` y `admin/`: las pantallas.
  - `local/`: el motor que reemplaza a la API en PHP + MySQL. Atiende las mismas rutas (`inicio`, `sesion`, `reto/completar`…).
- **Dónde se guardan los datos en el navegador:**
  - progreso: `localStorage["miwalela:campus:v1"]`;
  - fotos: IndexedDB `miwalela-fotos`;
  - borrador del panel: IndexedDB `miwalela-panel`.

## 7. Solución de problemas

| Problema | Solución |
|---|---|
| Vercel muestra 404 o una lista de archivos | `vercel.json` no quedó en la raíz del repositorio (se subió la carpeta en vez de su contenido). Muévelo o, en Vercel, pon *Root Directory* en la carpeta donde quedó. |
| Falla el *build* en Vercel | Revisa el log del despliegue. Debe existir `package.json` en la raíz junto a `vercel.json`. |
| Los cambios del panel no aparecen | Falta subir `contenido.js` a `campus/datos` en GitHub, o el despliegue aún no termina (míralo en Vercel → *Deployments*). |
| Un MP4 no se ve | Revisa que esté en `campus/assets/media` con el mismo nombre (respeta mayúsculas y espacios). |
| «No encontramos esa cuenta en este dispositivo» | La familia se registró en otro dispositivo o navegador: que use *Traer mi progreso* con su copia. |
| Al cambiar el dominio, las familias «pierden» su progreso | Cada dirección guarda sus propios datos: que guarden una copia en la dirección vieja y la traigan en la nueva. |
