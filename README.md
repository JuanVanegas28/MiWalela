# MiWalela · Campus MiniDiseñadores

Campus web para las niñas y niños de MiWalela (desde los 6 años). Incluye:

- cursos, sesiones y videos;
- guías paso a paso con PDF;
- retos, estrellas, niveles e insignias;
- colección de fotos de sus creaciones;
- clases en vivo;
- el **Panel de la profe**: contenido, estudiantes, preguntas, fotos y clases.

Se entra como **Soy MiniDiseñador** o como **Soy Profe**, cada uno con su correo (o usuario) y contraseña.

Es un **sitio estático**: HTML, CSS y JavaScript, sin base de datos ni servidor (ver [la sección 6](#6-importante-esta-versión-es-una-demo)). Está listo para subirlo a GitHub y desplegarlo en **Vercel**.

| | Dirección |
|---|---|
| Campus de los niños | `https://TU-PROYECTO.vercel.app/` |
| Panel de la profe | En la entrada, **Soy Profe** (o `https://TU-PROYECTO.vercel.app/admin/`) |

---

## Estructura del repositorio

```
├── campus/                 ← lo que se publica (Vercel sirve esta carpeta)
│   ├── index.html              Campus de los niños
│   ├── admin/index.html        Panel de la profe
│   ├── datos/contenido.js      Contenido de muestra: cursos, retos, guías, clases, insignias…
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
> Son 79 archivos; GitHub permite 100 por subida y 25 MB por archivo.
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
- **Siempre al día:** hace que `datos/contenido.js`, el JavaScript y el CSS se vuelvan a pedir en cada visita.
- **Seguridad y buscadores:** agrega encabezados de seguridad y `noindex`, para que el campus no aparezca en Google.

> ### ⚠️ Importante: plan de Vercel
>
> El plan gratis de Vercel (**Hobby**) es solo para uso **personal y no comercial**. Según sus reglas, un sitio hecho para un negocio, o por el que alguien cobra por crearlo o mantenerlo, es uso comercial y necesita el plan **Pro** (de pago). Ver [Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage).
>
> Si prefieres no pagar, este mismo repositorio funciona en **Cloudflare Pages** (plan gratis, visitas ilimitadas a archivos estáticos):
> 1. Conecta el repositorio de GitHub.
> 2. Comando de build: `npm run build`.
> 3. Carpeta de salida: `campus`.

## 3. Cómo entra la profe

1. Abre el campus (`https://TU-PROYECTO.vercel.app/`).
2. En la pantalla de entrada elige **Soy Profe** (al lado de **Soy MiniDiseñador**).
3. La primera vez toca **Crear mi cuenta de profe**: nombre, correo y una contraseña de mínimo 8 caracteres. Entra directo al panel.
4. Las siguientes veces entra con su **correo y contraseña**. También puede abrir directamente `/admin/`: si no ha iniciado sesión, la lleva a esa pantalla.
5. En **Panel → Ajustes** puede cambiar su contraseña y **agregar otras profes**.

## 4. Qué hay en el panel

| Sección | Para qué sirve |
|---|---|
| Resumen | Cifras del campus, próximas clases, lo último que hicieron los niños y el enlace para las familias |
| Cursos y sesiones | Módulos, talleres, sesiones y retos (actividades, videos y guías) |
| Guías | Pasos con imágenes, «Recuerda» y PDF para imprimir |
| Clases en vivo | Fecha, enlace, cupos, reservas y asistencia |
| Reto de la semana | El reto corto que aparece en el inicio |
| Estudiantes | Ficha de cada niño o niña: progreso, insignias, fotos, familia y estrellas de regalo |
| Preguntas | Las dudas de los niños; la respuesta les llega como notificación |
| Fotos | Sus creaciones; al marcarlas como vistas reciben estrellas y el comentario |
| Insignias y Niveles | Los premios del juego |
| Ajustes | Nombre del campus, WhatsApp, estrellas automáticas, contraseña y profes |

Los cambios se guardan al tocar **Guardar** y se ven de inmediato en el campus.

## 5. Videos, imágenes y PDF

- **Videos:** se pueden subir desde el computador (MP4) o pegar un enlace de **YouTube** («No listado» es buena opción).
- **Imágenes:** el panel las reduce solo.
- **PDF de las guías:** se suben desde el computador o se pega un enlace de Google Drive.
- Los dos videos del Módulo 1 que vienen son **de muestra (20 s)**: reemplázalos.

## 6. Importante: esta versión es una demo

Esta versión **no tiene servidor**: todo se guarda **en el navegador donde se usa**:

- las cuentas de profe y de las familias;
- el progreso de los niños y sus fotos;
- las preguntas, reservas y estrellas;
- los cambios del panel y los videos o PDF que se suben.

**Para revisarla:** abre el campus y el panel en **el mismo navegador**, en dos pestañas.

- Lo que cambia la profe se ve en el campus.
- Lo que hacen los niños (preguntas, fotos, reservas) llega al panel.

Otro computador o celular empieza desde cero, con el contenido de muestra.

> **Para usarlo de verdad con familias desde sus casas** se necesita un servidor con base de datos: la **versión PHP + MySQL** del campus. Tiene las mismas pantallas, con los datos de todos en un solo lugar.

**Para dejar fijo el contenido de muestra para todos:**

1. Abre `https://TU-PROYECTO.vercel.app/admin/#/exportar` (no aparece en el menú) y descarga `contenido.js`.
2. Súbelo a `campus/datos` en GitHub, reemplazando el anterior.

Ten en cuenta:

- Los videos y PDF subidos desde el computador **no van dentro de ese archivo**. Ponlos en `campus/assets/media` o usa enlaces de YouTube o Drive.
- En esta demo, «¿Olvidaste tu contraseña?» de la profe solo pide el correo, porque no hay servidor que envíe correos.

## 7. Desarrollo local

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
  - cuentas, progreso, preguntas y reservas: `localStorage["miwalela:campus:v1"]`;
  - fotos de los niños: IndexedDB `miwalela-fotos`;
  - cambios del panel, videos y PDF subidos: IndexedDB `miwalela-panel`.

## 8. Solución de problemas

| Problema | Solución |
|---|---|
| Vercel muestra 404 o una lista de archivos | `vercel.json` no quedó en la raíz del repositorio (se subió la carpeta en vez de su contenido). Muévelo o, en Vercel, pon *Root Directory* en la carpeta donde quedó. |
| Falla el *build* en Vercel | Revisa el log del despliegue. Debe existir `package.json` en la raíz junto a `vercel.json`. |
| No veo en otro computador lo que hice | Es normal en esta demo: cada navegador guarda sus propios datos (ver la sección 6). |
| Un MP4 no se ve | Usa MP4 en H.264 (el formato normal de celulares y cámaras). Si es muy pesado, súbelo a YouTube y pega el enlace. |
| «No encontramos esa cuenta» | La cuenta se creó en otro navegador o dispositivo. |
