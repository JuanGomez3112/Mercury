# Mercury — Tienda Física + Economía MeryCoin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Economía MeryCoin correcta (dos-saldos gastable/ganancias, tokenomics supply+treasury, transferencia P2P, retiro con aprobación admin) + tienda de merch físico (catálogo, carrito, checkout con pago MeryCoin o externo-scaffold, panel admin).

**Architecture:** Refactor del wallet: mint desde un `TokenConfig` (supply fijo + treasury), crédito de ventas a `earnings` (retirable) vs `balance` (gastable). Todo movimiento de dinero/stock/supply es atómico (`prisma.$transaction` + guards `updateMany where ...>=`). Tienda reusa el patrón de páginas/APIs existentes; pago detrás de un provider (merycoin activo, externo scaffold).

**Tech Stack:** Next.js 16 (App Router) · React 19 · TS · Tailwind v4 · Prisma **6** · PostgreSQL · MinIO · zod · jose.

## Global Constraints

- **Prisma 6**; sin DB local → tras editar schema `npx prisma generate` SOLO (nunca `db push` local; corre en el server al deploy).
- **Dinero entero:** ☾ = `Int`; dinero real = `Int` centavos. Supply (`maxSupply`/`treasury`) = `BigInt`. Tasa `rateCents` = centavos por 1 ☾.
- **Atomicidad:** débito de saldo/earnings, decremento de stock y de treasury usan `updateMany({ where:{...gte...}, data:{decrement} })` + chequeo `count===0` → error. Nunca negativo ni sobre-emisión.
- **Ganancias retirables:** crédito de vendedor en `purchase|sub|tip` → `earnings`; P2P → `balance`. Compras/recargas/bienvenida → `mint` desde treasury.
- **Pre-lanzamiento:** `TokenConfig.launched=false` → retiros y on-ramp real deshabilitados; recarga simulada y grants funcionan.
- **La IA no ejecuta dinero real:** checkout externo y payout de retiros son scaffold/manual del admin.
- `currentUser()`/`getSession()` → `{sub,username}`; `prisma` de `@/lib/db`; `notify` de `@/lib/notifications`; `/api/upload` (bucket público) para imágenes.
- Verificación por tarea: `npx prisma generate` (si schema) → `npx tsc --noEmit` → `npm run lint` (sin errores NUEVOS en archivos tocados) → `curl` 401 en APIs cuando aplique. `npm run build` antes de deploy.
- Deploy por bloque: `ssh proxmox "pct exec 106 -- /usr/local/bin/mercury-deploy"` (confirmación del usuario). Tras Bloque 3, el usuario pone su `isAdmin=true` en DB.

## Orden de ejecución (respeta dependencias; P2P priorizado)
Bloque 1 (base) → Bloque 8 (P2P) → Bloque 9 (retiro) → Bloque 2 (admin rol) → 3 (schema tienda) → 4 (admin catálogo) → 5 (storefront) → 6 (carrito+checkout) → 7 (pedidos) → 10 (nav+polish).

---

## File Structure

**Crear:** `src/lib/token.ts`, `src/app/api/wallet/send/route.ts`, `src/app/api/wallet/withdraw/route.ts`, `src/app/api/admin/withdrawals/[id]/route.ts`, `src/lib/admin.ts`, `src/lib/store.ts`, `src/app/api/admin/{products,products/[id],variants,zones,token,orders/[id]/status}/route.ts`, `src/app/admin/tienda/**`, `src/app/tienda/{page,[id]/page}.tsx`, `src/app/api/cart/{route,[variantId]/route}.ts`, `src/app/carrito/{page,pagar/page}.tsx`, `src/app/api/checkout/route.ts`, `src/app/pedidos/{page,[id]/page}.tsx`, componentes (`SendCreditsForm`, `WithdrawForm`, `AddToCart`, `CartBadge`, admin forms).
**Modificar:** `prisma/schema.prisma`, `src/lib/wallet.ts`, `src/app/api/auth/register/route.ts`, `src/app/api/wallet/topup/route.ts`, `src/lib/notifications.ts`, `src/app/cartera/page.tsx`, `src/components/{LeftPanel,LeftRail}.tsx`, `src/app/notificaciones/page.tsx`, `src/components/NotifBell.tsx`.

---

# BLOQUE 1 — Tokenomics + dos-saldos (refactor base)

### Task 1.1: Schema — earnings, TokenConfig, Withdrawal; balance default → 0

**Files:** Modify: `prisma/schema.prisma`

- [ ] **Step 1:** En `model User` cambiar `balance Int @default(500)` a `balance Int @default(0)` y añadir:
```prisma
  earnings Int     @default(0)
  isAdmin  Boolean @default(false)
  withdrawals Withdrawal[]
```
- [ ] **Step 2:** Añadir modelos al final:
```prisma
model TokenConfig {
  id        String   @id @default("singleton")
  maxSupply BigInt   @default(1000000000)
  treasury  BigInt   @default(1000000000)
  rateCents Int      @default(100)
  launched  Boolean  @default(false)
  updatedAt DateTime @updatedAt
}

model Withdrawal {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  credits     Int
  amountCents Int
  status      String   @default("pending")
  payoutInfo  String   @default("")
  createdAt   DateTime @default(now())
  resolvedAt  DateTime?
  @@index([status])
  @@index([userId, createdAt])
}
```
- [ ] **Step 3:** `npx prisma generate` → `npx tsc --noEmit`.
- [ ] **Step 4: Commit** — `git add prisma/schema.prisma && git commit -m "feat(db): earnings, TokenConfig, Withdrawal; balance default 0"`

### Task 1.2: `lib/token.ts`

