# Mercury — Contenido de Pago (wallet Merycoin off-chain + PPV + suscripción + propinas + PPV DM)

- **Fecha:** 2026-07-31
- **Proyecto:** Mercury (`E:\Proyectos\Proyectos\Programacion\Mercury`, GitHub `JuanGomez3112/Mercury`, branch `master`)
- **Servidor dev:** Proxmox CT 106 (192.168.1.106) — `next start` :3000 tras nginx :80, PostgreSQL local, MinIO
- **Stack:** Next.js 16 (App Router) · React 19 · TS · Tailwind v4 · Prisma **6** · PostgreSQL · MinIO (`@aws-sdk/client-s3`) · bcryptjs · jose · zod

## Objetivo

Monetización de contenido adulto mediante un **wallet de créditos internos ("Merycoin" off-chain)**: los usuarios gastan créditos para desbloquear contenido y suscribirse; los creadores ganan créditos. El pago con **dinero real (fiat/cripto) queda como on-ramp externo** que el usuario integra después — este spec no lo construye ni ejecuta transferencias reales.

Cinco piezas de monetización sobre un núcleo compartido (wallet + ledger + entitlement):
1. Wallet core (saldo, ledger, grant de bienvenida, recarga simulada, `/cartera`)
2. Modo creador (activación + precio de suscripción)
3. Protección de media de pago (bucket privado + proxy con verificación)
4. PPV por post (desbloqueo pagado)
5. Suscripción a creador
6. Propinas
7. PPV en mensajes directos
8. Notificaciones de pago

**Fuera de alcance:** tienda física (subsistema aparte, su propio spec), Merycoin on-chain, procesador de pagos real, verificación de edad fuerte, auto-renovación de suscripción, comisión de plataforma (solo hook), marca de agua/DRM.

## Principios

- **Créditos = enteros** (sin decimales). Precios en enteros. Glifo de crédito: **☾** (o icono `MeryCoin`).
- **Saldo nunca negativo.** Toda mutación de saldo es **atómica** vía `prisma.$transaction`: debita + acredita + escribe filas de ledger, todo o nada; el débito valida saldo suficiente dentro de la transacción.
- **El ledger es el historial**; `User.balance` es el saldo cacheado que se mueve junto con cada fila de ledger.
- Reusar patrones existentes: rutas API con `currentUser()`, notificaciones (`lib/notifications`), shaping de posts (`lib/queries`), tema oscuro.

---

## Modelo de datos (Prisma 6 · `prisma db push`)

```prisma
model User {
  // ... campos existentes ...
  balance        Int      @default(500)   // grant de bienvenida = WELCOME_CREDITS
  creatorMode    Boolean  @default(false)
  subPriceCredits Int?                     // precio suscripción mensual (créditos)

  walletTx       WalletTransaction[] @relation("wallet")
  purchases      Purchase[]          @relation("buyer")
  subsAsSub      Subscription[]      @relation("subscriber")
  subsAsCreator  Subscription[]      @relation("creator")
}

model WalletTransaction {
  id             String   @id @default(cuid())
  userId         String
  user           User     @relation("wallet", fields: [userId], references: [id], onDelete: Cascade)
  delta          Int      // +ingreso / -egreso, en créditos
  type           String   // welcome | topup | purchase | sale | tip_out | tip_in | sub_out | sub_in
  refType        String?  // post | message | subscription | null
  refId          String?
  counterpartyId String?  // el otro usuario (comprador/creador), si aplica
  createdAt      DateTime @default(now())

  @@index([userId, createdAt])
}

model Purchase {
  id           String   @id @default(cuid())
  buyerId      String
  buyer        User     @relation("buyer", fields: [buyerId], references: [id], onDelete: Cascade)
  kind         String   // post | message
  postId       String?
  messageId    String?
  priceCredits Int
  createdAt    DateTime @default(now())

  @@unique([buyerId, postId])
  @@unique([buyerId, messageId])
  @@index([postId])
  @@index([messageId])
}

model Subscription {
  id           String   @id @default(cuid())
  subscriberId String
  subscriber   User     @relation("subscriber", fields: [subscriberId], references: [id], onDelete: Cascade)
  creatorId    String
  creator      User     @relation("creator", fields: [creatorId], references: [id], onDelete: Cascade)
  expiresAt    DateTime
  priceCredits Int
  createdAt    DateTime @default(now())

  @@unique([subscriberId, creatorId])
  @@index([creatorId])
}

model Post {
  // ... existentes ...
  priceCredits Int?   // null = gratis; >0 = PPV. Media va a bucket privado.
}

model Message {
  // ... existentes ...
  priceCredits Int?   // null = gratis; >0 = PPV DM.
}
```

Nota Prisma: los dos `@@unique` en `Purchase` con columnas nullable (`postId`, `messageId`) — en Postgres un `NULL` no colisiona con otro `NULL`, así que un comprador puede tener múltiples purchases de mensajes distintos y de posts distintos sin conflicto; y no puede comprar el mismo post dos veces. Correcto para el caso.

