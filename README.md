# DJ JOHNX

Página pública y panel de administración de **DJ JOHNX**, DJ cubano afincado en
Alicante. La web muestra la portada, biografía, eventos, servicios, galería,
vídeo y contacto; el panel permite editar todo ese contenido y además llevar los
trabajos, los cobros y la facturación.

Dominio de producción: **https://djjohnx.com**

Todo el interfaz está en español y el formato regional es `es-ES` con moneda EUR.

---

## Arquitectura

| Pieza | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Lenguaje | TypeScript en modo `strict` |
| Estilos | Tailwind CSS v4 + componentes shadcn/ui |
| Base de datos | Neon Postgres vía `@neondatabase/serverless` |
| Imágenes | Vercel Blob |
| Validación | Zod, siempre en el servidor |
| Pruebas | Vitest |
| Despliegue | Vercel |

### Estructura

```
app/
  page.tsx                 Home: túnel de entrada y los dos accesos
  john/page.tsx            Sitio público de DJ JOHNX
  layout.tsx               Metadatos, SEO y fuentes
  sitemap.ts / robots.ts   SEO (excluyen /admin)
  actions/                 Server Actions (todas verifican sesión)
  admin/
    login/                 Acceso
    (panel)/               Panel protegido
  api/admin/blob-upload/   Emisión de token de subida a Blob
components/                Secciones públicas y pantallas de admin
  cinematic/               Escenario del recorrido (rueda, dedo y teclado mueven la cámara)
  tunnel-hero/             Home: túnel 3D y accesos IAM DJ JOHNX / IAM PROSOUND
lib/
  db.ts                    Cliente Neon (solo servidor)
  session.ts               Token de sesión firmado (compatible con Edge)
  auth.ts                  requireAdminSession y cookies
  data.ts                  Acceso a datos y composición del contenido público
  invoice-calc.ts          Motor de cálculo de facturas
  invoice-number.ts        Numeración y nombre de PDF
  format.ts                Formato es-ES y dinero en céntimos
  status.ts                Estados y sus etiquetas
db/migrations/             Migraciones SQL
tests/                     Pruebas
proxy.ts                   Protección de /admin (en Next.js 16 sustituye a middleware.ts)
```

### Decisiones importantes

**El dinero se guarda siempre en céntimos, como entero.** `350,00 €` son `35000`.
Nunca se usa coma flotante para importes. Las conversiones están en `lib/format.ts`.

**Un único motor de cálculo.** `lib/invoice-calc.ts` lo usan el formulario, la
vista previa, el PDF y el servidor. El servidor **siempre** recalcula los totales;
nunca se confía en los que envía el navegador.

**El cliente de Neon nunca llega al navegador.** `lib/db.ts` empieza con
`import "server-only"` y se crea de forma perezosa, así que el build no necesita
`DATABASE_URL`. Todas las consultas usan plantillas etiquetadas, que generan
consultas parametrizadas; no se concatena nunca entrada del usuario en el SQL.

---

## Home: el túnel de entrada

La Home (`/`) es solo una pantalla: una escena 3D real (three.js con React Three
Fiber) en la que la cámara camina por un túnel rectangular de LED hasta el
escenario del fondo. No hay cabecera, textos ni reproductor. Al llegar aparecen
los dos accesos:

- **IAM DJ JOHNX — ENTER** lleva a `/john`, donde está todo el sitio de John
  (portada, biografía, eventos, servicios, galería, vídeo, contacto y música) tal
  como estaba antes en la raíz. El panel de administración sigue editando ese
  contenido.
- **IAM PROSOUND — DISCOVER** lleva a la landing de IAM PROSOUND. Su URL se
  define en `NEXT_PUBLIC_IAM_PROSOUND_URL`; mientras esté vacía, el acceso se
  muestra como "Próximamente" y no enlaza a ningún sitio.

**Movimiento.** La cámara empieza a andar sola al abrir la página y se detiene
suavemente delante del escenario. La página no se desplaza: la rueda, el dedo
(arrastre vertical) y el teclado (flechas, Re Pág/Av Pág, Inicio/Fin) mueven la
cámara directamente. Mientras el visitante interactúa manda él; tras un breve
reposo el paseo se reanuda. Automático y manual actúan sobre una única posición
seguida por un muelle amortiguado, así que no hay saltos de posición ni tirones
de velocidad al pasar de uno a otro. Con la pestaña oculta todo queda en pausa.
No se reproduce ningún sonido.

