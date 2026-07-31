# Mercury — Features Menores (Contraseña · Guardados · Búsqueda · Tabú Gate · Video)

- **Fecha:** 2026-07-30
- **Proyecto:** Mercury (`E:\Proyectos\Proyectos\Programacion\Mercury`, GitHub `JuanGomez3112/Mercury`, branch `master`)
- **Servidor dev:** Proxmox CT 106 (192.168.1.106) — `next start` :3000 tras nginx :80, Postgres local, MinIO
- **Stack:** Next.js 16 (App Router) · React 19 · TS · Tailwind v4 · Prisma **6** · PostgreSQL · MinIO (S3) · auth propia (bcryptjs + JWT `jose`) · Font Awesome self-hosted

## Objetivo

Cerrar cinco piezas menores, en un solo spec, implementadas en **orden de esfuerzo** (barato → caro), con deploy incremental tras cada una:

1. Cambio de contraseña
2. Guardados (bookmarks)
3. Búsqueda (usuarios + posts + tags) con chips de filtro
4. Tabú Gate (clave para desbloquear contenido adulto)
5. Video en posts (media mixta: fotos + varios videos)

Principio: cada pieza es una unidad aislada con interfaz clara (endpoint + componente), sin refactors no relacionados. Reusar patrones existentes (`[id]/like` para toggles, `PostCard`/`AppShell` para páginas, `validation.ts` para reglas).

---

## 1. Cambio de contraseña

**Problema:** no existe forma de cambiar la contraseña; el usuario `gomez` tiene una clave generada. Las cuentas Google tienen `passwordHash = null`.

**Endpoint** `POST /api/me/password`
- Body: `{ current?: string, next: string, confirm: string }`.
- Requiere sesión (`currentUser()`).
- Carga `user.passwordHash`:
  - Si **existe**: `current` obligatorio, verificar con `bcrypt.compare`; si no coincide → `400 { error: "Contraseña actual incorrecta" }`.
  - Si es **null** (cuenta Google): permitir **establecer** clave sin `current` (ya autenticado por sesión).
- Validar `next === confirm` y reglas de `validation.ts` (mismas que registro). Si falla → `400` con mensaje.
- Hashear `next` con bcryptjs, `prisma.user.update({ passwordHash })`. Responder `{ ok: true }`.

**UI** — `src/components/PasswordForm.tsx` (client)
- Se monta en `/ajustes` reemplazando la nota "Cambio de contraseña … próximamente".
- Recibe prop `hasPassword: boolean` (el server sabe si `passwordHash` es null).
- Campos: **Contraseña actual** (oculto si `!hasPassword`, con texto "Establece tu contraseña"), **Nueva**, **Confirmar**.
- Envía a `/api/me/password`; mensajes de éxito/error inline. Limpia campos al éxito.
- `/ajustes/page.tsx` pasa a `select` también `passwordHash` (solo para derivar `hasPassword`, no se expone el hash al cliente).

**Sin cambios de schema.**

---

## 2. Guardados (bookmarks)

**Modelo nuevo** (Prisma, `prisma db push`):
```prisma
model Bookmark {
  userId    String
  postId    String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@id([userId, postId])
  @@index([postId])
}
```
Añadir relaciones inversas en `User` (`bookmarks Bookmark[]`) y `Post` (`bookmarks Bookmark[]`).

**Endpoint** `POST /api/posts/[id]/bookmark` (toggle, calca `[id]/like/route.ts`)
- Requiere sesión. Si existe Bookmark(userId, postId) → delete; si no → create. Responder `{ saved: boolean }`.

**PostMenu** (`src/components/PostMenu.tsx`)
- Nueva prop `saved: boolean`.
- Ítem "Guardar" / "Quitar de guardados" (según `saved`), con estado local + fetch al endpoint. Reemplaza el uso del hueco actual (mantener Reportar/Copiar como están; añadir Guardar arriba).

**Queries** (`src/lib/queries.ts`)
- Donde se arman los posts (feed, perfil, guardados), incluir si el usuario actual lo guardó (`saved`) — vía `_count`/relación filtrada o un set de ids guardados. Patrón igual al que ya usan likes.

**Página** `/guardados` — `src/app/guardados/page.tsx` (server)
- `AppShell`, título "Guardados", lista de posts guardados del usuario (join Bookmark→Post, orden `Bookmark.createdAt desc`), reusando `PostCard`.
- Enlace "Guardados" del menú de perfil / rail se cablea a `/guardados`.
- Estado vacío: mensaje "Aún no guardas nada".

---

## 3. Búsqueda (usuarios + posts + tags) con chips de filtro

