# Mercury — Moderación (reportes + cola admin + baneo)

- **Fecha:** 2026-08-01
- **Estado:** DISEÑO / documentado. **No implementado aún** (por decisión del usuario: en esta iteración solo se documenta).
- **Proyecto:** Mercury (`E:\Proyectos\Proyectos\Programacion\Mercury`, GitHub `JuanGomez3112/Mercury`, branch `master`)
- **Servidor dev:** Proxmox CT 106 (192.168.1.106).
- **Stack:** Next.js 16 (App Router) · React 19 · TS · Tailwind v4 · Prisma **6** · PostgreSQL · zod · jose.

## Objetivo

Sistema de moderación para la red social adulta: los usuarios **reportan** contenido/cuentas, y el admin gestiona una **cola** con acciones (eliminar contenido, banear/suspender cuentas, descartar). **Línea roja absoluta del concepto: nunca menores** — los reportes de "menor de edad" (y "contenido no consentido") son **prioridad roja** al tope de la cola.

Activa la tarjeta **Moderación** del hub `/admin` (hoy placeholder "pronto").

**Fuera de alcance:** IA de detección/auto-moderación, apelaciones, ban por IP/dispositivo, reportes anónimos, borrado masivo del contenido del baneado, verificación de edad fuerte (ID) — esa va en otro frente de cumplimiento.

## Principios

- Reusa: `currentUser()`/`getSession()`, `prisma`, `requireAdminUnlocked()` (segundo factor admin ya construido), tema oscuro, patrón de forms client.
- Todo lo reportable con un **modelo `Report` genérico** (`targetType` polimórfico), no un modelo por tipo.
- El reporte **no expone nada** del reportado al reportero; solo confirma.

---

## Modelo de datos (Prisma 6 · `prisma db push`)

```prisma
model User {
  // ... existentes ...
  banned          Boolean   @default(false)
  suspendedUntil  DateTime?

  reportsMade     Report[]  @relation("reporter")
  reportsResolved Report[]  @relation("resolver")
}

model Report {
  id           String   @id @default(cuid())
  reporterId   String
  reporter     User     @relation("reporter", fields: [reporterId], references: [id], onDelete: Cascade)
  targetType   String   // post | user | comment | message
  targetId     String   // id polimórfico (sin FK; el target puede borrarse y el reporte queda de histórico)
  reason       String   // menor_edad | no_consentido | acoso | spam | suplantacion | otro
  note         String   @default("")
  priority     Boolean  @default(false) // true si reason ∈ {menor_edad, no_consentido}
  status       String   @default("pending") // pending | resolved | dismissed
  action       String?  // remove | ban | suspend | dismiss (lo que hizo el admin)
  resolvedById String?
  resolvedBy   User?    @relation("resolver", fields: [resolvedById], references: [id], onDelete: SetNull)
  resolvedAt   DateTime?
  createdAt    DateTime @default(now())

  @@unique([reporterId, targetType, targetId])   // un usuario no reporta 2× el mismo target
  @@index([status, priority, createdAt])          // orden de la cola
  @@index([targetType, targetId])                 // agrupar por target
}
```

**Motivos (constante compartida):** `menor_edad`, `no_consentido`, `acoso`, `spam`, `suplantacion`, `otro`. `PRIORITY_REASONS = { menor_edad, no_consentido }`.

---

## Bloques

### Bloque 1 — Schema
- `Report` + `User.banned`/`suspendedUntil` + relaciones. `prisma db push`.
- Constante `src/lib/moderation.ts`: lista de motivos + `isPriority(reason)`.

### Bloque 2 — Reporte (usuarios)
- **`POST /api/report`** `{ targetType, targetId, reason, note? }`:
  - `currentUser()`→401; zod (targetType ∈ lista, reason ∈ lista, note ≤ 500).
  - Verifica que el target existe (por tipo: `post`/`comment`/`message`/`user` findUnique). 404 si no.
  - No auto-reporte: si `targetType==="user"` y `targetId===session.sub` → 400. (Para post/comment/message propios, permitido pero inútil; opcional bloquear si `authorId===session.sub`.)
  - `priority = isPriority(reason)`. Crea `Report`. Si viola `@@unique` (ya reportado por este usuario) → responder `{ ok:true, already:true }` idempotente (catch P2002).