**Files:** Create: `src/lib/token.ts`
**Interfaces:** `getConfig()`, `mint(tx, userId, amount, toEarnings?)`, `burnToTreasury(tx, amount)`, `mintToEarnings(tx, userId, amount)`, `class SupplyExhausted`.

- [ ] **Step 1: Crear `src/lib/token.ts`**
```ts
import { prisma } from "./db";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export class SupplyExhausted extends Error {
  constructor() {
    super("Sin supply disponible");
    this.name = "SupplyExhausted";
  }
}

/** Carga la config del token; la crea si no existe, con treasury = maxSupply − circulante actual. */
export async function getConfig() {
  const existing = await prisma.tokenConfig.findUnique({ where: { id: "singleton" } });
  if (existing) return existing;
  const agg = await prisma.user.aggregate({ _sum: { balance: true, earnings: true } });
  const circulating = BigInt(agg._sum.balance ?? 0) + BigInt(agg._sum.earnings ?? 0);
  const maxSupply = 1000000000n;
  return prisma.tokenConfig.create({
    data: { id: "singleton", maxSupply, treasury: maxSupply - circulating },
  });
}

/** Emite `amount` ☾ del treasury al saldo del usuario (balance o earnings). Atómico. */
export async function mint(tx: Tx, userId: string, amount: number, toEarnings = false) {
  if (amount <= 0) throw new Error("Monto inválido");
  const dec = await tx.tokenConfig.updateMany({
    where: { id: "singleton", treasury: { gte: BigInt(amount) } },
    data: { treasury: { decrement: BigInt(amount) } },
  });
  if (dec.count === 0) throw new SupplyExhausted();
  await tx.user.update({
    where: { id: userId },
    data: toEarnings ? { earnings: { increment: amount } } : { balance: { increment: amount } },
  });
}

/** Devuelve `amount` ☾ al treasury (sumidero: compra tienda, retiro). Atómico. */
export async function burnToTreasury(tx: Tx, amount: number) {
  if (amount <= 0) return;
  await tx.tokenConfig.update({ where: { id: "singleton" }, data: { treasury: { increment: BigInt(amount) } } });
}
```
- [ ] **Step 2:** `npx tsc --noEmit`.
- [ ] **Step 3: Commit** — `git add src/lib/token.ts && git commit -m "feat(token): TokenConfig getConfig/mint/burnToTreasury"`

### Task 1.3: Refactor `lib/wallet.ts` (earnings + mint + spend)

**Files:** Modify: `src/lib/wallet.ts`
**Interfaces:** `transfer(tx,{...,kind:"purchase"|"sub"|"tip"|"transfer"})`; `spend(tx,{userId,amount,refType?,refId?})`; `topup(userId,amount)`; `InsufficientFunds`.

- [ ] **Step 1:** Reescribir `src/lib/wallet.ts`:
```ts
import { prisma } from "./db";
import type { Prisma } from "@prisma/client";
import { mint, burnToTreasury } from "./token";

export const WELCOME_CREDITS = 500;

export class InsufficientFunds extends Error {
  constructor() {
    super("Saldo insuficiente");
    this.name = "InsufficientFunds";
  }
}

type Tx = Prisma.TransactionClient;

/** Transferencia atómica. Ventas (purchase|sub|tip) acreditan earnings; P2P (transfer) acredita balance. */
export async function transfer(
  tx: Tx,
  args: { fromId: string; toId: string; amount: number; kind: "purchase" | "sub" | "tip" | "transfer"; refType?: string; refId?: string },
) {
  const { fromId, toId, amount, kind, refType, refId } = args;
  if (amount <= 0) throw new Error("Monto inválido");

  const debit = await tx.user.updateMany({
    where: { id: fromId, balance: { gte: amount } },
    data: { balance: { decrement: amount } },
  });
  if (debit.count === 0) throw new InsufficientFunds();

  const toEarnings = kind !== "transfer";
  await tx.user.update({
    where: { id: toId },
    data: toEarnings ? { earnings: { increment: amount } } : { balance: { increment: amount } },
  });

  const outType = kind === "purchase" ? "purchase" : kind === "sub" ? "sub_out" : kind === "tip" ? "tip_out" : "transfer_out";
  const inType = kind === "purchase" ? "sale" : kind === "sub" ? "sub_in" : kind === "tip" ? "tip_in" : "transfer_in";
  await tx.walletTransaction.create({
    data: { userId: fromId, delta: -amount, type: outType, refType: refType ?? null, refId: refId ?? null, counterpartyId: toId },
  });
  await tx.walletTransaction.create({
    data: { userId: toId, delta: amount, type: inType, refType: refType ?? null, refId: refId ?? null, counterpartyId: fromId },
  });
}

/** Gasto (sumidero de tienda): debita balance atómico + devuelve al treasury + ledger. */
export async function spend(
  tx: Tx,
  args: { userId: string; amount: number; refType?: string; refId?: string },
) {
  const { userId, amount, refType, refId } = args;
  if (amount <= 0) throw new Error("Monto inválido");
  const debit = await tx.user.updateMany({
    where: { id: userId, balance: { gte: amount } },
    data: { balance: { decrement: amount } },
  });
  if (debit.count === 0) throw new InsufficientFunds();
  await burnToTreasury(tx, amount);
  await tx.walletTransaction.create({
    data: { userId, delta: -amount, type: "store_purchase", refType: refType ?? null, refId: refId ?? null },
  });
}

/** Recarga simulada (mintea del treasury a balance). */
export async function topup(userId: string, amount: number) {
  return prisma.$transaction(async (tx) => {
    await mint(tx, userId, amount);
    await tx.walletTransaction.create({ data: { userId, delta: amount, type: "topup" } });
  });
}
```
- [ ] **Step 2:** `npx tsc --noEmit` (los callers existentes de `transfer` compilan: su `kind` sigue siendo purchase/sub/tip).
- [ ] **Step 3: Commit** — `git add src/lib/wallet.ts && git commit -m "feat(wallet): earnings vs balance, spend sumidero, topup via mint"`

