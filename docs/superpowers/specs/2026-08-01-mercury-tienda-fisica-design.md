# Mercury — Tienda Física + Transferencia P2P de MeryCoin

- **Fecha:** 2026-08-01
- **Proyecto:** Mercury (`E:\Proyectos\Proyectos\Programacion\Mercury`, GitHub `JuanGomez3112/Mercury`, branch `master`)
- **Servidor dev:** Proxmox CT 106 (192.168.1.106) — `next start` :3000 tras nginx :80, PostgreSQL local, MinIO
- **Stack:** Next.js 16 (App Router) · React 19 · TS · Tailwind v4 · Prisma **6** · PostgreSQL · MinIO · zod · jose

## Objetivo

Tienda de merch físico de Mercury (vendedor único = plataforma/admin ahora; modelo listo para creadores después) con carrito, checkout, envío por zona y **pago en MeryCoin (créditos internos) o dinero real (procesador externo, scaffold)**. Panel admin para catálogo, órdenes y zonas. Más un bloque independiente: **transferencia P2P de MeryCoin entre usuarios**.

**Fuera de alcance:** procesador de pago real (solo scaffold; la integración con credenciales la hace el usuario — la IA no ejecuta cobros reales), marketplace multi-vendedor, cupones/descuentos, reseñas, tracking de envío real, analytics.

## Principios

- **Prices dobles:** `priceCredits Int` (☾, enteros) y `priceCents Int` (dinero real, centavos). Símbolo configurable `STORE_CURRENCY` (default `$`).
- **Todo cálculo de dinero/stock es server-side y atómico** (`prisma.$transaction`), nunca se confía en el cliente. Reusa el patrón probado del wallet (`transfer`/débito atómico `updateMany`).
- Reusa: `currentUser()`/`getSession()`, `prisma`, `notify` (extender tipos), `/api/upload` (bucket público), tema oscuro, glifo ☾.

---

## Modelo de datos (Prisma 6 · `prisma db push`)

```prisma
model User {
  // ... existentes ...
  isAdmin  Boolean  @default(false)

  products  Product[]  @relation("seller")
  cartItems CartItem[]
  orders    Order[]
}

model Product {
  id          String   @id @default(cuid())
  sellerId    String?  // null = Mercury oficial; luego creadores
  seller      User?    @relation("seller", fields: [sellerId], references: [id], onDelete: SetNull)
  name        String
  description String   @default("")
  images      String[] @default([])
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())

  variants ProductVariant[]

  @@index([active])
}

model ProductVariant {
  id           String  @id @default(cuid())
  productId    String
  product      Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  label        String  // ej. "M / Negro"
  priceCredits Int
  priceCents   Int
  stock        Int     @default(0)
  active       Boolean @default(true)

  cartItems  CartItem[]
  orderItems OrderItem[]

  @@index([productId])
}

model ShippingZone {
  id           String   @id @default(cuid())
  name         String
  countries    String[] @default([])
  priceCents   Int      @default(0)
  priceCredits Int      @default(0)
  isDefault    Boolean  @default(false)
  createdAt    DateTime @default(now())
}

model CartItem {
  userId    String
  variantId String
  qty       Int      @default(1)
  createdAt DateTime @default(now())

  user    User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  variant ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)

  @@id([userId, variantId])
  @@index([variantId])
}

model Order {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  status          String   // pending | paid | shipped | delivered | cancelled
  paymentMethod   String   // merycoin | external
  subtotalCents   Int
  subtotalCredits Int
  shippingCents   Int      @default(0)
  shippingCredits Int      @default(0)
  zoneId          String?
  shipName        String
  shipLine1       String
  shipLine2       String?
  shipCity        String
  shipState       String?
  shipCountry     String
  shipZip         String?
  shipPhone       String?
  createdAt       DateTime @default(now())

  items OrderItem[]

  @@index([userId, createdAt])
  @@index([status])
}

model OrderItem {
  id                    String   @id @default(cuid())
  orderId               String
  order                 Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  variantId             String?  // SetNull si se borra la variante
  variant               ProductVariant? @relation(fields: [variantId], references: [id], onDelete: SetNull)
  nameSnapshot          String
  labelSnapshot         String
  priceCentsSnapshot    Int
  priceCreditsSnapshot  Int
  qty                   Int

  @@index([orderId])
}
```