- **`ReportModal`** (client, reutilizable): motivo (radios de la lista, etiquetas en español) + nota opcional → POST → "Reporte enviado, gracias". Cierra.
- **Puntos de entrada:**
  - **Post:** `PostMenu` — reemplazar el stub "Reportar" (`alert`) por abrir `ReportModal` con `targetType=post`, `targetId=post.id`.
  - **Usuario:** `/u/[username]` — ítem/botón "Reportar" (en un ⋯ o junto a Seguir/Mensaje) → `targetType=user`.
  - **Comentario:** en `PostMedia`/`CommentBar` cada comentario gana un "reportar" discreto → `targetType=comment`, `targetId=comment.id`.
  - **DM:** `ChatThread` — menú de la burbuja → `targetType=message`, `targetId=message.id`.

### Bloque 3 — Aplicación del baneo/suspensión
- **`src/lib/auth.ts` (o nuevo `requireActiveUser()`):** `currentUser()` + carga `banned`/`suspendedUntil`; si `banned` o `suspendedUntil > now` → devuelve estado "bloqueado" (null + razón). Helper que las rutas de **escritura** usan: publicar (`/api/posts`), comentar (`/api/posts/[id]/comments`), DM (`/api/messages`), propina (`/api/tips`), transferencia (`/api/wallet/send`), checkout (`/api/checkout`) → 403 "Cuenta suspendida/baneada" si bloqueado.
- **Login** (`/api/auth/login`): tras verificar credenciales, si `banned` o `suspendedUntil>now` → 403 con mensaje ("Cuenta baneada" / "Suspendida hasta dd/mm"), sin crear sesión.
- Nota: no se invalidan las cookies JWT ya emitidas globalmente; el guard de escritura corta al baneado en su próxima acción; el login bloquea nuevas sesiones. (v1 aceptable; un logout forzado global = deuda.)

### Bloque 4 — Cola admin
- **`/admin/moderacion`** (`requireAdminUnlocked` → si no, `AdminUnlock`; si no admin, redirect): lista de reportes `pending` ordenados por `priority desc, createdAt asc` (rojos al tope), + filtro por estado. **Agrupar por `(targetType,targetId)`**: un card por target con conteo de reportes, motivos y notas.
- Card: reportero(s), **preview del target** (post → texto + link a la media/lightbox; user → link al perfil; comment/message → texto), badge **rojo** si priority.
- **`POST /api/admin/reports/[id]`** (`requireAdminUnlocked`→403) `{ action, suspendDays? }`:
  - `remove` → borra el target según `targetType` (`prisma.post/comment/message.delete`); para `user` no aplica (usar ban/suspend).
  - `ban` → `User.banned=true` (autor del contenido o el usuario reportado; resolver el autor por targetType).
  - `suspend` → `User.suspendedUntil = now + suspendDays*24h` (dropdown 1/7/30).
  - `dismiss` → nada al target.
  - En todos: marca los reportes del **mismo target** como `resolved`/`dismissed` con `action`, `resolvedById`, `resolvedAt` (una acción resuelve todos los reportes agrupados de ese target).
- Resolver el "autor a sancionar" por `targetType`: post→`post.authorId`, comment→`comment.authorId`, message→`message.senderId`, user→`targetId`.

### Bloque 5 — Hub
- Activar la tarjeta **Moderación** en `src/app/admin/page.tsx` (`href: "/admin/moderacion"`, quitar el estado "pronto"). Badge opcional con nº de reportes `pending` (client fetch).

---

## Secuenciación

| # | Bloque | Schema | Depende |
|---|--------|--------|---------|
| 1 | Schema | `Report`, `User.banned/suspendedUntil` | — |
| 2 | Reporte + entradas | — | 1 |
| 3 | Aplicación baneo | — | 1 |
| 4 | Cola admin + acciones | — | 1,3 |
| 5 | Hub (activar tarjeta) | — | 4 |

Deploy por bloque: `mercury-deploy` (`prisma db push`). Sin infra nueva.

## Riesgos / deuda anotada

- **Enforcement parcial del ban:** cookies JWT vivas no se invalidan globalmente (login bloquea nuevas sesiones; el guard corta en la próxima escritura). Logout forzado global = deuda.
- **Sin borrado masivo** del contenido del baneado (manual).
- **Target polimórfico sin FK:** el reporte sobrevive al borrado del target (histórico); la preview maneja target inexistente ("contenido eliminado").
- **Prioridad roja** es un realce de cola, no un bloqueo automático — el admin decide. La línea roja (menores) exige acción manual inmediata; considerar notif/alerta a admin en rojo (v1 opcional).
- Auto-moderación/IA, apelaciones, verificación de edad fuerte = frentes aparte.

## Fuera de alcance (no construir aquí)

IA de detección, apelaciones, ban por IP/dispositivo, reportes anónimos, borrado masivo, verificación de edad fuerte (ID), notificaciones push a moderadores.