---

## Núcleo: wallet, ledger, entitlement (`src/lib/wallet.ts`, `src/lib/entitlement.ts`)

**`lib/wallet.ts`** — constante `WELCOME_CREDITS = 500`. Funciones:
- `grantWelcome(tx, userId)` — usada en el registro: escribe fila ledger `welcome` (+500). El saldo ya arranca en 500 por el default del schema.
- `topup(userId, amount)` — recarga simulada: `$transaction` incrementa `balance` + fila `topup`.
- `transfer(tx, { fromId, toId, amount, type, refType, refId })` — helper interno reutilizado por PPV/sub/tips: valida `from.balance >= amount` (si no, lanza `InsufficientFunds`), decrementa `from`, incrementa `to`, escribe 2 filas de ledger (`*_out` en from, `*_in` en to) con `counterpartyId`. Todo dentro del `tx` que recibe.
- Errores tipados: `InsufficientFunds` → las rutas lo mapean a `400 { error: "Saldo insuficiente" }`.

**`lib/entitlement.ts`** — `hasPostAccess(viewerId, post): Promise<boolean>`:
- `post.authorId === viewerId` → true
- `post.priceCredits == null` → true (gratis)
- existe `Purchase(buyerId=viewerId, postId=post.id)` → true
- existe `Subscription(subscriberId=viewerId, creatorId=post.authorId, expiresAt > now)` → true
- si no → false

Y `hasMessageAccess(viewerId, message)`: autor (sender) o recipient que compró (`Purchase(kind=message, messageId)`), o gratis (`priceCredits==null`).

Estos helpers se usan en el proxy de media, en el shaping del feed (para marcar `locked`), en el perfil y en el lightbox.

`FeedPost` gana campos: `priceCredits: number | null`, `locked: boolean` (= `priceCredits!=null && !hasAccess`). El shaping en `lib/queries` calcula `locked` por post para el viewer (batch: precargar purchases/subs del viewer para no hacer N queries — cargar el set de postIds comprados + creatorIds suscritos del viewer una vez y resolver en memoria).

---

## Bloque 1 — Wallet core

- **Schema**: `User.balance`, `WalletTransaction`. `prisma db push`.
- **Registro** (`/api/auth/register`): tras crear el usuario, escribir fila ledger `welcome` (+500) dentro de la misma transacción de creación (o justo después). El `balance` ya es 500 por default.
- **Recarga**: `POST /api/wallet/topup` (`{ amount }`, validar 1..100000) → `topup()`. Página `/recargar` con montos rápidos (100/500/1000) + custom, banner **"Simulado — sin cobro real"**.
- **Cartera**: `/cartera` (server) — saldo grande, botón Recargar, historial (`WalletTransaction` del usuario, orden desc, con signo/tipo/contraparte legibles).
- **Saldo en header**: `TopBar` muestra "N ☾" (server pasa `balance`), clic → `/cartera`.

## Bloque 2 — Modo creador

- **Schema**: `User.creatorMode`, `User.subPriceCredits`.
- **`/ajustes`**: sección "Modo creador" (client) — activar (checkbox de términos de creador) → `POST /api/me/creator` `{ creatorMode, subPriceCredits }`. Con `creatorMode=true` se habilita fijar `subPriceCredits` (entero ≥ 1). Validación server: no permitir `creatorMode` sin aceptar términos; `subPriceCredits` requerido si es creador y va a cobrar suscripción (puede ser null si solo vende PPV/propinas).

## Bloque 3 — Protección de media de pago

- **Infra**: crear bucket privado **`mercury-paid`** en MinIO del CT 106 (sin política anonymous). Creds ya en `/etc/default/minio`, `mc` en `/usr/local/bin`.
- **`s3.ts`**: `putMedia(buf, type, prefix, opts?: { private?: boolean })`. Si `private` → sube a `mercury-paid` y devuelve URL opaca **`/api/media/<key>`** (no `/media/<key>`). Si no → bucket público como hoy. Añadir `presignGet(key, ttl=60)` con `getSignedUrl` del aws-sdk.
- **Upload** (`/api/upload`): aceptar flag `private` (form field) → pasa a `putMedia`. El composer lo activa cuando el post es de pago.
- **Proxy** `GET /api/media/[...key]`:
  1. `currentUser()` → 401 si no.
  2. Reconstruir la URL `/api/media/<key>` y localizar el `Post` (`images has url`) o `Message` (`imageUrl = url`) dueño.
  3. `hasPostAccess`/`hasMessageAccess` → sin derecho `403`.
  4. Con derecho → **302** a `presignGet(key)` (TTL 60s).
- **`PostMedia`**: si `post.locked`, no cargar la URL real — mostrar tile **borroso + candado + "Desbloquear por N ☾"**. Desbloqueado → cargar `/api/media/<key>` normal (el `<img>/<video>` sigue el 302).

## Bloque 4 — PPV por post