| Archivo | Qué hace |
|---|---|
| `lib/cinematic/journey.ts` | Motor del recorrido: avance automático, control manual, inercia y "saltar". Lógica pura, con pruebas |
| `components/cinematic/journey-stage.tsx` | Escenario a pantalla completa: traduce rueda, dedo y teclado en movimiento de cámara |
| `components/tunnel-hero/tunnel-config.ts` | Dimensiones, paleta, ritmo de paseo, pose de cámara y punto del DJ set. Funciones puras, con pruebas |
| `components/tunnel-hero/tunnel-world.ts` | Geometría: marcos LED, tiras de suelo, humo, polvo, tarima |
| `components/tunnel-hero/tunnel-shaders.ts` | Iluminación analítica, halos de neón y suelo mojado reflectante |
| `components/tunnel-hero/tunnel-canvas.tsx` | Lienzo WebGL, cámara, reflejo del suelo y resolución adaptativa |
| `components/tunnel-hero/tunnel-accesses.tsx` | Los dos accesos |
| `components/tunnel-hero/tunnel-home.tsx` | Elección de modo, versión fija y botón "Saltar" |

**Rendimiento.** Sin luces en tiempo real ni postprocesado; unas 10 llamadas de
dibujo. La resolución baja sola si el dispositivo no llega a ~45 fps, y three.js
solo se descarga si el túnel va a animarse.

**Accesibilidad.** Con "reducir movimiento" activado, o sin WebGL, se muestra una
imagen fija del túnel (`public/tunnel/poster-*.webp`) con los accesos visibles
desde el principio; quien quiera puede activar el recorrido con un botón. El
botón "Saltar" lleva la cámara al final, y enfocar un acceso con el teclado hace
lo mismo.

**DJ set.** El final del túnel es un escenario preparado (tarima, marco LED y
contraluz) todavía vacío. El material de John se monta pasando un nodo 3D a la
prop `djSet` de `<TunnelHome>`; su posición y volumen reservado están en
`tunnelMetrics().djSet`. Los accesos ocupan la franja inferior y la cámara
encuadra el escenario por encima de ellos.

Parámetros de revisión en la URL:

| Parámetro | Efecto |
|---|---|
| `?fps=1` | Muestra fps, resolución y nivel de calidad (para probar en un móvil real) |
| `?tunnel=static` | Fuerza la versión fija |
| `?tunnel=live` | Fuerza el túnel 3D |
| `?auto=0` | Desactiva el avance automático (solo control manual) |
| `?djset=guia` | Dibuja el volumen reservado para el DJ set |
| `?dpr=1.5` | Fija la resolución de render |

Si cambia el aspecto del túnel hay que regenerar las imágenes fijas con
`node scripts/tunnel-poster.mjs http://localhost:3000` (requiere Playwright y
ffmpeg; no son dependencias del proyecto).

---

## Instalación

Requisitos: Node.js 22 o superior y pnpm.

```bash
pnpm install
cp .env.example .env.local   # y rellena los valores
pnpm dev
```

La aplicación queda en http://localhost:3000 y el panel en
http://localhost:3000/admin.

### Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Build de producción |
| `pnpm start` | Sirve el build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript sin emitir |
| `pnpm test` | Pruebas con Vitest |

---

## Variables de entorno

| Variable | Visibilidad | Para qué |
|---|---|---|
| `DATABASE_URL` | **Privada** | Conexión a Neon Postgres |
| `BLOB_READ_WRITE_TOKEN` | **Privada** | Subida y borrado en Vercel Blob |
| `ADMIN_PASSWORD` | **Privada** | Contraseña del panel |
| `SESSION_SECRET` | **Privada** | Firma HMAC de la cookie de sesión |
| `NEXT_PUBLIC_APP_URL` | Pública | Dominio canónico (`https://djjohnx.com`) |
| `NEXT_PUBLIC_IAM_PROSOUND_URL` | Pública | Landing de IAM PROSOUND. Vacía = acceso "Próximamente" sin enlace |

Reglas:

- Solo `NEXT_PUBLIC_APP_URL` y `NEXT_PUBLIC_IAM_PROSOUND_URL` llevan el prefijo
  `NEXT_PUBLIC_`. **Ningún secreto debe llevarlo nunca**: ese prefijo lo
  incrusta en el navegador.
- `ADMIN_PASSWORD` tiene que ser una contraseña nueva y exclusiva del panel.
- `SESSION_SECRET` no es la contraseña: es un valor distinto e independiente.
- Ninguno de estos valores se guarda en el repositorio. `.env.example` solo
  contiene los nombres.

### Generar `SESSION_SECRET`

```bash
openssl rand -base64 48
```

Pégalo únicamente en las variables de entorno de Vercel. No lo escribas en
código, documentación, commits ni logs. Si alguna vez se expone en una
conversación o en una captura, considéralo comprometido y genera otro: basta con
cambiar la variable en Vercel y volver a desplegar, lo que invalida todas las
sesiones abiertas.

---

## Neon

El esquema vive en el schema `public` y lo componen ocho tablas de contenido más
una de apoyo:

