# Mercury — Tienda Física + Economía MeryCoin (P2P, dos-saldos, tokenomics, retiro)

- **Fecha:** 2026-08-01
- **Proyecto:** Mercury (`E:\Proyectos\Proyectos\Programacion\Mercury`, GitHub `JuanGomez3112/Mercury`, branch `master`)
- **Servidor dev:** Proxmox CT 106 (192.168.1.106) — `next start` :3000 tras nginx :80, PostgreSQL local, MinIO
- **Stack:** Next.js 16 (App Router) · React 19 · TS · Tailwind v4 · Prisma **6** · PostgreSQL · MinIO · zod · jose

## Objetivo

Dos cosas relacionadas por el wallet:
1. **Tienda de merch físico** de Mercury (vendedor único = plataforma/admin ahora; modelo listo para creadores luego): catálogo, carrito, checkout, envío por zona, pago en **MeryCoin** o **dinero real (procesador externo, scaffold)**, panel admin.
2. **Economía MeryCoin correcta** (modelo closed-loop): transferencia **P2P**, separación **saldo gastable vs ganancias retirables**, **tokenomics** (supply fijo + treasury), y **retiro (cash-out)** de ganancias con aprobación admin. Todo en modo **pre-lanzamiento** (privado) hasta que el usuario lo active.

**Principio económico (por qué así):** emisión gratis (bienvenida/recarga simulada) + cash-out = insolvencia. Solución: solo el dinero que alguien **pagó** por algo (ganancias de ventas/subs/propinas) es **retirable**; los créditos promo son gastables pero no retirables. Supply fijo con treasury da escasez = base de valor. Mientras la recarga sea simulada (sin dinero real entrando), el admin **no aprueba retiros** (es el guardián de solvencia); el flag `launched=false` deshabilita retiros y on-ramp real.

**La IA no ejecuta movimientos de dinero real.** Construye los flujos (checkout externo, on-ramp, payout de retiros); el cobro/pago real lo hace el usuario (admin) con su procesador.

**Fuera de alcance:** procesador de pago real (scaffold), marketplace multi-vendedor, cupones, reseñas, tracking de envío, analytics, MeryCoin on-chain (ERC-20/SPL — futuro; el supply fijo migraría 1:1).

## Principios técnicos

- **Prices dobles:** `priceCredits Int` (☾ enteros) y `priceCents Int` (centavos). Símbolo `STORE_CURRENCY` (default `$`).
- **Todo cálculo de dinero/stock/supply es server-side y atómico** (`prisma.$transaction`, guards `updateMany where ...>=`). Nunca se confía en el cliente.
- Reusa: `currentUser()`/`getSession()`, `prisma`, `notify` (extender tipos), `/api/upload`, `lib/wallet.ts` (`transfer`/`InsufficientFunds`), tema oscuro, glifo ☾.

---

## Modelo de datos (Prisma 6 · `prisma db push`)

### Economía / wallet

```prisma
model User {
  // ... existentes (balance, creatorMode, etc.) ...
  earnings Int     @default(0)   // ganancias retirables (dinero que otros pagaron)
  isAdmin  Boolean @default(false)

  products    Product[]    @relation("seller")
  cartItems   CartItem[]
  orders      Order[]
  withdrawals Withdrawal[]
}

// Config singleton del token (una sola fila, id fijo "singleton").
model TokenConfig {
  id           String   @id @default("singleton")
  maxSupply    BigInt   @default(1000000000)  // tope fijo (1e9 ☾)
  treasury     BigInt   @default(1000000000)  // ☾ no emitidos; mint = treasury→usuario
  rateCents    Int      @default(100)         // centavos por 1 ☾ (default 1 ☾ = $1)
  launched     Boolean  @default(false)       // false = pre-lanzamiento (sin retiros/on-ramp real)
  updatedAt    DateTime @updatedAt
}

model Withdrawal {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  credits    Int                       // ☾ retirados de earnings
  amountCents Int                      // equivalente en dinero a la tasa del momento
  status     String   @default("pending") // pending | paid | rejected
  payoutInfo String   @default("")     // datos de pago que dejó el usuario (banco, etc.)
  createdAt  DateTime @default(now())
  resolvedAt DateTime?

  @@index([status])
  @@index([userId, createdAt])
}
```