### Task 1.4: Bienvenida via mint en registro

**Files:** Modify: `src/app/api/auth/register/route.ts`

- [ ] **Step 1:** En el `$transaction`, reemplazar la fila de ledger directa por mint. El bloque actual:
```ts
    const u = await tx.user.create({ data: { username, passwordHash, displayName: displayName || nombre, birthdate: new Date(birthdate), ageVerified: true } });
    await tx.walletTransaction.create({ data: { userId: u.id, delta: 500, type: "welcome" } });
    return u;
```
por:
```ts
    const u = await tx.user.create({ data: { username, passwordHash, displayName: displayName || nombre, birthdate: new Date(birthdate), ageVerified: true } });
    await mint(tx, u.id, WELCOME_CREDITS);
    await tx.walletTransaction.create({ data: { userId: u.id, delta: WELCOME_CREDITS, type: "welcome" } });
    return u;
```
Añadir imports: `import { mint } from "@/lib/token";` y `import { WELCOME_CREDITS } from "@/lib/wallet";`.
(Nota: `balance` default ahora es 0; el mint pone 500 desde treasury.)
- [ ] **Step 2:** `npx tsc --noEmit` → `npm run lint`.
- [ ] **Step 3: Commit** — `git add src/app/api/auth/register/route.ts && git commit -m "feat(wallet): bienvenida via mint (treasury→usuario)"`

---

# BLOQUE 8 — Transferencia P2P

### Task 8.1: Endpoint send + tipo notif

**Files:** Create: `src/app/api/wallet/send/route.ts`; Modify: `src/lib/notifications.ts`

- [ ] **Step 1:** En `src/lib/notifications.ts`, extender el union `NotifType` añadiendo `"transfer"` (queda `... | "purchase" | "subscribe" | "tip" | "transfer"`).
- [ ] **Step 2: Crear `src/app/api/wallet/send/route.ts`**
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { transfer, InsufficientFunds } from "@/lib/wallet";
import { notify } from "@/lib/notifications";

const schema = z.object({ toUsername: z.string().min(1), amount: z.number().int().min(1).max(1000000000) });

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const { toUsername, amount } = parsed.data;

  const to = await prisma.user.findUnique({ where: { username: toUsername }, select: { id: true } });
  if (!to) return NextResponse.json({ error: "Usuario no existe" }, { status: 404 });
  if (to.id === session.sub) return NextResponse.json({ error: "No puedes enviarte a ti mismo" }, { status: 400 });

  try {
    await prisma.$transaction(async (tx) => {
      await transfer(tx, { fromId: session.sub, toId: to.id, amount, kind: "transfer" });
    });
  } catch (e) {
    if (e instanceof InsufficientFunds) return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
    throw e;
  }
  await notify({ userId: to.id, actorId: session.sub, type: "transfer" });
  return NextResponse.json({ ok: true });
}
```
- [ ] **Step 3:** `npx tsc --noEmit` → `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/wallet/send` opcional (401).
- [ ] **Step 4: Commit** — `git add src/app/api/wallet/send/route.ts src/lib/notifications.ts && git commit -m "feat(wallet): transferencia P2P /api/wallet/send"`

### Task 8.2: UI enviar en /cartera

**Files:** Create: `src/components/SendCreditsForm.tsx`; Modify: `src/app/cartera/page.tsx`

- [ ] **Step 1: Crear `src/components/SendCreditsForm.tsx`** (form con confirmación)
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SendCreditsForm() {
  const router = useRouter();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const input = "w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-purple";

  async function send() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/wallet/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUsername: to.replace(/^@/, ""), amount: Number(amount) }),
    });
    setBusy(false); setConfirm(false);
    const d = await res.json().catch(() => ({}));
    if (res.ok) { setMsg({ ok: true, text: `Enviado ${amount} ☾ a @${to.replace(/^@/, "")}` }); setTo(""); setAmount(""); router.refresh(); }
    else setMsg({ ok: false, text: d.error ?? "Error" });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-2/50 p-6">
      <h2 className="mb-3 text-sm font-semibold text-white/70">Enviar MeryCoin</h2>
      <div className="space-y-2">
        <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="@usuario" className={input} />
        <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))} placeholder="Monto ☾" className={input} />
        {!confirm ? (
          <button onClick={() => { if (to && amount) setConfirm(true); }} className="rounded-xl bg-gradient-to-tl from-purple to-purple-soft px-5 py-2.5 text-sm font-semibold text-white">Enviar</button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/70">¿Enviar {amount} ☾ a @{to.replace(/^@/, "")}?</span>
            <button onClick={send} disabled={busy} className="rounded-xl bg-purple px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Confirmar</button>
            <button onClick={() => setConfirm(false)} className="text-sm text-white/50">Cancelar</button>
          </div>
        )}
        {msg && <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}
      </div>
    </div>
  );
}
```
- [ ] **Step 2: Editar `src/app/cartera/page.tsx`** — añadir al `label` map: `transfer_out: "Enviado", transfer_in: "Recibido", store_purchase: "Compra tienda", withdraw: "Retiro"`. Importar y renderizar `<SendCreditsForm />` entre el bloque de saldo y el historial. (Los dos saldos y el retiro se añaden en Bloque 9.)
- [ ] **Step 3:** `npx tsc --noEmit` → `npm run lint`.
- [ ] **Step 4: Commit** — `git add src/components/SendCreditsForm.tsx src/app/cartera/page.tsx && git commit -m "feat(wallet): UI enviar MeryCoin en /cartera"`