`site_settings`, `site_sections`, `services`, `events`, `gallery_images`,
`jobs`, `invoices`, `invoice_items` y `invoice_counters`.

> **`neon_auth` no se usa ni se toca.** La aplicación no lee, escribe ni migra
> nada en ese schema. La autenticación es propia (ver más abajo) y no usa Neon
> Auth ni Better Auth.

### Migraciones

Están en `db/migrations` y se aplican **en orden**:

| Archivo | Contenido |
|---|---|
| `0001_init.sql` | Creación inicial de las tablas |
| `0002_normalize_and_constraints.sql` | Normalización de estados, claves foráneas, índices, restricciones y numeración atómica |

Se ejecutan pegándolas en el editor SQL de Neon (Neon Console > SQL Editor) o con
`psql "$DATABASE_URL" -f db/migrations/0002_normalize_and_constraints.sql`.

Ambas son **idempotentes**: se pueden ejecutar varias veces sin efectos
adicionales. Ninguna contiene `DROP`, `TRUNCATE` ni `DELETE`.

**`0002` es obligatoria.** Sin ella conviven valores de estado en español
(`'Pendiente'`, `'Borrador'`) con las claves canónicas que espera el código
(`pending`, `draft`), y no existe la tabla `invoice_counters` que hace atómica la
numeración de facturas. La aplicación tolera datos sin migrar al leerlos, pero la
numeración segura sí depende de esa tabla.

### Estados

Se guardan en inglés y se muestran en español (`lib/status.ts`):

| Trabajo | Pago | Factura |
|---|---|---|
| `pending` → Pendiente | `not_invoiced` → No facturado | `draft` → Borrador |
| `confirmed` → Confirmado | `pending` → Pendiente de cobrar | `issued` → Emitida |
| `completed` → Realizado | `partially_paid` → Parcialmente pagado | `sent` → Enviada |
| `cancelled` → Cancelado | `paid` → Pagado | `paid` → Pagada |
| | | `cancelled` → Anulada |

### Numeración de facturas

Formato `PREFIJO-AÑO-NÚMERO`, por ejemplo `DJ-2026-001`. El prefijo y el
siguiente número se configuran en `/admin/configuracion`.

Los borradores **no consumen número**: se guardan como `BORRADOR` y solo reciben
uno definitivo al emitirse. La asignación se hace con un único
`INSERT ... ON CONFLICT DO UPDATE ... RETURNING` sobre `invoice_counters`, que es
atómico, de modo que dos emisiones simultáneas nunca comparten número. El
contador solo avanza, así que los números anulados no se reutilizan. Un índice
único parcial sobre `invoices.number` (para las que no son borrador) actúa de red
de seguridad.

---

## Vercel Blob

Todas las imágenes (galería, portada, servicios, eventos y logo) se guardan en
Vercel Blob. En Neon solo se guardan los metadatos: `blob_url`, `blob_pathname`,
título, descripción, texto alternativo, categoría, orden y visibilidad. **Nunca
se guardan imágenes en base64 dentro de la base de datos.**

La subida es directa desde el navegador con un token de un solo uso que emite
`app/api/admin/blob-upload/route.ts`. Antes de emitirlo se comprueba la sesión y
se restringe el tipo (`image/jpeg`, `image/png`, `image/webp`, `image/avif`) y el
tamaño (15 MB). Los nombres se sanean y llevan sufijo aleatorio.

Al sustituir una foto primero se sube la nueva y se actualiza Neon, y solo
después se borra la anterior: si la subida falla, se conserva la original.

---

## Autenticación

Un solo administrador. **No hay registro, ni recuperación de contraseña, ni
roles, ni usuarios en la base de datos.** No se usa Neon Auth ni Better Auth.

Cómo funciona:

1. El administrador introduce la contraseña en `/admin/login`.
2. Se compara **solo en el servidor** con `ADMIN_PASSWORD`, comparando hashes
   SHA-256 en tiempo constante.
3. Si es correcta se emite un token firmado con HMAC-SHA256 usando
   `SESSION_SECRET`, que contiene versión, fecha de emisión, expiración y un
   nonce aleatorio de 16 bytes.
4. El token viaja en la cookie `johnx_admin_session`, con `httpOnly`, `secure` en
   producción, `sameSite: "lax"`, `path: "/"` y 8 horas de duración.
5. Al cerrar sesión se elimina la cookie.

En cada petición se verifican firma, formato, expiración y versión. Hay dos
barreras independientes: `proxy.ts` intercepta `/admin/*`, y además el layout del
panel y **todas** las Server Actions privadas llaman a `requireAdminSession()`.
Una prueba automática (`tests/admin-protection.test.ts`) recorre
`app/actions/*.ts` y falla si alguna acción exportada no comprueba la sesión.