> **Nota tokenomics:** `treasury`/`maxSupply` son `BigInt` (el supply puede ser grande). Los saldos de usuario (`balance`/`earnings`) siguen `Int` (suficiente por usuario). Circulante = `maxSupply − treasury`. Mint decrementa `treasury` e incrementa el saldo del usuario (guard `treasury ≥ monto`). Sumideros (compra tienda, retiro) devuelven ☾ al `treasury`.

### Tienda

```prisma
model Product {
  id String @id @default(cuid())
  sellerId String?  // null = Mercury oficial; luego creadores
  seller User? @relation("seller", fields: [sellerId], references: [id], onDelete: SetNull)
  name String
  description String @default("")
  images String[] @default([])
  active Boolean @default(true)
  createdAt DateTime @default(now())
  variants ProductVariant[]
  @@index([active])
}

model ProductVariant {
  id String @id @default(cuid())
  productId String
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  label String
  priceCredits Int
  priceCents Int
  stock Int @default(0)
  active Boolean @default(true)
  cartItems CartItem[]
  orderItems OrderItem[]
  @@index([productId])
}

model ShippingZone {
  id String @id @default(cuid())
  name String
  countries String[] @default([])
  priceCents Int @default(0)
  priceCredits Int @default(0)
  isDefault Boolean @default(false)
  createdAt DateTime @default(now())
}

model CartItem {
  userId String
  variantId String
  qty Int @default(1)
  createdAt DateTime @default(now())
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  variant ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)
  @@id([userId, variantId])
  @@index([variantId])
}

model Order {
  id String @id @default(cuid())
  userId String
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  status String   // pending | paid | shipped | delivered | cancelled
  paymentMethod String  // merycoin | external
  subtotalCents Int
  subtotalCredits Int
  shippingCents Int @default(0)
  shippingCredits Int @default(0)
  zoneId String?
  shipName String
  shipLine1 String
  shipLine2 String?
  shipCity String
  shipState String?
  shipCountry String
  shipZip String?
  shipPhone String?
  createdAt DateTime @default(now())
  items OrderItem[]
  @@index([userId, createdAt])
  @@index([status])
}

model OrderItem {
  id String @id @default(cuid())
  orderId String
  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)
  variantId String?
  variant ProductVariant? @relation(fields: [variantId], references: [id], onDelete: SetNull)
  nameSnapshot String
  labelSnapshot String
  priceCentsSnapshot Int
  priceCreditsSnapshot Int
  qty Int
  @@index([orderId])
}
```

---

## Núcleo (`lib/wallet.ts`, `lib/token.ts`, `lib/store.ts`, `lib/admin.ts`)

**`lib/token.ts`:**
- `getConfig()` — carga (o crea) la fila `TokenConfig` singleton.
- `mint(tx, userId, amount, toEarnings=false)` — guard `treasury ≥ amount`; `treasury -= amount`; incrementa `balance` (o `earnings` si `toEarnings`) del usuario; sin treasury suficiente → `SupplyExhausted`. Lo usan bienvenida/recarga/on-ramp.
- `burnToTreasury(tx, amount)` — devuelve ☾ al treasury (`treasury += amount`). Lo usan sumideros (compra tienda, retiro).
- `rateCents` para equivalencias.

**`lib/wallet.ts` (refactor):**
- `transfer(tx, { fromId, toId, amount, kind, ... })` — el débito atómico del emisor sigue igual (`updateMany balance>=amount`). **El crédito del receptor va a `earnings` cuando `kind ∈ {purchase, sub, tip}`** (ventas → retirable) y a **`balance` cuando `kind === "transfer"`** (P2P → gastable). Ledger `*_in`/`*_out` como antes.
- `spend(tx, { userId, amount, refType, refId })` — débito atómico de `balance` + `burnToTreasury(amount)` + ledger `store_purchase`. Sumidero de tienda.
- Nuevos `kind`: `"transfer"` (P2P). Migración: `earnings` arranca en 0 (el `balance` histórico queda gastable, no retirable — las ventas pasadas no se reclasifican).