---

# BLOQUE 9 — Retiro (cash-out) + tasa + dos saldos en UI

### Task 9.1: Endpoint withdraw + admin resolve + notif

**Files:** Create: `src/app/api/wallet/withdraw/route.ts`, `src/app/api/admin/withdrawals/[id]/route.ts`; Modify: `src/lib/notifications.ts`, `src/lib/admin.ts` (creado en Bloque 2 — si aún no existe, este bloque lo crea; ver nota)

> **Nota de orden:** este bloque usa `requireAdmin()` de `lib/admin.ts` (Bloque 2). Si ejecutas Bloque 9 antes del 2, crea `lib/admin.ts` aquí con el contenido de la Task 2.1.

- [ ] **Step 1:** En `src/lib/notifications.ts`, añadir `"withdrawal"` al union `NotifType`.
- [ ] **Step 2: Crear `src/app/api/wallet/withdraw/route.ts`**
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { getConfig, burnToTreasury } from "@/lib/token";

export const MIN_WITHDRAW = 100;

const schema = z.object({ credits: z.number().int().min(1), payoutInfo: z.string().trim().min(1).max(500) });

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const { credits, payoutInfo } = parsed.data;

  const cfg = await getConfig();
  if (!cfg.launched) return NextResponse.json({ error: "Retiros no disponibles (pre-lanzamiento)" }, { status: 400 });
  if (credits < MIN_WITHDRAW) return NextResponse.json({ error: `Mínimo ${MIN_WITHDRAW} ☾` }, { status: 400 });
  const amountCents = credits * cfg.rateCents;

  try {
    await prisma.$transaction(async (tx) => {
      const debit = await tx.user.updateMany({
        where: { id: session.sub, earnings: { gte: credits } },
        data: { earnings: { decrement: credits } },
      });
      if (debit.count === 0) throw new Error("EARN");
      await burnToTreasury(tx, credits);
      await tx.walletTransaction.create({ data: { userId: session.sub, delta: -credits, type: "withdraw" } });
      await tx.withdrawal.create({ data: { userId: session.sub, credits, amountCents, payoutInfo } });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "EARN") return NextResponse.json({ error: "Ganancias insuficientes" }, { status: 400 });
    throw e;
  }
  return NextResponse.json({ ok: true });
}
```
- [ ] **Step 3: Crear `src/app/api/admin/withdrawals/[id]/route.ts`** (aprobar/rechazar)
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { mint } from "@/lib/token";
import { notify } from "@/lib/notifications";

const schema = z.object({ action: z.enum(["paid", "rejected"]) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Prohibido" }, { status: 403 });
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Inválido" }, { status: 400 });

  const w = await prisma.withdrawal.findUnique({ where: { id } });
  if (!w || w.status !== "pending") return NextResponse.json({ error: "No pendiente" }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    if (parsed.data.action === "rejected") {
      // Reembolsa: re-mintea del treasury a earnings.
      await mint(tx, w.userId, w.credits, true);
      await tx.walletTransaction.create({ data: { userId: w.userId, delta: w.credits, type: "withdraw_refund" } });
    }
    await tx.withdrawal.update({ where: { id }, data: { status: parsed.data.action, resolvedAt: new Date() } });
  });
  await notify({ userId: w.userId, actorId: w.userId, type: "withdrawal" });
  return NextResponse.json({ ok: true });
}
```
> Nota: `notify` ignora auto-notificación (userId===actorId). Para retiro, notificar al usuario del cambio: usar un actor distinto no aplica; alternativa — omitir el guard escribiendo la notif directo. Para v1, crear la notif directamente: reemplazar la línea `await notify(...)` por `await prisma.notification.create({ data: { userId: w.userId, actorId: w.userId, type: "withdrawal" } })`.
- [ ] **Step 4:** `npx tsc --noEmit` → `curl` 401/403.
- [ ] **Step 5: Commit** — `git add src/app/api/wallet/withdraw src/app/api/admin/withdrawals src/lib/notifications.ts && git commit -m "feat(wallet): retiro (cash-out) + resolución admin"`

### Task 9.2: `/cartera` dos saldos + WithdrawForm; admin retiros

**Files:** Modify: `src/app/cartera/page.tsx`; Create: `src/components/WithdrawForm.tsx`, sección admin de retiros (en `/admin/tienda` o `/admin`, ver Bloque 4).