**Endpoint** `GET /api/search?q=&type=all|users|posts|tags`
- Requiere sesión. `q` trim; si vacío → `{ users: [], posts: [], tags: [] }`.
- **users:** `where username|displayName contains q (insensitive)`, top 10 (id, username, displayName, avatarUrl, mode).
- **posts:** `where body contains q (insensitive)`, orden `createdAt desc`, top 10, con author + counts. **Los posts `isAdult` se marcan** en la respuesta (`isAdult: true`) para que el cliente los difumine hasta desbloquear (ver §4).
- **tags:** sin modelo de tags hoy → parseo del `body`:
  - Normalizar `q` quitando `#` inicial.
  - Buscar posts con `body ILIKE '%#' || q || '%'`, extraer hashtags con regex `/#(\w+)/g` en app, filtrar los que contienen `q`, dedupe + conteo, top 10 → `[{ tag, count }]`.
  - *Extensible:* cuando crezca, modelo `Tag`/`PostTag` + índice trigram. Anotado como deuda.
- Respeto Tabú: el endpoint **incluye** adultos pero los marca; el filtrado visual/desbloqueo es cliente (§4). Filtro `type=tabu` devuelve solo `isAdult`.

**UI barra de búsqueda** — `src/components/SearchBar.tsx` (client)
- Reemplaza el input estático del `TopBar`.
- Debounce ~250ms al teclear → fetch `/api/search?q=`; dropdown de resultados agrupados (Personas, Post, Hashtag). Adultos difuminados con candado (§4).
- Enter → navega a `/buscar?q=`.

**Página** `/buscar` — `src/app/buscar/page.tsx` (server)
- Lee `q` y `type` de searchParams; misma capa de query (extraer lógica a `src/lib/search.ts` reutilizada por endpoint y página).
- **Chips de filtro** (fila superior, `src/components/SearchFilters.tsx`): **Personas · Post · Hashtag · Tabú · Reels · Páginas · Grupos**.
  - Activos: Personas, Post, Hashtag, Tabú, **Reels = posts que contienen video** (detectado por extensión en `images[]`).
  - **Páginas / Grupos:** visibles en gris, deshabilitados, etiqueta "pronto" (no existen aún).
  - El chip seleccionado filtra por `type`.
- Resultados: Personas (con `FollowButton`), Post (con `PostCard`), Hashtag (chips con conteo → clic busca ese tag = `/buscar?q=%23tag&type=posts`), Tabú (posts adultos, difuminados hasta desbloquear).

---

## 4. Tabú Gate (clave para desbloquear contenido adulto)

**Concepto:** contenido Tabú (adulto) sale **difuminado**; se revela tras introducir una **clave configurable** en un popup con estilo Mercury. Biometría (huella/FaceID) queda para la app móvil (extensión futura vía WebAuthn/native).

**Configurar clave** — sección "Clave Tabú" en `/ajustes`
- Componente client `TabuPinForm.tsx`. Campo clave (mín. 4) + confirmar.
- Endpoint `POST /api/me/tabu/pin` — body `{ current?, next, confirm }`; guarda `User.tabuPinHash` (bcrypt). Si ya hay clave, exige `current` para cambiarla.
- Schema: añadir `tabuPinHash String?` a `User`.

**Desbloquear** — `src/components/TabuGate.tsx` (client, modal)
- Popup estilizado (fondo navy, borde `white/10`, acento degradado morado `#mercuryGrad`).
- Se dispara al: (a) entrar a la pestaña **Tabú** del feed, (b) tocar un resultado/contenido **adulto** en búsqueda.
- Pide la clave → `POST /api/me/tabu/unlock` (verifica contra `tabuPinHash`).
  - Éxito → setea cookie **httpOnly firmada** `tabu_unlocked` **de sesión (sin Max-Age)**. Mientras viva, no vuelve a pedir; el server la lee para no marcar blur.
  - Si el usuario **no tiene clave** → el popup ofrece **crear clave** primero (enlaza/incrusta el flujo de `POST /api/me/tabu/pin`).
- Contenido adulto: envuelto en wrapper con `blur` + candado hasta que `tabu_unlocked` sea válido.

**Duración inteligente (por ciclo de vida, no por tiempo)**

El desbloqueo debe persistir mientras la app esté abierta y en primer plano, y re-bloquearse al cerrar la app o mandarla a segundo plano:
- **Cerrar app / navegador** → cookie de sesión muere sola → re-bloqueado. ✔
- **Segundo plano y volver** → re-pide clave. Se implementa con un listener cliente (en `AppShell`/`TabuGate`) a `visibilitychange`: al pasar a `document.hidden` → `POST /api/me/tabu/lock` (borra la cookie `tabu_unlocked`). Al volver a primer plano, la cookie ya no existe → el gate re-aparece. ✔
- **Navegar dentro de la app** (salir de la pestaña Tabú hacia el feed y volver) **no** dispara background → sigue desbloqueado. ✔
- Sin expiración por tiempo. *(Opcional futuro: gracia de ~1–2s para ignorar backgrounds fugaces tipo pull-down de notificaciones; por ahora estricto, tal como se pidió.)*
- **Móvil (futuro):** mismo patrón con lifecycle nativo (onPause → lock, onResume → gate) + biometría (WebAuthn/FaceID).