**`lib/store.ts`:** `resolveZone(country)`, `PaymentProvider` (merycoin activo / external scaffold), `checkout(userId, ship, method)`.

**`lib/admin.ts`:** `requireAdmin()`.

---

## Bloques

### Bloque 1 — Tokenomics + dos-saldos (refactor wallet) [base]
- Schema: `User.earnings`, `TokenConfig` (con seed de la fila singleton al primer `getConfig`).
- `lib/token.ts` (`getConfig`/`mint`/`burnToTreasury`/`SupplyExhausted`).
- Refactor `lib/wallet.ts`: `transfer` credita `earnings` en `purchase|sub|tip`, `balance` en `transfer`; `spend` usa `burnToTreasury`. Registro (`welcome`) y `topup` (recarga simulada) pasan a **`mint`** (treasury→usuario) en vez de incremento directo — así el supply cuadra.
- Nota: los endpoints existentes (unlock/subscribe/tip) siguen funcionando; solo cambia a qué saldo entra el crédito del vendedor. `spend` aún no tiene callers hasta el Bloque 6 (tienda) — está listo.

### Bloque 2 — Rol admin + `requireAdmin`
- `User.isAdmin`. `lib/admin.ts` `requireAdmin()`. Guard `/admin/*`. (Usuario activa su `isAdmin` en DB tras deploy.)

### Bloque 3 — Schema tienda
- `Product`, `ProductVariant`, `ShippingZone`, `CartItem`, `Order`, `OrderItem`. `prisma db push`.

### Bloque 4 — Admin catálogo (`/admin/tienda`) + config token
- Productos: lista, crear/editar (nombre, desc, imágenes vía `/api/upload`, activo). `POST/PATCH /api/admin/products`, `/[id]`.
- Variantes: añadir/editar/quitar (label, priceCredits, priceCents, stock, activo). `POST/PATCH/DELETE /api/admin/variants`.
- Zonas: crear/editar (nombre, countries[], priceCents, priceCredits, isDefault). `POST/PATCH/DELETE /api/admin/zones`.
- **Config token** en admin: editar `rateCents`, `launched`, ver `maxSupply`/`treasury`/circulante. `POST /api/admin/token`.

### Bloque 5 — Storefront
- `/tienda` grid de productos activos (imagen, nombre, "desde N ☾ / $X").
- `/tienda/[id]` galería, selector de variante (label + stock; agotadas deshabilitadas), precio ☾ y $, cantidad, "Añadir al carrito".

### Bloque 6 — Carrito + checkout + pago
- Carrito: `POST /api/cart` (`{variantId, qty}`, upsert, tope=stock), `POST /api/cart/[variantId]` (`{qty}`, 0=quita), `DELETE`. Página `/carrito` (ítems, subtotal ☾ y $, "Ir a pagar"). Badge en ítem "Tienda".
- `/carrito/pagar`: form dirección; país→zona→envío; método (MeryCoin/Externo); resumen total en la moneda del método; confirmar.
- `POST /api/checkout` `{ ship_*, paymentMethod }`: recalcula server-side desde `CartItem`; `prisma.$transaction`: decrementa stock (guard) por ítem → si falla "Sin stock"; si `merycoin` → `spend(total ☾)`; si `external` → orden `pending` (sin cobro, scaffold); crea `Order` (+`OrderItem` snapshots); vacía carrito; `notify` usuario + admin. Externo: UI "pago externo próximamente", stock reservado.

### Bloque 7 — Pedidos + admin órdenes
- `/pedidos` (usuario) + `/pedidos/[id]` (detalle).
- Admin órdenes: lista (filtro estado), detalle, cambiar estado `pending→paid→shipped→delivered|cancelled`. Cancelar orden con stock reservado → **restock** (atómico). `POST /api/admin/orders/[id]/status`.

### Bloque 8 — Transferencia P2P de MeryCoin
- `POST /api/wallet/send` `{ toUsername, amount }` → 401/valida (entero ≥1, receptor existe, no a ti mismo); `$transaction` `transfer(kind:"transfer")` (debita `balance` emisor → credita `balance` receptor); saldo insuficiente→400; `notify(type:"transfer")`.
- UI en `/cartera`: "Enviar MeryCoin" (@usuario + monto + confirmación). Historial `transfer_out`/`transfer_in`.