- [ ] **Step 1: Editar `src/app/cartera/page.tsx`** — cargar `earnings` y la config (`getConfig` de `@/lib/token`) además de `balance`. Mostrar DOS tarjetas: "Gastable" (`balance ☾`) con botón Recargar, y "Ganancias" (`earnings ☾ ≈ $X` donde `X = (earnings*rateCents/100).toFixed(2)`), con `<WithdrawForm max={earnings} launched={cfg.launched} rateCents={cfg.rateCents} />`. Mantener `<SendCreditsForm />` y el historial.
- [ ] **Step 2: Crear `src/components/WithdrawForm.tsx`**
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WithdrawForm({ max, launched, rateCents }: { max: number; launched: boolean; rateCents: number }) {
  const router = useRouter();
  const [credits, setCredits] = useState<number | "">("");
  const [payout, setPayout] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const input = "w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-purple";

  if (!launched) {
    return <p className="text-xs text-white/40">Retiros disponibles al lanzamiento (pre-lanzamiento).</p>;
  }
  const cents = credits === "" ? 0 : Number(credits) * rateCents;

  async function withdraw() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/wallet/withdraw", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credits: Number(credits), payoutInfo: payout }),
    });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    if (res.ok) { setMsg({ ok: true, text: "Solicitud de retiro creada" }); setCredits(""); setPayout(""); router.refresh(); }
    else setMsg({ ok: false, text: d.error ?? "Error" });
  }

  return (
    <div className="mt-3 space-y-2">
      <input type="number" min={1} max={max} value={credits} onChange={(e) => setCredits(e.target.value === "" ? "" : Number(e.target.value))} placeholder={`Monto ☾ (máx ${max})`} className={input} />
      <input value={payout} onChange={(e) => setPayout(e.target.value)} placeholder="Datos de pago (banco, cuenta, etc.)" className={input} />
      <p className="text-xs text-white/40">Recibirás ≈ ${(cents / 100).toFixed(2)}</p>
      <button onClick={withdraw} disabled={busy || credits === "" || Number(credits) > max} className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Solicitar retiro</button>
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}
    </div>
  );
}
```
- [ ] **Step 3:** Sección **admin retiros** — en la página admin (Bloque 4), listar `prisma.withdrawal.findMany({ where:{status:"pending"}, include:{user} })` con botones que POST a `/api/admin/withdrawals/[id]` `{action:"paid"|"rejected"}` (componente client `WithdrawalRow`). Muestra usuario, ☾, monto, payoutInfo.
- [ ] **Step 4:** `npx tsc --noEmit` → `npm run lint`.
- [ ] **Step 5: Commit** — `git add src/app/cartera/page.tsx src/components/WithdrawForm.tsx && git commit -m "feat(wallet): dos saldos + retiro en /cartera"`

---

# BLOQUE 2 — Rol admin

### Task 2.1: `lib/admin.ts`

**Files:** Create: `src/lib/admin.ts`
**Interfaces:** `requireAdmin(): Promise<{ id, username } | null>` (null si no admin).

- [ ] **Step 1: Crear `src/lib/admin.ts`**
```ts
import { prisma } from "./db";
import { getSession } from "./session";

/** Devuelve el usuario si es admin, o null. Úsalo en rutas/API /admin. */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) return null;
  const u = await prisma.user.findUnique({ where: { id: session.sub }, select: { id: true, username: true, isAdmin: true } });
  if (!u?.isAdmin) return null;
  return { id: u.id, username: u.username };
}
```
- [ ] **Step 2:** `npx tsc --noEmit`.
- [ ] **Step 3: Commit** — `git add src/lib/admin.ts && git commit -m "feat(admin): requireAdmin guard"`

---

# BLOQUE 3 — Schema tienda

### Task 3.1: Modelos de tienda

**Files:** Modify: `prisma/schema.prisma`

- [ ] **Step 1:** Añadir a `model User` las relaciones: `products Product[] @relation("seller")`, `cartItems CartItem[]`, `orders Order[]`. Añadir los modelos `Product`, `ProductVariant`, `ShippingZone`, `CartItem`, `Order`, `OrderItem` **exactamente como en el spec** (`docs/superpowers/specs/2026-08-01-mercury-tienda-fisica-design.md`, sección "### Tienda").
- [ ] **Step 2:** `npx prisma generate` → `npx tsc --noEmit`.
- [ ] **Step 3: Commit** — `git add prisma/schema.prisma && git commit -m "feat(db): modelos de tienda (Product, Variant, Zone, Cart, Order, OrderItem)"`

---

# BLOQUE 4 — Admin catálogo + config token

Panel `/admin/tienda` (guard `requireAdmin` → si null, `redirect("/")` o 403). Reusa `AppShell`, `/api/upload`, patrón de forms client (`CreatorModeForm`/`RechargeForm`).

### Task 4.1: APIs admin (products, variants, zones, token, withdrawals ya en 9)

**Files:** Create: `src/app/api/admin/products/route.ts` (+`[id]`), `variants/route.ts` (+`[id]` para PATCH/DELETE), `zones/route.ts` (+`[id]`), `token/route.ts`.

- [ ] **Step 1: `products`** — `POST` crea `{ name, description?, images? }`; `PATCH /api/admin/products/[id]` edita `{ name?, description?, images?, active? }`. Cada handler: `requireAdmin()`→403; zod; `prisma.product.create/update`. (Ejemplo de patrón — replica para los demás.)
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

const schema = z.object({ name: z.string().min(1), description: z.string().default(""), images: z.array(z.string()).default([]) });

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Prohibido" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Inválido" }, { status: 400 });
  const p = await prisma.product.create({ data: { ...parsed.data, sellerId: null } });
  return NextResponse.json({ ok: true, id: p.id });
}
```
- [ ] **Step 2: `variants`** — `POST` crea `{ productId, label, priceCredits, priceCents, stock }`; `PATCH/DELETE /api/admin/variants/[id]`. Mismo patrón (requireAdmin→403, zod ints ≥0, prisma).
- [ ] **Step 3: `zones`** — `POST`/`PATCH /api/admin/zones/[id]`/`DELETE` con `{ name, countries[], priceCents, priceCredits, isDefault }`. Si `isDefault=true`, `updateMany` pone `isDefault=false` en las demás dentro de un `$transaction`.
- [ ] **Step 4: `token`** — `POST /api/admin/token` `{ rateCents?, launched? }` → `requireAdmin`→403; `prisma.tokenConfig.update({ where:{id:"singleton"}, data })`. (Crea la fila con `getConfig()` antes si hace falta.)
- [ ] **Step 5:** `npx tsc --noEmit` → `curl` 403 sin admin.
- [ ] **Step 6: Commit** — `git add src/app/api/admin && git commit -m "feat(admin): APIs catálogo (products/variants/zones) + config token"`

