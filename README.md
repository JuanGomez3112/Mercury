# Mercury

Red social para adultos 18+ de mente abierta. Ecosistema previsto: red social + venta de contenido de pago + tienda de artículos + criptomoneda **Merycoin**.

## Stack

- **Next.js 16** (App Router) · React 19 · TypeScript
- **Tailwind CSS v4**
- **Prisma 6 + PostgreSQL**
- **MinIO** (S3-compatible) para media
- Auth propia (bcryptjs + sesión JWT con `jose`, cookie httpOnly) + OAuth Google (código listo, sin credenciales)
- Iconos: **Font Awesome** (self-hosted)
- Deploy: `next start` en Proxmox CT 106 detrás de nginx

## Funcionalidad (implementada)

- **Auth:** registro/login/logout; **18+ verificado server-side** (fecha de nacimiento); age-gate. OAuth Google cableado (pausado: falta dominio + credenciales).
- **Feed con pestañas** (filtran contenido, cambio client sin recargar):
  - **Explora** — gente que no sigues · **Feed** — tu círculo · **Tabú** — contenido adulto (like = 🔥)
- **Publicaciones:** composer con slide-to-publish (arrastrar), subir imágenes (≤10), toggle adulto (🔥), tags scrollables; media 1 imagen o collage (2×384 + 3×256, +N); **lightbox** de 2 paneles (foto | comentarios+likes); likes (corazón degradado), comentarios funcionales, menú ⋯ (reportar/copiar/borrar).
- **Historias** con modo **ángel/diablito** (aureola/cuernos) configurable.
- **Perfiles** `/u/[username]` (avatar+modo, verificado, bio, contadores, seguir, mensaje).
- **Mensajería** `/mensajes`: tiempo real (polling), no leídos con badges, "escribiendo…", envío de imágenes.
- **Notificaciones** `/notificaciones`: like/comentario/follow, campana con badge, dropdown de preview.
- **Dropdowns** en el header (notificaciones, mensajes) y **menú de perfil** (perfil/guardados/ajustes/cerrar sesión).
- **Rail vertical** de navegación persistente en todas las secciones (`AppShell`).
- **Ajustes** `/ajustes` (cuenta, modo, cerrar sesión).

## Modelos (Prisma)

`User`, `Post` (images[], isAdult), `Comment`, `Like`, `Follow`, `Message` (imageUrl, readAt), `Notification`.

## Estructura

- `src/app/` — rutas y route handlers (`/api/...`)
- `src/components/` — UI (AppShell, TopBar, LeftRail, Stories, PostComposer, PostCard, PostMedia, ChatThread, dropdowns, etc.)
- `src/lib/` — `db`, `session`, `auth`, `queries`, `notifications`, `s3`, `google`, `types`, `time`
- `prisma/schema.prisma`
- `public/` — logo, `Cuernos.svg`, `Aurola.svg`, `Home.svg` (diseño de referencia)
- `legacy-static/` — sitio estático v0 original (login)

## Desarrollo

```bash
npm install
npm run dev     # http://localhost:3000 (requiere DATABASE_URL en .env)
npm run build
```

Variables en `.env` (ver `.env.example`): `DATABASE_URL`, `AUTH_SECRET`, `COOKIE_SECURE`, `S3_*`, `APP_URL`/`GOOGLE_*` (OAuth).

## Deploy (Proxmox CT 106)

Push a `master` →
```bash
ssh proxmox "pct exec 106 -- /usr/local/bin/mercury-deploy"
```
= `git pull && npm ci && prisma db push && npm run build && systemctl restart mercury`.
Sirve en **http://192.168.1.106** (nginx `:80` → Next `:3000`; media en `/media/` → MinIO).

## Pendiente

- **Merycoin** — decidir cadena (ERC-20 L2 / SPL Solana / propia) antes de implementar.
- **Contenido de pago / tienda** — modelos + gating; el bucket pasará a URLs firmadas.
- **Cumplimiento** — verificación de edad fuerte (ID), procesador de pagos apto para contenido adulto, moderación.
- OAuth Google — falta dominio público HTTPS + Client ID/Secret.
- Cambio de contraseña, búsqueda, guardados (bookmarks reales), video en posts, comentarios bajo el post.
