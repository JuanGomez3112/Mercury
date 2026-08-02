# Mercury — Marketplace C2C (cualquiera vende; pago ☾ con escrow o efectivo P2P)

- **Fecha:** 2026-08-01
- **Estado:** DISEÑO / documentado. **No implementado.** Construible (usa ☾ que ya funciona); pendiente de priorización.
- **Proyecto:** Mercury (`E:\Proyectos\Proyectos\Programacion\Mercury`).
- **Stack:** Next.js 16 · React 19 · TS · Prisma 6 · PostgreSQL · zod.

## Objetivo

Un **marketplace persona-a-persona (C2C)**: **cualquier usuario** publica anuncios de artículos, y otro usuario compra. Dos formas de pago, elegidas por las partes:
- **☾ (en plataforma):** con **escrow** — la plataforma retiene los ☾ hasta que el comprador confirma recepción (o auto-libera tras plazo sin disputa). Protege al comprador; es el valor de pagar con ☾ frente a efectivo.
- **Efectivo (fuera de plataforma):** lo negocian y liquidan comprador y vendedor **directamente**. La plataforma es solo la vitrina + el chat; **no es parte del trato**.

Distinto de la **tienda oficial** existente (`Product`/`Order`/`checkout`, envío por zonas, stock, admin): eso es venta oficial de Mercury. Este marketplace es C2C y **convive** como superficie de comercio aparte.

## Principios

- Reusa: ☾ wallet (`transfer`/`spend` atómicos), mensajería (`Message`) para contacto, sistema de reportes/moderación (extendido a `listing`), `currentUser`/`ensureNotBlocked`, tema oscuro, patrones de forms.
- **Escrow de ☾ es contable, no custodia de dinero real** mientras `launched=false` (☾ = crédito interno). Bajo riesgo ahora.
- Plataforma **no responsable** de tratos en efectivo ni de la entrega física — T&C explícitos.

## Modelo de datos

```prisma
model Listing {
  id            String   @id @default(cuid())
  sellerId      String
  seller        User     @relation("listingSeller", fields: [sellerId], references: [id], onDelete: Cascade)
  title         String
  description   String   @default("")
  images        String[] @default([])
  priceCredits  Int                  // precio en ☾ (para pago con escrow)
  acceptsCredits Boolean @default(true)
  acceptsCash   Boolean  @default(false)
  condition     String   @default("used") // new | used
  category      String   @default("otros")
  location      String   @default("")     // para efectivo/local/meetup
  status        String   @default("active") // active | sold | removed
  createdAt     DateTime @default(now())

  orders        MarketOrder[]
  @@index([status, createdAt])
  @@index([sellerId])
}

model MarketOrder {
  id          String   @id @default(cuid())
  listingId   String
  listing     Listing  @relation(fields: [listingId], references: [id], onDelete: Cascade)
  buyerId     String
  buyer       User     @relation("marketBuyer", fields: [buyerId], references: [id], onDelete: Cascade)
  sellerId    String
  seller      User     @relation("marketSeller", fields: [sellerId], references: [id], onDelete: Cascade)
  credits     Int                  // ☾ en escrow
  status      String   @default("held") // held | released | refunded | disputed
  releaseAt   DateTime             // auto-liberación si nadie disputa/confirma
  confirmedAt DateTime?
  resolvedById String?             // admin que resolvió disputa
  createdAt   DateTime @default(now())

  @@index([buyerId, status])
  @@index([sellerId, status])
  @@index([status, releaseAt])     // barrido de auto-liberación
}
```

`User` gana relaciones inversas (`listings`, `marketBuys`, `marketSales`). El sistema de **reportes** gana `targetType = "listing"` (ya es polimórfico).

**Escrow — dónde viven los ☾ retenidos:** al comprar, se **debita atómicamente** del `balance` del comprador (como `spend`, para que no los pueda doble-gastar) y quedan "en limbo" representados por `MarketOrder(held)`. No están en el balance de nadie hasta resolverse: **release** → `earnings` del vendedor; **refund** → `balance` del comprador. Un `walletTransaction` registra cada movimiento (`escrow_hold` / `escrow_release` / `escrow_refund`).

## Flujos

### Publicar anuncio
- `/market/nuevo`: título, descripción, fotos (upload existente), precio ☾, acepta ☾ / efectivo, condición, categoría, ubicación → `POST /api/market/listings` (auth + `ensureNotBlocked`) → `Listing(active)`.
- Editar/eliminar propios: `PATCH/DELETE /api/market/listings/[id]` (solo dueño).

### Comprar con ☾ (escrow)
1. `/market/[id]` → "Comprar con ☾" → `POST /api/market/listings/[id]/buy`:
   - auth + `ensureNotBlocked`; no auto-compra (comprador ≠ vendedor); listing `active` y `acceptsCredits`.
   - `$transaction`: **débito atómico** de `balance` del comprador (`balance >= priceCredits`, si no → 400 saldo insuficiente) → `MarketOrder(held, releaseAt = now + 7d)`, marca `Listing.status = sold`, ledger `escrow_hold`. Idempotencia por intento (un listing `active` solo se vende una vez: el claim de `status active→sold` atómico evita doble compra).