### Task 4.2: Páginas admin (`/admin/tienda`)

**Files:** Create: `src/app/admin/tienda/page.tsx` (+ subpáginas/tabs y componentes client de formularios).

- [ ] **Step 1: `src/app/admin/tienda/page.tsx`** (server): `const admin = await requireAdmin(); if (!admin) redirect("/");`. Renderiza `AppShell` con secciones/tabs: Productos, Órdenes, Zonas, Retiros, Token. Cada sección = lista + form client. Reusa el patrón de `CreatorModeForm.tsx` para los forms (client, fetch a las APIs, `router.refresh()`).
  - **Productos:** lista `prisma.product.findMany({ include:{variants:true} })`; form crear producto (nombre, desc, imágenes vía `/api/upload` con `fd.append("files")`); por producto, editar variantes (añadir/editar/quitar) apuntando a `/api/admin/variants`.
  - **Órdenes:** `prisma.order.findMany({ include:{items:true, user:true}, orderBy:{createdAt:"desc"} })`; filtro por estado; `OrderStatusButton` client → `/api/admin/orders/[id]/status` (Bloque 7).
  - **Zonas:** lista + form → `/api/admin/zones`.
  - **Retiros:** `prisma.withdrawal.findMany({ where:{status:"pending"}, include:{user} })` + `WithdrawalRow` (Bloque 9 Task 9.2 Step 3).
  - **Token:** muestra `getConfig()` (maxSupply, treasury, circulante=max−treasury, rateCents, launched) + form → `/api/admin/token`.
- [ ] **Step 2:** `npx tsc --noEmit` → `npm run lint`.
- [ ] **Step 3: Commit** — `git add src/app/admin && git commit -m "feat(admin): panel /admin/tienda (productos, órdenes, zonas, retiros, token)"`

---

# BLOQUE 5 — Storefront

### Task 5.1: `/tienda` grid + `/tienda/[id]` detalle + AddToCart

**Files:** Create: `src/app/tienda/page.tsx`, `src/app/tienda/[id]/page.tsx`, `src/components/AddToCart.tsx`.

- [ ] **Step 1: `src/app/tienda/page.tsx`** (server, `AppShell`): `prisma.product.findMany({ where:{active:true}, include:{variants:{where:{active:true}}} })`. Grid de cards: imagen (`images[0]`), nombre, "desde N ☾ / $X" (mín. de `priceCredits`/`priceCents` de variantes) → link a `/tienda/[id]`. Estado vacío.
- [ ] **Step 2: `src/app/tienda/[id]/page.tsx`** (server): carga el producto con variantes activas; si no existe/inactivo → `notFound()`. Galería (`images`), y un `<AddToCart variants={...} />` (client) con selector de variante (label + stock; agotada `stock<=0` deshabilitada), muestra precio ☾ y $ de la variante elegida, cantidad, botón "Añadir al carrito".
- [ ] **Step 3: `src/components/AddToCart.tsx`** (client): recibe `variants: {id,label,priceCredits,priceCents,stock}[]`; estado variante+qty; POST `/api/cart` `{variantId, qty}` → `router.refresh()` o toast "añadido". Deshabilita si sin stock.
- [ ] **Step 4:** `npx tsc --noEmit` → `npm run lint`.
- [ ] **Step 5: Commit** — `git add src/app/tienda src/components/AddToCart.tsx && git commit -m "feat(tienda): storefront grid + detalle + añadir al carrito"`

---

# BLOQUE 6 — Carrito + checkout + pago

### Task 6.1: API carrito

**Files:** Create: `src/app/api/cart/route.ts`, `src/app/api/cart/[variantId]/route.ts`.

- [ ] **Step 1: `POST /api/cart`** `{ variantId, qty }` → `currentUser`→401; carga variante (activa, con stock); `qty` clamp a `[1, stock]`; upsert `CartItem` (`@@id([userId,variantId])`) sumando qty con tope stock:
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