- **Schema**: `Post.priceCredits`.
- **Composer**: toggle **De pago** (💰) junto al 🔥 (solo si `creatorMode`); al activar, input de precio ☾. Marca la subida de media como `private`. `POST /api/posts` acepta `priceCredits`.
- **Desbloqueo**: `POST /api/posts/[id]/unlock` → si ya tiene acceso, ok idempotente; si no, `$transaction`: `transfer(from=buyer, to=author, amount=price, type='purchase'/'sale', refType='post', refId)`, crear `Purchase(kind=post)`, `notify(author, actor=buyer, type='purchase', postId)`. Saldo insuficiente → 400.
- **Shaping**: `FeedPost.priceCredits`, `FeedPost.locked`. `PostMedia` y lightbox respetan `locked`. Badge "N ☾" en el collage.

## Bloque 5 — Suscripción a creador

- **Schema**: `Subscription`.
- **Suscribir**: `POST /api/creators/[username]/subscribe` → valida que el target es `creatorMode` con `subPriceCredits`; `$transaction`: `transfer(type='sub'...)`, upsert `Subscription` (si activa, `expiresAt += 30d`; si no, `now + 30d`), `notify(type='subscribe')`. Saldo insuficiente → 400.
- **Acceso**: suscripción activa da acceso a **todos** los posts PPV del creador (ya cubierto por `hasPostAccess`).
- **UI** `/u/[username]`: si el perfil es creador → botón **"Suscribirse por N ☾/mes"**; si ya suscrito activo → badge **"Suscrito · vence dd/mm"**. Renovación manual (re-suscribir); auto-renew futuro.

## Bloque 6 — Propinas

- **Endpoint**: `POST /api/tips` `{ toUsername, postId?, amount }` → validar `amount ≥ 1`, receptor existe, no auto-propina; `$transaction`: `transfer(type='tip'...)`, `notify(type='tip')`. Sin entitlement. Cualquiera envía/recibe.
- **UI**: botón propina ☾ en `PostCard` (barra de acciones) y en `/u/[username]` → mini-modal (5/10/50/custom).

## Bloque 7 — PPV en mensajes directos

- **Schema**: `Message.priceCredits`.
- **Composer de mensaje** (creador): adjuntar media + input precio ☾. Media de pago → bucket privado. `POST /api/messages` (o `/api/messages/[username]`) acepta `priceCredits`.
- **Desbloqueo**: `POST /api/messages/[id]/unlock` → patrón PPV, `Purchase(kind=message)`, `notify(type='purchase')`.
- **UI** `ChatThread`: burbuja de pago bloqueada (candado + "Desbloquear por N ☾"); tras pagar, muestra media vía proxy.

## Bloque 8 — Notificaciones de pago

- Extender el render de notificaciones (`/notificaciones` + dropdown) para `purchase` ("X desbloqueó tu contenido"), `tip` ("X te envió N ☾"), `subscribe` ("X se suscribió a ti"). El modelo `Notification.type` ya es libre (string); solo hay que renderizar los nuevos tipos y generar sus notifs en los endpoints (bloques 4–6).

---

## Secuenciación y deploy

| # | Bloque | Schema | Infra | Depende |
|---|--------|--------|-------|---------|
| 1 | Wallet core | `User.balance`, `WalletTransaction` | — | — |
| 2 | Modo creador | `User.creatorMode`, `subPriceCredits` | — | 1 |
| 3 | Protección media | — | **bucket `mercury-paid`** | 1 |
| 4 | PPV post | `Post.priceCredits` | — | 1,3 |
| 5 | Suscripción | `Subscription` | — | 1,2,4 |
| 6 | Propinas | — | — | 1 |
| 7 | PPV DM | `Message.priceCredits` | — | 1,3 |
| 8 | Notifs | — | — | 4,5,6 |

Deploy por bloque: `ssh proxmox "pct exec 106 -- /usr/local/bin/mercury-deploy"` (git pull + npm ci + prisma db push + build + restart). El bucket `mercury-paid` se crea antes del deploy del bloque 3.

## Riesgos / deuda anotada

- **On-ramp real de créditos** (fiat/cripto) = integración externa del usuario; la recarga v1 es simulada. La IA no ejecuta transferencias de dinero real.
- **Renovación de suscripción manual** (auto-renew = futuro, requiere cobro recurrente).
- **Sin comisión de plataforma** (hook en `transfer` para % futuro).
- **Mapeo media→post por `images[] contains`** — O(1) con índice GIN opcional; `MediaAsset` (key→post/message) = optimización futura.
- **Sin marca de agua/DRM**: un comprador con acceso puede re-descargar/compartir; el gate solo impide acceso sin pagar.
- **`locked` shaping**: precargar purchases/subs del viewer una vez por request para evitar N+1.
- **Cumplimiento**: el contenido de pago intensifica la necesidad de verificación de edad fuerte + T&C + moderación (spec aparte).

## Fuera de alcance (no construir aquí)

Tienda física, Merycoin on-chain, procesador de pagos real, auto-renovación, marca de agua, verificación de edad fuerte, moderación.