Hay limitación de intentos por IP (8 cada 10 minutos) y un retardo tras cada
fallo. Si en producción faltan `ADMIN_PASSWORD` o `SESSION_SECRET`, el acceso se
deniega por completo: no existe ningún valor de reserva.

---

## Despliegue en Vercel

1. Importa el repositorio en Vercel.
2. Añade las cinco variables de entorno en *Settings > Environment Variables*.
   Marca como privadas todas menos `NEXT_PUBLIC_APP_URL`.
3. Conecta la integración de Neon y la de Blob si no lo están.
4. Ejecuta las migraciones de `db/migrations` en orden.
5. Despliega.

### Dominio

Añade `djjohnx.com` en *Settings > Domains* y ajusta `NEXT_PUBLIC_APP_URL` a
`https://djjohnx.com`. De esa variable salen `metadataBase`, la URL canónica, el
sitemap y el robots.

`/admin` queda fuera del sitemap y marcado `noindex, nofollow` tanto en
`robots.txt` como en los metadatos de las páginas y en la cabecera
`X-Robots-Tag`.

Tras guardar cambios en el panel se llama a `revalidatePath`, así que la web
pública se actualiza sola: **no hace falta volver a desplegar**.

---

## Pruebas

```bash
pnpm test
```

Cubren el motor de cálculo (línea única, varias líneas, decimales, descuento fijo
y porcentual, IVA 21 %, IRPF 15 % y 7 %, ambos combinados, redondeos y entradas
corruptas), la numeración y el nombre del PDF, la sesión (válida, inválida,
manipulada y caducada), la protección de las Server Actions privadas, la
normalización de estados y el formato `es-ES`.

No hay pruebas de integración contra Neon: requerirían una `DATABASE_URL` real.
Lo que toca la base de datos se comprueba a mano siguiendo la lista de
verificación de abajo.

---

## Copia de seguridad

En *Configuración > Respaldo*.

**Exportar** descarga un JSON con la configuración, secciones, servicios,
eventos, trabajos, facturas, líneas y los metadatos de las fotografías. No
incluye los archivos de imagen: solo sus URL y pathnames, que siguen viviendo en
Vercel Blob.

**Importar** valida el archivo, muestra un resumen y pide confirmación antes de
tocar nada. Funciona en modo *combinar*: solo añade lo que falta, identificando
las secciones por su clave, los servicios por título, los eventos por título y
fecha y las fotos por URL. No sobrescribe ni borra nada, así que importar dos
veces el mismo archivo no duplica contenido.

---

## Limitaciones conocidas

- **La importación solo combina, no sustituye.** Un modo «sustituir» exigiría
  borrados masivos, que quedan deliberadamente fuera.
- **La importación no restaura trabajos ni facturas**, solo los exporta. Se
  identifican por un `id` correlativo y reinsertarlos podría chocar con la
  numeración o con las referencias entre trabajos y facturas. El JSON conserva
  todos los datos para recuperarlos a mano si hiciera falta.
- **La limitación de intentos de acceso vive en memoria**, por instancia. En
  Vercel, con varias instancias, el límite es aproximado. Es suficiente para
  frenar fuerza bruta automatizada, pero no es un límite distribuido.
- **El PDF se genera en el navegador** rasterizando la plantilla con
  `html2canvas-pro` y `jsPDF`, así que el texto no es seleccionable. Para
  imprimir se usan reglas `@media print` sobre el HTML, que sí conserva el texto.
- **`images.unoptimized` está activado**, de modo que no se usa el optimizador de
  imágenes de Next. Las fotos se sirven tal cual desde Blob.
- **La página pública se renderiza siempre en el servidor**
  (`dynamic = "force-dynamic"`) para reflejar los cambios al instante, a costa de
  no cachearse estáticamente.
- **`data/site-content.json`** es el contenido inicial con el que se sembró la
  base de datos. Ya no lo lee nadie: la fuente de verdad es Neon. Se conserva solo
  como referencia histórica.

---

## Lista de verificación manual

Lo que no cubren las pruebas automáticas, por depender de Neon, Blob o el
navegador:

- [ ] Entrar en `/admin` sin sesión redirige a `/admin/login`
- [ ] Acceso correcto, cierre de sesión y sesión caducada a las 8 horas
- [ ] Editar portada, biografía, vídeo y contacto se refleja en la web pública
- [ ] Subir, sustituir, reordenar y eliminar fotos
- [ ] Publicar y ocultar servicios y eventos
- [ ] Crear un trabajo, registrar un cobro parcial y marcarlo como pagado
- [ ] Crear una factura desde un trabajo
- [ ] Emitir una factura y comprobar que el número es correlativo
- [ ] IVA, IRPF y descuento en la vista previa, el PDF y la impresión
- [ ] Descargar el PDF y compartir desde un móvil
- [ ] Recorrer el panel entero desde el móvil