const schema = z.object({ variantId: z.string().min(1), qty: z.number().int().min(1).default(1) });

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Inválido" }, { status: 400 });
  const { variantId, qty } = parsed.data;
  const v = await prisma.productVariant.findUnique({ where: { id: variantId }, select: { active: true, stock: true } });
  if (!v || !v.active || v.stock <= 0) return NextResponse.json({ error: "No disponible" }, { status: 400 });
  const existing = await prisma.cartItem.findUnique({ where: { userId_variantId: { userId: session.sub, variantId } } });
  const next = Math.min((existing?.qty ?? 0) + qty, v.stock);
  await prisma.cartItem.upsert({
    where: { userId_variantId: { userId: session.sub, variantId } },
    create: { userId: session.sub, variantId, qty: next },
    update: { qty: next },
  });
  return NextResponse.json({ ok: true });
}
```
- [ ] **Step 2: `POST /api/cart/[variantId]`** `{ qty }` (0 = elimina) + `DELETE`. Fija qty con tope stock; qty≤0 → delete.
- [ ] **Step 3:** `npx tsc --noEmit` → `curl` 401.
- [ ] **Step 4: Commit** — `git add src/app/api/cart && git commit -m "feat(tienda): API carrito"`

### Task 6.2: `/carrito` + CartBadge

**Files:** Create: `src/app/carrito/page.tsx`, `src/components/CartBadge.tsx`, `src/app/api/cart/count/route.ts`.

- [ ] **Step 1: `/carrito`** (server): `prisma.cartItem.findMany({ where:{userId}, include:{variant:{include:{product:true}}} })`; lista con producto+label, precio ☾ y $, stepper (POST `/api/cart/[variantId]`), quitar; subtotal ☾ y ¢. "Ir a pagar" → `/carrito/pagar`. Vacío → estado vacío.
- [ ] **Step 2: `GET /api/cart/count`** → `{ count: sum(qty) }` del usuario. `CartBadge` (client) lo fetch-ea y muestra el número (para el ítem "Tienda" del nav, Bloque 10).
- [ ] **Step 3:** `npx tsc --noEmit` → `npm run lint`.
- [ ] **Step 4: Commit** — `git add src/app/carrito src/components/CartBadge.tsx src/app/api/cart/count && git commit -m "feat(tienda): página carrito + badge"`

### Task 6.3: `lib/store.ts` + checkout

**Files:** Create: `src/lib/store.ts`, `src/app/api/checkout/route.ts`, `src/app/carrito/pagar/page.tsx`; Modify: `src/lib/notifications.ts` (tipo `"order"`).

- [ ] **Step 1: `src/lib/store.ts`** — `resolveZone(country)`:
```ts
import { prisma } from "./db";
export async function resolveZone(country: string) {
  const byCountry = await prisma.shippingZone.findFirst({ where: { countries: { has: country } } });
  if (byCountry) return byCountry;
  return prisma.shippingZone.findFirst({ where: { isDefault: true } });
}
```
- [ ] **Step 2:** En `notifications.ts`, añadir `"order"` al union.
- [ ] **Step 3: `src/app/api/checkout/route.ts`** — la transacción atómica:
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { spend, InsufficientFunds } from "@/lib/wallet";
import { resolveZone } from "@/lib/store";
import { notify } from "@/lib/notifications";

const schema = z.object({
  paymentMethod: z.enum(["merycoin", "external"]),
  shipName: z.string().min(1), shipLine1: z.string().min(1), shipLine2: z.string().optional(),
  shipCity: z.string().min(1), shipState: z.string().optional(), shipCountry: z.string().min(1),
  shipZip: z.string().optional(), shipPhone: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const s = parsed.data;

  const items = await prisma.cartItem.findMany({ where: { userId: session.sub }, include: { variant: { include: { product: true } } } });
  if (items.length === 0) return NextResponse.json({ error: "Carrito vacío" }, { status: 400 });

  const subtotalCredits = items.reduce((a, it) => a + it.variant.priceCredits * it.qty, 0);
  const subtotalCents = items.reduce((a, it) => a + it.variant.priceCents * it.qty, 0);
  const zone = await resolveZone(s.shipCountry);
  const shippingCredits = zone?.priceCredits ?? 0;
  const shippingCents = zone?.priceCents ?? 0;

  let orderId = "";
  try {
    orderId = await prisma.$transaction(async (tx) => {
      for (const it of items) {
        const dec = await tx.productVariant.updateMany({
          where: { id: it.variantId, stock: { gte: it.qty } },
          data: { stock: { decrement: it.qty } },
        });
        if (dec.count === 0) throw new Error(`STOCK:${it.variant.product.name}`);
      }
      if (s.paymentMethod === "merycoin") {
        await spend(tx, { userId: session.sub, amount: subtotalCredits + shippingCredits, refType: "order" });
      }
      const order = await tx.order.create({
        data: {
          userId: session.sub,
          status: s.paymentMethod === "merycoin" ? "paid" : "pending",
          paymentMethod: s.paymentMethod,
          subtotalCents, subtotalCredits, shippingCents, shippingCredits, zoneId: zone?.id ?? null,
          shipName: s.shipName, shipLine1: s.shipLine1, shipLine2: s.shipLine2 ?? null,
          shipCity: s.shipCity, shipState: s.shipState ?? null, shipCountry: s.shipCountry,
          shipZip: s.shipZip ?? null, shipPhone: s.shipPhone ?? null,
          items: {
            create: items.map((it) => ({
              variantId: it.variantId,
              nameSnapshot: it.variant.product.name,
              labelSnapshot: it.variant.label,
              priceCentsSnapshot: it.variant.priceCents,
              priceCreditsSnapshot: it.variant.priceCredits,
              qty: it.qty,
            })),
          },
        },
      });
      await tx.cartItem.deleteMany({ where: { userId: session.sub } });
      return order.id;
    });
  } catch (e) {
    if (e instanceof InsufficientFunds) return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
    if (e instanceof Error && e.message.startsWith("STOCK:")) return NextResponse.json({ error: `Sin stock: ${e.message.slice(6)}` }, { status: 400 });
    throw e;
  }
  await notify({ userId: session.sub, actorId: session.sub, type: "order", postId: null });
  return NextResponse.json({ ok: true, orderId });
}
```
> `notify` con userId===actorId no escribe (guard). Para la confirmación al comprador, crear la notif directo: reemplazar por `await prisma.notification.create({ data: { userId: session.sub, actorId: session.sub, type: "order" } })`. Notificar a admins es opcional (v1: omitir o notificar a `where isAdmin`).
- [ ] **Step 4: `src/app/carrito/pagar/page.tsx`** — server carga cart + `getConfig` (para mostrar equivalencia); un componente client `CheckoutForm` con: form de dirección, selector de país que consulta la zona (o recalcula al enviar), método (MeryCoin/Externo), resumen (subtotal+envío=total en la moneda del método), confirmar → POST `/api/checkout` → redirige a `/pedidos/[orderId]`. Externo → tras crear, muestra "pago externo próximamente".
- [ ] **Step 5:** `npx tsc --noEmit` → `npm run lint` → `curl` 401 checkout.
- [ ] **Step 6: Commit** — `git add src/lib/store.ts src/app/api/checkout src/app/carrito/pagar src/lib/notifications.ts && git commit -m "feat(tienda): checkout atómico (stock+pago+orden) + pago MeryCoin/externo"`