Notas: `OrderItem` guarda **snapshots** de nombre/label/precio (no cambian si luego editas el producto). `sellerId`/`seller` dejan lista la vía marketplace. `ShippingZone.isDefault` = fallback para países sin zona.

---

## Núcleo de pago (`lib/wallet.ts`, `lib/store.ts`)

**`lib/wallet.ts` — nuevos helpers:**
- `spend(tx, { userId, amount, refType, refId })` — débito **atómico** (`updateMany where balance>=amount`, si `count===0` → `InsufficientFunds`) + fila ledger `store_purchase` (delta −amount). **Sumidero**: los créditos salen de circulación (Mercury no es User, no hay contraparte).
- `transfer` gana el `kind` **"transfer"** (ledger `transfer_out`/`transfer_in`) para el bloque P2P.

**`lib/store.ts`:**
- `resolveZone(country): Promise<ShippingZone | null>` — zona cuyo `countries` incluye el país, o la `isDefault`.
- `PaymentProvider` interface: `{ name, charge(order, tx): Promise<void> }`. Provider **merycoin** (activo) usa `spend`. Provider **external** lanza `"Procesador externo no configurado"` (scaffold; se activa con credenciales + webhook del usuario).
- `checkout(userId, ship, method)` orquesta la transacción atómica (ver Bloque 5).

---

## Bloques

### Bloque 1 — Schema + rol admin
- Modelos de arriba + `User.isAdmin`. `prisma db push`.
- `lib/admin.ts`: `requireAdmin()` — `getSession()` → si no o `!isAdmin` → lanza/redirige. Guard de `/admin/*` y APIs admin.
- (El usuario activa su `isAdmin=true` en DB manualmente tras el deploy.)

### Bloque 2 — Admin catálogo (`/admin/tienda`)
- Todas las rutas/API `/admin/*` con `requireAdmin` (no admin → 403/redirect).
- **Productos:** lista; crear/editar (nombre, descripción, imágenes vía `/api/upload`, activo). `POST/PATCH /api/admin/products`, `/[id]`.
- **Variantes:** dentro del producto, añadir/editar/quitar (label, priceCredits, priceCents, stock, activo). `POST/PATCH/DELETE /api/admin/variants`.
- **Zonas:** lista + crear/editar (nombre, countries[], priceCents, priceCredits, isDefault). `POST/PATCH/DELETE /api/admin/zones`.

### Bloque 3 — Storefront
- **`/tienda`** — grid de productos `active` (imagen, nombre, "desde N ☾ / $X" = mín. de variantes activas).
- **`/tienda/[id]`** — galería, selector de variante (label + stock; agotadas deshabilitadas), precio ☾ y $, cantidad, "Añadir al carrito".

### Bloque 4 — Carrito
- `POST /api/cart` `{ variantId, qty }` → upsert `CartItem` (suma qty, tope = stock; valida variante activa). 401 sin sesión.
- `POST /api/cart/[variantId]` `{ qty }` (0 = elimina) · `DELETE`.
- **`/carrito`** — ítems (producto+variante, precio ☾ y $, stepper, quitar), subtotal en ambas monedas, "Ir a pagar".
- **Badge** de nº de ítems en el ítem "Tienda" (client, fetch `/api/cart/count` o incluido).