2. Comprador recibe el artículo → **"Confirmar recepción"** → `POST /api/market/orders/[id]/confirm` (solo comprador): `$transaction` claim `held→released`, credita `earnings` del vendedor, `escrow_release`, `confirmedAt`.
3. **Auto-liberación:** un barrido (cron/endpoint admin o lazy en carga) libera `held` con `releaseAt < now` y sin disputa → `released` + credita vendedor. (v1: endpoint `/api/market/sweep` protegido + botón admin, o chequeo perezoso.)

### Disputa / arbitraje
- Comprador o vendedor abre disputa antes de release: `POST /api/market/orders/[id]/dispute` → `held→disputed` (congela, no auto-libera).
- Admin resuelve en panel: `POST /api/admin/market/orders/[id]/resolve {action: release|refund}` (`requireAdminUnlocked`):
  - `release` → credita vendedor (`escrow_release`); `refund` → credita comprador (`escrow_refund`), `Listing` puede volver a `active`. Claim atómico, idempotente.

### Comprar en efectivo (fuera de plataforma)
- Listing con `acceptsCash`: botón "Contactar al vendedor" → abre **DM existente** (`/mensajes/[username]`). Negocian y liquidan **fuera de la plataforma**. **Sin escrow, sin registro, sin responsabilidad de la plataforma** (T&C). El listing no cambia de estado automáticamente; el vendedor lo marca `sold`/`removed` a mano.

### Moderación
- Cada listing es **reportable** (`ReportModal` con `targetType=listing`) → cola de moderación existente. Admin puede eliminar (`Listing.status=removed`).
- **Política de artículos prohibidos** (armas, drogas, ilegal, y lo que definas para contexto adulto) — documentar y aplicar en moderación.

## Páginas / componentes

- `/market` — grid de listings `active` + filtros (categoría, precio, ☾/efectivo). 
- `/market/[id]` — detalle: fotos, precio, vendedor, "Comprar con ☾" / "Contactar (efectivo)", botón reportar.
- `/market/nuevo` — form de publicación.
- `/market/mis` — mis anuncios + mis compras (con "Confirmar recepción"/"Disputar") + mis ventas.
- Admin: sección **Marketplace** en `/admin` — órdenes en disputa + resolución; listings reportados (vía moderación).

## Seguridad e integridad

- **Débito/crédito atómicos** (mismo patrón que la economía ya construida): `spend`-like al retener, claim `updateMany status:...` en cada transición (hold→released/refunded/disputed) para idempotencia y anti-carrera.
- **Un listing se vende una vez:** claim atómico `Listing status active→sold`.
- **No auto-compra**, no comprar listing propio, gate `ensureNotBlocked` (baneados no operan).
- **Auto-liberación** solo si no hay disputa y venció `releaseAt`.
- Fotos por el upload existente (validado). Reportes → moderación existente.

## Fuera de alcance (v1)

- Comisión de plataforma (hook futuro; v1 sin fee).
- Envío gestionado / etiquetas / tracking (lo arreglan las partes por DM).
- Valoraciones/reputación de vendedor (futuro).
- Escrow para pagos en efectivo (imposible — es fuera de plataforma por diseño).
- Pago con MERY on-chain (cuando exista el token; usaría el mismo ☾ tras depósito).

## Secuenciación

| # | Bloque | Depende |
|---|--------|---------|
| 1 | Schema (`Listing`, `MarketOrder`, relaciones, report `listing`) | — |
| 2 | Publicar/editar/listar anuncios + páginas `/market`, `/market/[id]`, `/market/nuevo` | 1 |
| 3 | Compra con escrow ☾ (buy/hold, confirm/release, ledger) | 1 |
| 4 | Disputa + arbitraje admin + auto-liberación | 3 |
| 5 | Efectivo vía DM (botón contactar) + T&C no-responsabilidad | 2 |
| 6 | Moderación de listings (report `listing` + retiro admin) + política prohibidos | 2, moderación existente |

## Riesgos / notas

- **Artículos prohibidos:** cualquiera vende cualquier cosa en plataforma adulta → moderación fuerte + política clara. Riesgo legal/reputacional si se lista ilegal.
- **Efectivo = fuera de control:** sin escrow ni registro; T&C de no-responsabilidad protegen a la plataforma; estafa entre partes asumida por ellas.
- **Escrow ☾:** mientras `launched=false`, ☾ no es dinero real → escrow = contabilidad interna, bajo riesgo. Al activar `launched`, el escrow retiene valor real → revisar implicaciones (retención de fondos de terceros).