---

# BLOQUE 7 — Pedidos + admin órdenes

### Task 7.1: `/pedidos` + `/pedidos/[id]` + estado admin

**Files:** Create: `src/app/pedidos/page.tsx`, `src/app/pedidos/[id]/page.tsx`, `src/app/api/admin/orders/[id]/status/route.ts`, `src/components/OrderStatusButton.tsx`.

- [ ] **Step 1: `/pedidos`** (server): `prisma.order.findMany({ where:{userId}, orderBy:{createdAt:"desc"} })` → lista con estado y total. `/pedidos/[id]`: detalle (ítems snapshot, dirección, totales, estado, timeline). Guard: la orden debe ser del usuario (o admin).
- [ ] **Step 2: `POST /api/admin/orders/[id]/status`** `{ status }` (`paid|shipped|delivered|cancelled`): `requireAdmin`→403. Si `cancelled` y la orden tenía stock reservado (siempre, porque el checkout decrementa) → **restock** dentro de `$transaction`:
```ts
await prisma.$transaction(async (tx) => {
  const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) throw new Error("NF");
  if (status === "cancelled" && order.status !== "cancelled") {
    for (const it of order.items) {
      if (it.variantId) await tx.productVariant.updateMany({ where: { id: it.variantId }, data: { stock: { increment: it.qty } } });
    }
  }
  await tx.order.update({ where: { id }, data: { status } });
});
```
(No re-acredita ☾ del comprador en cancelación v1 — nota de deuda; si se quiere, reembolsar a `balance`.)
- [ ] **Step 3: `OrderStatusButton`** (client) usado en el admin (Bloque 4) → POST al endpoint → `router.refresh()`.
- [ ] **Step 4:** `npx tsc --noEmit` → `npm run lint`.
- [ ] **Step 5: Commit** — `git add src/app/pedidos src/app/api/admin/orders src/components/OrderStatusButton.tsx && git commit -m "feat(tienda): pedidos usuario + gestión de estado admin (restock)"`

---

# BLOQUE 10 — Navegación + polish

### Task 10.1: Nav Tienda + badge + notifs render

**Files:** Modify: `src/components/LeftPanel.tsx`, `src/components/LeftRail.tsx`, `src/app/notificaciones/page.tsx`, `src/components/NotifBell.tsx`.

- [ ] **Step 1:** Añadir ítem **"Tienda"** (`/tienda`) al `nav` de `LeftPanel` y al `LeftRail`, con `<CartBadge />` (client) mostrando el nº de ítems.
- [ ] **Step 2:** En `notificaciones/page.tsx` y `NotifBell.tsx`, añadir verbos: `transfer: "te envió MeryCoin"`, `order: "— tu pedido"`, `withdrawal: "actualizó tu retiro"`.
- [ ] **Step 3:** `npx tsc --noEmit` → `npm run lint`.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(tienda): nav Tienda + badge carrito + notifs"`

---

## Self-Review

**Cobertura del spec:**
- Tokenomics + dos-saldos → 1.1–1.4 ✔ (TokenConfig, mint/treasury, earnings, welcome via mint, balance default 0).
- P2P → 8.1–8.2 ✔ (transfer kind "transfer" → balance).
- Retiro + tasa + dos saldos UI → 9.1–9.2 ✔ (launched gate, MIN_WITHDRAW, earnings guard, admin paid/rejected+refund).
- Rol admin → 2.1 ✔. Schema tienda → 3.1 ✔. Admin catálogo + token config → 4.1–4.2 ✔.
- Storefront → 5.1 ✔. Carrito+checkout+pago → 6.1–6.3 ✔ (stock guard, spend sumidero, externo scaffold). Pedidos+admin órdenes+restock → 7.1 ✔. Nav+notifs → 10.1 ✔.

**Consistencia de tipos:**
- `mint(tx,userId,amount,toEarnings?)`/`burnToTreasury(tx,amount)`/`SupplyExhausted` (1.2) usados por wallet (1.3), register (1.4), withdraw (9.1), admin withdrawals (9.1).
- `transfer(kind:"purchase"|"sub"|"tip"|"transfer")` (1.3) — callers existentes usan purchase/sub/tip (compilan); P2P usa transfer (8.1).
- `spend(tx,{userId,amount,refType?,refId?})` (1.3) usado por checkout (6.3).
- `requireAdmin()` (2.1) usado por 4.1, 7.2, 9.1 (admin withdrawals) — nota de orden en 9.1 si se ejecuta antes del 2.
- `resolveZone(country)` (6.3) usado por checkout. `getConfig()`/`rateCents` (1.2) por withdraw (9.1), cartera (9.2), admin token (4.1).

**Placeholders:** las tareas de UI grandes (admin 4.2, checkout page 6.3 step 4, /carrito, /pedidos) traen contrato exacto (datos, endpoints, comportamiento) + patrón a seguir (CreatorModeForm/RechargeForm/PostCard/AppShell ya en el repo); el implementador lee esos ejemplos. La lógica de dinero/stock/supply va con código completo.

**Riesgos anotados:**
- `notify` ignora auto-notificación (userId===actorId) → para order/withdrawal se crea la notif directa (indicado en 6.3 y 9.1).
- BigInt (treasury/maxSupply) nunca se envía crudo a un client component (solo `Number(max−treasury)` para mostrar circulante en admin; cabe en Number a esta escala).
- Cancelación de orden no reembolsa ☾ al comprador en v1 (deuda anotada en 7.1).
- Orden de bloques: 1 antes de 8/9; 2/3 antes de 4; el ejecutor sigue el "Orden de ejecución" del encabezado.