### Bloque 5 — Checkout + pago
- **`/carrito/pagar`** — form de dirección (nombre, línea1, línea2?, ciudad, estado?, país, CP?, teléfono?); país → zona → costo de envío; método (MeryCoin/Externo); resumen subtotal+envío=total en la moneda del método; confirmar.
- `POST /api/checkout` `{ ship_*, paymentMethod }`:
  1. Carga `CartItem` del usuario con variantes; vacío → 400.
  2. Recalcula subtotal (☾ y ¢) desde precios de DB; resuelve zona por país → shipping.
  3. `prisma.$transaction`:
     - Por ítem: `decrement stock` con guard (`updateMany where stock>=qty`); `count===0` → error "Sin stock: <producto>".
     - Si `method==="merycoin"`: `spend(total ☾)`; insuficiente → 400.
     - Si `method==="external"`: no cobra (scaffold); orden queda `pending`.
     - Crear `Order` (status `paid` si merycoin, `pending` si external) + `OrderItem[]` con snapshots.
     - Vaciar `CartItem` del usuario.
  4. `notify` al usuario (confirmación) y a admins (nueva orden). Devuelve `orderId`.
- **Externo:** tras crear la orden `pending`, la UI muestra "pago externo **próximamente**". Stock queda **reservado** en la orden pending.

### Bloque 6 — Pedidos + admin órdenes
- **`/pedidos`** (usuario) — lista con estado. **`/pedidos/[id]`** — detalle (ítems, dirección, totales, estado, timeline).
- **Admin órdenes** en `/admin/tienda`: lista (filtro por estado), detalle, cambiar estado `pending→paid→shipped→delivered|cancelled`. `POST /api/admin/orders/[id]/status`. **Cancelar** una orden con stock reservado → **restock** (incrementa stock de sus variantes) dentro de la misma transacción.

### Bloque 7 — Navegación + polish
- Ítem **"Tienda"** en `LeftPanel` menú + `LeftRail` (con badge de carrito).
- Estados vacíos (tienda sin productos, carrito vacío, sin pedidos). Notif types render (`order` / `store`).

### Bloque 8 — Transferencia P2P de MeryCoin (independiente del wallet, no de la tienda)
- `POST /api/wallet/send` `{ toUsername, amount }` → sesión→401; valida `amount` entero ≥1, receptor existe, no a ti mismo; `prisma.$transaction` con `transfer(kind:"transfer", ...)`; saldo insuficiente→400; `notify(type:"transfer")` al receptor.
- **UI** en `/cartera`: sección "Enviar MeryCoin" — `@usuario` + monto + **confirmación** (a quién/cuánto) → enviar. Aparece en historial de ambos (`transfer_out` −, `transfer_in` +) y en notificaciones del receptor.
- Sin límites diarios ni comisión (dev).

---

## Secuenciación y deploy

| # | Bloque | Schema | Depende |
|---|--------|--------|---------|
| 1 | Schema + admin | sí (muchos modelos) | — |
| 2 | Admin catálogo | — | 1 |
| 3 | Storefront | — | 1,2 |
| 4 | Carrito | — | 1,3 |
| 5 | Checkout + pago | — | 1,4 |
| 6 | Pedidos + admin órdenes | — | 5 |
| 7 | Navegación + polish | — | 3,4 |
| 8 | P2P transfer | — | — (solo wallet) |

Deploy por bloque: `mercury-deploy` (`prisma db push` incluido). Sin infra nueva. Tras el Bloque 1, el usuario pone su `isAdmin=true` en DB para usar el panel.

## Riesgos / deuda anotada

- **Pago externo real** = integración del usuario (scaffold ahora; la IA no ejecuta cobros). Órdenes `pending` externas reservan stock → restock manual del admin si no se pagan.
- **Sumidero MeryCoin** (los créditos gastados en tienda salen de circulación; sin cuenta plataforma). Si más adelante se quiere tesorería, se crea un User sistema.
- **Snapshots** en OrderItem preservan histórico aunque se editen/borren productos.
- **Concurrencia:** stock y saldo se decrementan con guards atómicos (`updateMany where ...>=`) — sin sobreventa ni saldo negativo.
- **Marketplace** de creadores = futuro (`sellerId` listo).
- Merch adulto (si aplica) + verificación de edad fuerte = fuera de alcance.

## Fuera de alcance (no construir aquí)

Procesador de pago real, marketplace multi-vendedor, cupones/descuentos, reseñas de producto, tracking de envío, analytics, wishlist.