### Bloque 9 — Retiro (cash-out) + tasa + equivalencia [pre-lanzamiento]
- **`/cartera` muestra dos saldos:** gastable (`balance`) y ganancias (`earnings ≈ $X` a `rateCents`). Comprar ☾ (on-ramp real) = botón scaffold "próximamente" (deshabilitado si `!launched`); recarga simulada sigue.
- **Retiro:** `POST /api/wallet/withdraw` `{ credits, payoutInfo }` → requiere `launched===true` (si no, 400 "pre-lanzamiento"); valida `credits ≥ MIN_WITHDRAW` y `earnings ≥ credits`; `$transaction`: débito atómico de `earnings` (`updateMany earnings>=`), `burnToTreasury(credits)`, crea `Withdrawal(pending, amountCents=credits*rateCents)`. UI en `/cartera`: "Retirar" (monto + datos de pago + equivalencia + confirmación).
- **Admin retiros** en `/admin`: lista de `pending` (usuario, ☾, monto, payoutInfo), acciones **Pagar** (`status=paid`, tras pagar por fuera) o **Rechazar** (`status=rejected` + **reembolsa** `earnings` + saca del treasury de nuevo, atómico). `POST /api/admin/withdrawals/[id]`.

### Bloque 10 — Navegación + polish
- Ítem "Tienda" en `LeftPanel` + `LeftRail` (badge carrito). Estados vacíos. Notif render (`transfer`, `order`/`store`, `withdrawal`).

---

## Secuenciación y deploy

| # | Bloque | Schema | Depende |
|---|--------|--------|---------|
| 1 | Tokenomics + dos-saldos | `User.earnings`, `TokenConfig` | — |
| 2 | Rol admin | `User.isAdmin` | — |
| 3 | Schema tienda | muchos modelos | — |
| 4 | Admin catálogo + config token | — | 2,3 |
| 5 | Storefront | — | 3,4 |
| 6 | Carrito + checkout + pago | — | 1,3,5 |
| 7 | Pedidos + admin órdenes | — | 6 |
| 8 | P2P transfer | — | 1 |
| 9 | Retiro + tasa | `Withdrawal` | 1,2 |
| 10 | Navegación + polish | — | 5,6,8,9 |

Orden de trabajo pedido por el usuario: **Bloque 8 (P2P) primero**, luego 1/9 (economía), luego tienda. (El plan puede reordenar respetando dependencias: 1 antes de 8/9; pero P2P se prioriza tras el refactor base.)

Deploy por bloque: `mercury-deploy` (`prisma db push`). Sin infra nueva. Tras Bloque 2/3 el usuario pone su `isAdmin=true`. `launched` arranca `false` (retiros/on-ramp real off).

## Riesgos / deuda anotada

- **Solvencia:** con recarga simulada no hay dinero real → `launched=false` bloquea retiros; el admin es guardián. No activar `launched` hasta tener on-ramp real + reserva.
- **Regulatorio (no es asesoría legal):** aceptar/retirar dinero real = transmisión de dinero / e-money → licencia + KYC/AML según jurisdicción. Fuera de alcance técnico; aviso.
- **Migración/consistencia:** el `default` de `User.balance` pasa de 500 a **0** (la bienvenida ahora **mintea** 500 del treasury en el registro, para no duplicar). Al sembrar `TokenConfig`, `treasury = maxSupply − (suma de balances+earnings existentes)` para que el circulante cuadre con lo ya emitido. `earnings` arranca 0; balance histórico queda gastable (no retirable); ventas pasadas no se reclasifican.
- **Sumidero → treasury** conserva el supply total (no se quema permanentemente; recyclable). Si se quiere deflación, cambiar `burnToTreasury` por quema real.
- **Snapshots** en OrderItem; **guards atómicos** de stock/saldo/treasury evitan sobreventa/saldo negativo/sobre-emisión.
- Marketplace de creadores, on-chain, procesador real = futuro.

## Fuera de alcance (no construir aquí)

Procesador de pago real, on-ramp real funcional, MeryCoin on-chain, marketplace multi-vendedor, cupones, reseñas, tracking de envío, analytics, KYC/AML.