**Estado de desbloqueo**
- Fuente de verdad: cookie httpOnly de sesión `tabu_unlocked` (firmada con el mismo secreto de sesión, patrón `jose`).
- Endpoints: `POST /api/me/tabu/unlock` (setea) · `POST /api/me/tabu/lock` (borra).
- Server components (feed Tabú, búsqueda) leen la cookie para decidir si difuminan. Cliente refleja tras desbloquear/bloquear (router.refresh).

**⚠️ Nota de seguridad (documentada, no bloqueante):** hoy el bucket MinIO es **público** (`mercury-media` anonymous download) → las URLs de media adulta son accesibles directo sin gate. Por tanto el Tabú Gate es una **capa de consentimiento/UX**, no un candado real. La protección dura requiere **URLs firmadas** (ya en el roadmap de contenido de pago). Este spec no cierra ese hueco; lo deja explícito para la fase de pagos.

---

## 5. Video en posts (media mixta)

**Almacenamiento:** reusar `Post.images[]` — fotos y videos mezclados en el mismo array, **orden preservado**, tipo detectado por extensión de la URL (`.mp4` / `.webm` = video). **Sin cambio de schema.**

**Límites:**
- Cap total **≤10 ítems** por post (fotos + videos juntos).
- Video **≤50MB** c/u; foto **≤10MB** (actual).

**`src/app/api/upload/route.ts`**
- Aceptar tipos de video en `extFor` (`s3.ts`): `video/mp4` → `.mp4`, `video/webm` → `.webm`.
- Límite por archivo según tipo: si es video → 50MB; si imagen → 10MB.
- Subir a MinIO igual que imágenes (`putMedia`).

**`src/lib/s3.ts`**
- `extFor` mapea los MIME de video además de los de imagen.

**⚠️ Infra (paso de deploy obligatorio):** nginx en CT 106 tiene `client_max_body_size` por defecto **1MB** → subir a **≥50MB** (`client_max_body_size 55m;` en el server block, luego reload). Sin esto, el upload de video devuelve **413 Request Entity Too Large**. Documentar en la nota de servidor y en `mercury-deploy`/config nginx.

**Composer** — `src/components/PostComposer.tsx`
- Dos disparadores separados (reemplazan la pill única "Foto|Video"):
  - **Foto** 🖼 — input oculto `accept="image/*"` (múltiple).
  - **Video** 🎬 — input oculto `accept="video/*"` (múltiple).
- Preview mezclada: miniatura de imagen, y para video una miniatura/`<video>` con overlay ▶.
- Validación cliente: respetar cap total ≤10 y tamaños antes de subir (mensaje si excede).

**`src/components/PostMedia.tsx`**
- Por cada ítem detectar tipo:
  - Imagen → `<img>` (como hoy).
  - Video → `<video preload="metadata">`; en tile de collage con overlay ▶ (sin autoplay).
- Collage: misma retícula actual (2×384 / 3×256, +N), los tiles de video muestran ▶.
- Lightbox: panel izquierdo reproduce el video con `<video controls>` cuando el ítem activo es video.

---

## Orden de implementación y entregas

| # | Pieza | Cambio schema | Infra | Deploy tras |
|---|-------|---------------|-------|-------------|
| 1 | Contraseña | No | No | ✅ |
| 2 | Guardados | `Bookmark` | No | ✅ |
| 3 | Búsqueda + chips | No | No | ✅ |
| 4 | Tabú Gate | `User.tabuPinHash` | No | ✅ |
| 5 | Video | No | **nginx `client_max_body_size`** | ✅ |

Deploy: `ssh proxmox "pct exec 106 -- /usr/local/bin/mercury-deploy"` (git pull + npm ci + prisma db push + build + restart). Para #5, aplicar antes el fix de nginx en CT 106.

## Riesgos / deuda anotada

- **Búsqueda de tags por scan de `body`** es O(n) sobre posts — aceptable a escala dev; migrar a modelo `Tag` + índice trigram cuando crezca.
- **Tabú Gate = consentimiento, no seguridad** mientras el bucket sea público (media adulta accesible directo). Cierre real = URLs firmadas en fase de pagos.
- **Video 50MB** depende del fix de nginx; sin él, 413.
- **Biometría** (huella/FaceID) explícitamente fuera de alcance — futura app móvil.

## Fuera de alcance (no construir aquí)

Merycoin, contenido de pago/tienda, verificación de edad fuerte (ID), moderación real, OAuth Google (pausado), Reels como feed dedicado, Páginas y Grupos como entidades (solo aparecen como chips deshabilitados).
