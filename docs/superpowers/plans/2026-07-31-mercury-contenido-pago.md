# Mercury — Contenido de Pago Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Monetización de contenido adulto con wallet de créditos internos ("Merycoin" off-chain): PPV por post, suscripción a creador, propinas y PPV en DMs, sobre un núcleo de wallet+ledger+entitlement, con media de pago protegida por bucket privado + proxy.

**Architecture:** Créditos enteros en `User.balance`, historial en `WalletTransaction`, mutaciones atómicas vía `prisma.$transaction`. Entitlement centralizado (`lib/entitlement`). Media de pago en bucket privado `mercury-paid`, servida por proxy `/api/media/[...key]` que verifica acceso y hace 302 a URL prefirmada. El dinero real (on-ramp) es externo; la recarga v1 es simulada.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TS · Tailwind v4 · Prisma **6** · PostgreSQL · MinIO (`@aws-sdk/client-s3`) · zod · jose.

## Global Constraints

- **Prisma 6**, NO 7. Migraciones vía `prisma db push` (en el server al deploy). **Sin DB local**: tras editar schema, correr **`npx prisma generate`** para tipos; NUNCA `prisma db push` local.
- **Créditos enteros**, sin decimales. **Saldo nunca negativo** — validar dentro del `$transaction`. Grant de bienvenida `WELCOME_CREDITS = 500`.
- Toda mutación de saldo: **atómica** (`prisma.$transaction`) — debita, acredita, escribe filas de ledger; todo o nada.
- `currentUser()` de `@/lib/auth` (`{sub,username}|null`); `getSession()` de `@/lib/session`; `prisma` de `@/lib/db`; notifs con `@/lib/notifications`.
- Sin comisión de plataforma v1 (100% al creador). Suscripción = +30 días por pago, renovación manual.
- Tema oscuro; glifo de crédito **☾**. Iconos Font Awesome por font-size.
- Verificación por tarea: `npx prisma generate` (si tocó schema) → `npx tsc --noEmit` → `npm run lint` (sin errores NUEVOS en archivos tocados; los pre-existentes en archivos ajenos no cuentan) → `curl` contra `npm run dev` para APIs (401 sin sesión). `npm run build` antes de cada deploy.
- Deploy por bloque: `ssh proxmox "pct exec 106 -- /usr/local/bin/mercury-deploy"` (no lo corre el agente sin confirmación del usuario). Bucket `mercury-paid` se crea antes del deploy del Bloque 3.

---

## File Structure

**Crear:**
- `src/lib/wallet.ts` — constantes, `topup`, `transfer`, `InsufficientFunds`
- `src/lib/entitlement.ts` — `hasPostAccess`, `hasMessageAccess`, precarga de entitlements del viewer
- `src/app/api/wallet/topup/route.ts` — recarga simulada
- `src/app/api/wallet/balance/route.ts` — saldo (para el badge del header)
- `src/components/WalletBadge.tsx` — saldo en header (client)
- `src/app/recargar/page.tsx` — página de recarga
- `src/app/cartera/page.tsx` — saldo + historial
- `src/app/api/me/creator/route.ts` — activar modo creador + precio suscripción
- `src/components/CreatorModeForm.tsx` — sección modo creador en /ajustes
- `src/app/api/media/[...key]/route.ts` — proxy de media privada
- `src/app/api/posts/[id]/unlock/route.ts` — desbloqueo PPV post
- `src/components/UnlockButton.tsx` — botón desbloquear (post/mensaje)
- `src/app/api/creators/[username]/subscribe/route.ts` — suscribir
- `src/components/SubscribeButton.tsx` — botón suscripción en perfil
- `src/app/api/tips/route.ts` — propinas
- `src/components/TipButton.tsx` — botón+modal propina
- `src/app/api/messages/[id]/unlock/route.ts` — desbloqueo PPV DM

**Modificar:**
- `prisma/schema.prisma` — `User.balance/creatorMode/subPriceCredits`, `WalletTransaction`, `Purchase`, `Subscription`, `Post.priceCredits`, `Message.priceCredits`
- `src/app/api/auth/register/route.ts` — fila ledger `welcome`
- `src/lib/notifications.ts` — tipos `purchase|tip|subscribe`
- `src/lib/s3.ts` — `putMedia` flag `private` + `presignGet`
- `src/app/api/upload/route.ts` — flag `private`
- `src/lib/types.ts` — `FeedPost.priceCredits/locked`
- `src/lib/queries.ts` — shaping `locked`/`priceCredits` (precarga entitlements)
- `src/components/TopBar.tsx` — `<WalletBadge/>`
- `src/components/PostComposer.tsx` — toggle de pago + precio + upload privado
- `src/app/api/posts/route.ts` — aceptar `priceCredits`
- `src/components/PostMedia.tsx` — media bloqueada (candado + precio) + badge
- `src/components/PostCard.tsx` — botón propina
- `src/app/u/[username]/page.tsx` — botón suscripción + propina + badge suscrito
- `src/app/ajustes/page.tsx` — `CreatorModeForm`
- `src/app/api/messages/route.ts` + `messages/[username]/route.ts` — `priceCredits`
- `src/components/ChatThread.tsx` — burbuja de pago bloqueada
- `src/app/notificaciones/page.tsx` — verbos `purchase|tip|subscribe`

---

# BLOQUE 1 — Wallet core

### Task 1.1: Schema wallet + ledger

**Files:** Modify: `prisma/schema.prisma`

- [ ] **Step 1: Añadir a `model User`** (entre los campos):
```prisma
  balance         Int      @default(500)
  creatorMode     Boolean  @default(false)
  subPriceCredits Int?
```
y en sus relaciones:
```prisma
  walletTx      WalletTransaction[] @relation("wallet")
  purchases     Purchase[]          @relation("buyer")
  subsAsSub     Subscription[]      @relation("subscriber")
  subsAsCreator Subscription[]      @relation("creator")
```

- [ ] **Step 2: Añadir modelos** al final del archivo:
```prisma
model WalletTransaction {
  id             String   @id @default(cuid())
  userId         String
  user           User     @relation("wallet", fields: [userId], references: [id], onDelete: Cascade)
  delta          Int
  type           String   // welcome | topup | purchase | sale | tip_out | tip_in | sub_out | sub_in
  refType        String?
  refId          String?
  counterpartyId String?
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
```

- [ ] **Step 3:** `npx prisma generate` (NO db push) → `npx tsc --noEmit`.
- [ ] **Step 4: Commit** — `git add prisma/schema.prisma && git commit -m "feat(db): wallet, ledger, purchase, subscription models"`

### Task 1.2: `lib/wallet.ts`

**Files:** Create: `src/lib/wallet.ts`

**Interfaces:**
- Produces: `WELCOME_CREDITS`; `class InsufficientFunds extends Error`; `topup(userId, amount)`; `transfer(tx, args)` donde `tx` es el cliente de `prisma.$transaction`.

- [ ] **Step 1: Crear `src/lib/wallet.ts`**
```ts
import { prisma } from "./db";
import type { Prisma } from "@prisma/client";

export const WELCOME_CREDITS = 500;

export class InsufficientFunds extends Error {
  constructor() {
    super("Saldo insuficiente");
    this.name = "InsufficientFunds";
  }
}

type Tx = Prisma.TransactionClient;

/** Transferencia atómica entre dos usuarios. Debe correr dentro de un $transaction. */
export async function transfer(
  tx: Tx,
  args: { fromId: string; toId: string; amount: number; kind: "purchase" | "sub" | "tip"; refType?: string; refId?: string },
) {
  const { fromId, toId, amount, kind, refType, refId } = args;
  if (amount <= 0) throw new Error("Monto inválido");

  const from = await tx.user.findUnique({ where: { id: fromId }, select: { balance: true } });
  if (!from || from.balance < amount) throw new InsufficientFunds();

  await tx.user.update({ where: { id: fromId }, data: { balance: { decrement: amount } } });
  await tx.user.update({ where: { id: toId }, data: { balance: { increment: amount } } });

  const outType = kind === "purchase" ? "purchase" : kind === "sub" ? "sub_out" : "tip_out";
  const inType = kind === "purchase" ? "sale" : kind === "sub" ? "sub_in" : "tip_in";
  await tx.walletTransaction.create({
    data: { userId: fromId, delta: -amount, type: outType, refType: refType ?? null, refId: refId ?? null, counterpartyId: toId },
  });
  await tx.walletTransaction.create({
    data: { userId: toId, delta: amount, type: inType, refType: refType ?? null, refId: refId ?? null, counterpartyId: fromId },
  });
}

/** Recarga simulada (sin cobro real). */
export async function topup(userId: string, amount: number) {
  return prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { balance: { increment: amount } } });
    await tx.walletTransaction.create({ data: { userId, delta: amount, type: "topup" } });
  });
}
```

- [ ] **Step 2:** `npx tsc --noEmit`.
- [ ] **Step 3: Commit** — `git add src/lib/wallet.ts && git commit -m "feat(wallet): transfer/topup helpers + InsufficientFunds"`

### Task 1.3: Grant de bienvenida en registro

**Files:** Modify: `src/app/api/auth/register/route.ts`

- [ ] **Step 1:** Reemplazar la creación del usuario por una transacción que crea el usuario y su fila de ledger `welcome`. El bloque actual:
```ts
  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      displayName: displayName || nombre,
      birthdate: new Date(birthdate),
      ageVerified: true,
    },
  });
```
por:
```ts
  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        username,
        passwordHash,
        displayName: displayName || nombre,
        birthdate: new Date(birthdate),
        ageVerified: true,
      },
    });
    await tx.walletTransaction.create({ data: { userId: u.id, delta: 500, type: "welcome" } });
    return u;
  });
```
(El `balance` ya arranca en 500 por el default; esta fila registra el grant en el ledger.)

- [ ] **Step 2:** `npx tsc --noEmit` → `npm run lint`.
- [ ] **Step 3: Commit** — `git add src/app/api/auth/register/route.ts && git commit -m "feat(wallet): fila ledger welcome al registrar"`

### Task 1.4: Recarga (endpoint + página) y saldo API

**Files:** Create: `src/app/api/wallet/topup/route.ts`, `src/app/api/wallet/balance/route.ts`, `src/app/recargar/page.tsx`

- [ ] **Step 1: `src/app/api/wallet/topup/route.ts`**
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { topup } from "@/lib/wallet";

const schema = z.object({ amount: z.number().int().min(1).max(100000) });

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
  await topup(session.sub, parsed.data.amount);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: `src/app/api/wallet/balance/route.ts`**
```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

export async function GET() {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { balance: true } });
  return NextResponse.json({ balance: me?.balance ?? 0 });
}
```

- [ ] **Step 3: `src/app/recargar/page.tsx`** (client para los botones; usa AppShell requiere datos server → hacemos una page server que renderiza un client `RechargeForm`). Para simplicidad, crear la page como server que envuelve un form client inline vía un componente. Implementación: página server + componente client dentro del mismo archivo NO (server/client separado). Crear `src/app/recargar/page.tsx` (server) que renderiza AppShell + un componente client `RechargeForm`. Como el form es pequeño, crearlo como archivo aparte:

`src/components/RechargeForm.tsx`:
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RechargeForm() {
  const router = useRouter();
  const [amount, setAmount] = useState(500);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function recharge(a: number) {
    setBusy(true); setMsg("");
    const res = await fetch("/api/wallet/topup", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: a }),
    });
    setBusy(false);
    if (res.ok) { setMsg(`+${a} ☾ acreditados`); router.refresh(); }
    else setMsg("Error");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-center text-xs text-orange-300">
        Simulado — sin cobro real. Aquí se integrará el pago real más adelante.
      </div>
      <div className="flex gap-2">
        {[100, 500, 1000].map((a) => (
          <button key={a} onClick={() => recharge(a)} disabled={busy} className="flex-1 rounded-xl bg-gradient-to-tl from-purple to-purple-soft py-3 text-sm font-semibold text-white disabled:opacity-50">
            {a} ☾
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="flex-1 rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white outline-none focus:border-purple" />
        <button onClick={() => recharge(amount)} disabled={busy} className="rounded-xl bg-purple px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Recargar</button>
      </div>
      {msg && <p className="text-center text-sm text-emerald-400">{msg}</p>}
    </div>
  );
}
```
`src/app/recargar/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import RechargeForm from "@/components/RechargeForm";

export const dynamic = "force-dynamic";

export default async function RecargarPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { username: true, avatarUrl: true, balance: true } });
  if (!me) redirect("/login");
  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl}>
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-xl font-semibold text-white">Recargar créditos</h1>
        <p className="text-sm text-white/50">Saldo actual: <b className="text-white">{me.balance} ☾</b></p>
        <RechargeForm />
      </div>
    </AppShell>
  );
}
```
(Nota: si `AppShell` no acepta estos props, ajústalo al patrón real — mira `src/app/guardados/page.tsx` como referencia de uso de AppShell.)

- [ ] **Step 4:** `npx tsc --noEmit` → `npm run lint` → `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/wallet/topup -H "Content-Type: application/json" -d '{"amount":100}'` → espera `401` sin sesión.
- [ ] **Step 5: Commit** — `git add src/app/api/wallet src/app/recargar src/components/RechargeForm.tsx && git commit -m "feat(wallet): recarga simulada + saldo API"`

### Task 1.5: `/cartera` (historial) + `WalletBadge` en header

**Files:** Create: `src/app/cartera/page.tsx`, `src/components/WalletBadge.tsx`; Modify: `src/components/TopBar.tsx`

- [ ] **Step 1: `src/app/cartera/page.tsx`**
```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import { timeAgo } from "@/lib/time";

export const dynamic = "force-dynamic";

const label: Record<string, string> = {
  welcome: "Bienvenida", topup: "Recarga", purchase: "Compra", sale: "Venta",
  tip_out: "Propina enviada", tip_in: "Propina recibida", sub_out: "Suscripción", sub_in: "Suscriptor",
};

export default async function CarteraPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { username: true, avatarUrl: true, balance: true } });
  if (!me) redirect("/login");
  const tx = await prisma.walletTransaction.findMany({ where: { userId: session.sub }, orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl}>
      <div className="space-y-5">
        <div className="rounded-2xl border border-white/10 bg-navy-2/50 p-8 text-center">
          <p className="text-sm text-white/50">Saldo</p>
          <p className="my-1 text-4xl font-bold text-white">{me.balance} ☾</p>
          <Link href="/recargar" className="mt-2 inline-block rounded-xl bg-gradient-to-tl from-purple to-purple-soft px-5 py-2.5 text-sm font-semibold text-white">Recargar</Link>
        </div>
        <div className="rounded-2xl border border-white/10 bg-navy-2/50">
          <h2 className="border-b border-white/10 p-4 text-sm font-semibold text-white/70">Historial</h2>
          {tx.length === 0 ? (
            <p className="p-8 text-center text-sm text-white/40">Sin movimientos.</p>
          ) : tx.map((t) => (
            <div key={t.id} className="flex items-center justify-between border-b border-white/5 px-4 py-3 last:border-0">
              <div>
                <div className="text-sm text-white/80">{label[t.type] ?? t.type}</div>
                <div className="text-xs text-white/40">{timeAgo(t.createdAt)}</div>
              </div>
              <div className={`text-sm font-semibold ${t.delta >= 0 ? "text-emerald-400" : "text-white/60"}`}>{t.delta >= 0 ? "+" : ""}{t.delta} ☾</div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: `src/components/WalletBadge.tsx`**
```tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function WalletBadge() {
  const [balance, setBalance] = useState<number | null>(null);
  useEffect(() => {
    let ignore = false;
    fetch("/api/wallet/balance").then((r) => r.ok ? r.json() : null).then((d) => { if (!ignore && d) setBalance(d.balance); });
    return () => { ignore = true; };
  }, []);
  return (
    <Link href="/cartera" className="flex h-9 items-center gap-1.5 rounded-full bg-purple/15 px-3 text-sm font-semibold text-purple transition hover:bg-purple/25" aria-label="Cartera">
      <span>{balance ?? "—"}</span><span>☾</span>
    </Link>
  );
}
```

- [ ] **Step 3: Montar en `src/components/TopBar.tsx`** — importar `import WalletBadge from "./WalletBadge";` y renderizarlo dentro del cluster de acciones (junto a `NotifBell`/`InboxLink`, antes de `ProfileMenu`). Añadir `<WalletBadge />` en el `div` de iconos.

- [ ] **Step 4:** `npx tsc --noEmit` → `npm run lint`.
- [ ] **Step 5: Commit** — `git add src/app/cartera src/components/WalletBadge.tsx src/components/TopBar.tsx && git commit -m "feat(wallet): /cartera con historial + saldo en header"`
- [ ] **Step 6: (opcional) deploy Bloque 1.**

---

# BLOQUE 2 — Modo creador

### Task 2.1: Endpoint + form modo creador

**Files:** Create: `src/app/api/me/creator/route.ts`, `src/components/CreatorModeForm.tsx`; Modify: `src/app/ajustes/page.tsx`

- [ ] **Step 1: `src/app/api/me/creator/route.ts`**
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

const schema = z.object({
  creatorMode: z.boolean(),
  subPriceCredits: z.number().int().min(1).max(100000).nullable().optional(),
});

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const { creatorMode, subPriceCredits } = parsed.data;
  await prisma.user.update({
    where: { id: session.sub },
    data: { creatorMode, subPriceCredits: creatorMode ? (subPriceCredits ?? null) : null },
  });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: `src/components/CreatorModeForm.tsx`**
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatorModeForm({ initialMode, initialPrice }: { initialMode: boolean; initialPrice: number | null }) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [price, setPrice] = useState<number | "">(initialPrice ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setBusy(true); setMsg("");
    const res = await fetch("/api/me/creator", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creatorMode: mode, subPriceCredits: mode && price !== "" ? Number(price) : null }),
    });
    setBusy(false);
    if (res.ok) { setMsg("Guardado"); router.refresh(); } else setMsg("Error");
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-white/70">Modo creador</h2>
      <label className="flex items-center gap-3 text-sm text-white/80">
        <input type="checkbox" checked={mode} onChange={(e) => setMode(e.target.checked)} className="h-4 w-4 accent-purple" />
        Activar modo creador (acepto los términos de creador)
      </label>
      {mode && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/60">Suscripción mensual:</span>
          <input type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))} placeholder="precio ☾" className="w-32 rounded-xl border border-white/10 bg-navy px-3 py-2 text-sm text-white outline-none focus:border-purple" />
          <span className="text-sm text-white/60">☾ / mes</span>
        </div>
      )}
      <button onClick={save} disabled={busy} className="rounded-xl bg-gradient-to-tl from-purple to-purple-soft px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Guardando…" : "Guardar"}</button>
      {msg && <p className="text-sm text-emerald-400">{msg}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Montar en `src/app/ajustes/page.tsx`** — añadir `creatorMode: true, subPriceCredits: true` al select de `me`; import `CreatorModeForm`; añadir sección:
```tsx
        <section className="rounded-2xl border border-white/10 bg-navy-2/50 p-6">
          <CreatorModeForm initialMode={me.creatorMode} initialPrice={me.subPriceCredits} />
        </section>
```

- [ ] **Step 4:** `npx tsc --noEmit` → `npm run lint` → `curl` 401.
- [ ] **Step 5: Commit** — `git add src/app/api/me/creator src/components/CreatorModeForm.tsx src/app/ajustes/page.tsx && git commit -m "feat(creator): modo creador + precio de suscripción en ajustes"`

---

# BLOQUE 3 — Protección de media de pago

### Task 3.1: `s3.ts` bucket privado + presign; upload flag

**Files:** Modify: `src/lib/s3.ts`, `src/app/api/upload/route.ts`

**Interfaces:**
- Produces: `putMedia(buf, type, prefix, opts?: { private?: boolean })`; `presignGet(key: string, ttl?: number): Promise<string>`; `PAID_BUCKET`.

- [ ] **Step 1: Editar `src/lib/s3.ts`** — añadir import de `GetObjectCommand` y `getSignedUrl`:
```ts
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
```
(Si `@aws-sdk/s3-request-presigner` no está instalado, instalarlo: `npm i @aws-sdk/s3-request-presigner` — es parte del stack aws-sdk v3.)
Añadir constante bucket privado y variable base del proxy:
```ts
const paidBucket = process.env.S3_PAID_BUCKET ?? "mercury-paid";
export const PAID_BUCKET = paidBucket;
```
Cambiar `putMedia` para aceptar opciones y enrutar bucket + URL:
```ts
export async function putMedia(
  buf: Buffer,
  contentType: string,
  prefix: string,
  opts?: { private?: boolean },
): Promise<string> {
  const ext = extFor(contentType) ?? "bin";
  const key = `${prefix}/${randomUUID()}.${ext}`;
  const isPrivate = opts?.private === true;
  await s3.send(new PutObjectCommand({
    Bucket: isPrivate ? paidBucket : bucket,
    Key: key,
    Body: buf,
    ContentType: contentType,
  }));
  return isPrivate ? `/api/media/${key}` : `${publicBase}/${key}`;
}
```
Añadir presign:
```ts
export async function presignGet(key: string, ttl = 60): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: paidBucket, Key: key }), { expiresIn: ttl });
}
```

- [ ] **Step 2: Editar `src/app/api/upload/route.ts`** — leer un flag `private` del form y pasarlo. Tras `const files = form.getAll("files")...`:
```ts
  const isPrivate = form.get("private") === "1";
```
y en el push:
```ts
    urls.push(await putMedia(buf, file.type, session.sub, { private: isPrivate }));
```

- [ ] **Step 3:** `npx tsc --noEmit` (instalar presigner si falta) → `npm run lint`.
- [ ] **Step 4: Commit** — `git add src/lib/s3.ts src/app/api/upload/route.ts package.json package-lock.json && git commit -m "feat(media): bucket privado + presignGet + upload private flag"`

### Task 3.2: `lib/entitlement.ts`

**Files:** Create: `src/lib/entitlement.ts`

**Interfaces:**
- Produces:
  - `hasPostAccess(viewerId: string, post: { authorId: string; priceCredits: number | null; id: string }): Promise<boolean>`
  - `hasMessageAccess(viewerId: string, message: { senderId: string; recipientId: string; priceCredits: number | null; id: string }): Promise<boolean>`
  - `loadViewerEntitlements(viewerId, postIds, creatorIds): Promise<{ purchasedPosts: Set<string>; activeSubs: Set<string> }>` (precarga para el shaping del feed)

- [ ] **Step 1: Crear `src/lib/entitlement.ts`**
```ts
import { prisma } from "./db";

export async function hasPostAccess(
  viewerId: string,
  post: { authorId: string; priceCredits: number | null; id: string },
): Promise<boolean> {
  if (post.authorId === viewerId) return true;
  if (post.priceCredits == null) return true;
  const bought = await prisma.purchase.findUnique({ where: { buyerId_postId: { buyerId: viewerId, postId: post.id } } });
  if (bought) return true;
  const sub = await prisma.subscription.findUnique({ where: { subscriberId_creatorId: { subscriberId: viewerId, creatorId: post.authorId } } });
  return !!sub && sub.expiresAt > new Date();
}

export async function hasMessageAccess(
  viewerId: string,
  message: { senderId: string; recipientId: string; priceCredits: number | null; id: string },
): Promise<boolean> {
  if (message.senderId === viewerId) return true;
  if (message.priceCredits == null) return true;
  const bought = await prisma.purchase.findUnique({ where: { buyerId_messageId: { buyerId: viewerId, messageId: message.id } } });
  return !!bought;
}

/** Precarga para shaping de feed: qué posts compró y a qué creadores está suscrito (activo) el viewer. */
export async function loadViewerEntitlements(viewerId: string, postIds: string[], creatorIds: string[]) {
  const [purchases, subs] = await Promise.all([
    prisma.purchase.findMany({ where: { buyerId: viewerId, postId: { in: postIds } }, select: { postId: true } }),
    prisma.subscription.findMany({ where: { subscriberId: viewerId, creatorId: { in: creatorIds }, expiresAt: { gt: new Date() } }, select: { creatorId: true } }),
  ]);
  return {
    purchasedPosts: new Set(purchases.map((p) => p.postId!).filter(Boolean)),
    activeSubs: new Set(subs.map((s) => s.creatorId)),
  };
}
```
(Nota: las claves compuestas `buyerId_postId` y `subscriberId_creatorId` provienen de los `@@unique` del schema.)

- [ ] **Step 2:** `npx tsc --noEmit`.
- [ ] **Step 3: Commit** — `git add src/lib/entitlement.ts && git commit -m "feat(entitlement): acceso a post/mensaje + precarga viewer"`

### Task 3.3: Proxy `/api/media/[...key]`

**Files:** Create: `src/app/api/media/[...key]/route.ts`

- [ ] **Step 1: Crear `src/app/api/media/[...key]/route.ts`**
```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { hasPostAccess, hasMessageAccess } from "@/lib/entitlement";
import { presignGet } from "@/lib/s3";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { key: parts } = await params;
  const key = parts.join("/");
  const url = `/api/media/${key}`;

  // ¿A qué post pertenece?
  const post = await prisma.post.findFirst({
    where: { images: { has: url } },
    select: { id: true, authorId: true, priceCredits: true },
  });
  if (post) {
    if (!(await hasPostAccess(session.sub, post))) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    return NextResponse.redirect(await presignGet(key));
  }

  // ¿A qué mensaje?
  const msg = await prisma.message.findFirst({
    where: { imageUrl: url },
    select: { id: true, senderId: true, recipientId: true, priceCredits: true },
  });
  if (msg) {
    if (msg.recipientId !== session.sub && msg.senderId !== session.sub) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    if (!(await hasMessageAccess(session.sub, msg))) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    return NextResponse.redirect(await presignGet(key));
  }

  return NextResponse.json({ error: "No encontrado" }, { status: 404 });
}
```

- [ ] **Step 2:** `npx tsc --noEmit` → `npm run lint`.
- [ ] **Step 3: Commit** — `git add "src/app/api/media/[...key]/route.ts" && git commit -m "feat(media): proxy con verificación de acceso + 302 prefirmada"`

### Task 3.4: Crear bucket privado (infra) — antes del deploy del Bloque 3

**Files:** Infra CT 106 (fuera del repo).

- [ ] **Step 1:** Crear bucket privado en MinIO:
```bash
ssh proxmox "pct exec 106 -- bash -lc 'source /etc/default/minio; mc mb --ignore-existing local/mercury-paid; mc anonymous set none local/mercury-paid; mc ls local/'"
```
Expected: bucket `mercury-paid` creado y sin acceso anónimo. (Ajustar alias `local` al configurado en `mc`.)
- [ ] **Step 2:** Añadir `S3_PAID_BUCKET=mercury-paid` a `/opt/mercury/.env` si se desea override (opcional; el default ya es `mercury-paid`).
- [ ] **Step 3:** `npm run build` local → deploy con confirmación del usuario.

---

# BLOQUE 4 — PPV por post

### Task 4.1: Post.priceCredits + shaping locked

**Files:** Modify: `prisma/schema.prisma`, `src/lib/types.ts`, `src/lib/queries.ts`

- [ ] **Step 1:** En `model Post` añadir: `priceCredits Int?`. Correr `npx prisma generate`.
- [ ] **Step 2:** En `src/lib/types.ts`, `FeedPost` añadir tras `savedByMe`:
```ts
  priceCredits: number | null;
  locked: boolean;
```
- [ ] **Step 3:** En `src/lib/queries.ts`:
  - En `Row`, añadir `priceCredits: number | null;`.
  - En `include`, no hace falta cambiar (priceCredits es campo escalar; ya viene).
  - Cambiar `toFeedPost` para aceptar el set de entitlements y calcular `locked`. Como `toFeedPost` es síncrona y se llama por post, refactor: tras obtener `posts`, precargar entitlements con `loadViewerEntitlements(viewerId, postIds, authorIds)` y pasar los sets a `toFeedPost`. Modificar la firma:
```ts
function toFeedPost(
  p: Row,
  viewerId: string,
  ent?: { purchasedPosts: Set<string>; activeSubs: Set<string> },
): FeedPost {
  const priceCredits = p.priceCredits;
  const access =
    p.authorId === viewerId ||
    priceCredits == null ||
    (ent ? ent.purchasedPosts.has(p.id) || ent.activeSubs.has(p.authorId) : false);
  return {
    // ... campos existentes ...
    priceCredits,
    locked: priceCredits != null && !access,
  };
}
```
  - En cada función que mapea posts (`getFeedByTab`, `getUserPosts`, `getSavedPosts`, `getFeedPostsByWhere`), antes del `.map`, precargar:
```ts
import { loadViewerEntitlements } from "./entitlement";
// ...
  const ent = await loadViewerEntitlements(viewerId, posts.map((p) => p.id), posts.map((p) => p.authorId));
  return posts.map((p) => toFeedPost(p as Row, viewerId, ent));
```
  (Aplicar el mismo patrón en las 4 funciones. `getSavedPosts` mapea `b.post`; ajustar el arreglo de ids en consecuencia.)

- [ ] **Step 4:** `npx prisma generate` → `npx tsc --noEmit` → `npm run lint`.
- [ ] **Step 5: Commit** — `git add prisma/schema.prisma src/lib/types.ts src/lib/queries.ts && git commit -m "feat(ppv): Post.priceCredits + shaping locked"`

### Task 4.2: Endpoint unlock + composer de pago + create post

**Files:** Create: `src/app/api/posts/[id]/unlock/route.ts`; Modify: `src/app/api/posts/route.ts`, `src/components/PostComposer.tsx`

- [ ] **Step 1: `src/app/api/posts/[id]/unlock/route.ts`**
```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { transfer, InsufficientFunds } from "@/lib/wallet";
import { hasPostAccess } from "@/lib/entitlement";
import { notify } from "@/lib/notifications";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id: postId } = await params;

  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true, authorId: true, priceCredits: true } });
  if (!post) return NextResponse.json({ error: "No existe" }, { status: 404 });
  if (post.priceCredits == null) return NextResponse.json({ ok: true, already: true });
  if (await hasPostAccess(session.sub, post)) return NextResponse.json({ ok: true, already: true });

  try {
    await prisma.$transaction(async (tx) => {
      await transfer(tx, { fromId: session.sub, toId: post.authorId, amount: post.priceCredits!, kind: "purchase", refType: "post", refId: post.id });
      await tx.purchase.create({ data: { buyerId: session.sub, kind: "post", postId: post.id, priceCredits: post.priceCredits! } });
    });
  } catch (e) {
    if (e instanceof InsufficientFunds) return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
    throw e;
  }
  await notify({ userId: post.authorId, actorId: session.sub, type: "purchase", postId: post.id });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Editar `src/app/api/posts/route.ts`** — aceptar `priceCredits`. En el schema zod añadir `priceCredits: z.number().int().min(1).max(100000).nullable().default(null),` y en `data` del create añadir `priceCredits`. Validar server-side: si `priceCredits != null`, el autor debe tener `creatorMode` (consultar `prisma.user.findUnique(...creatorMode)`; si no, 403 "Activa modo creador").

- [ ] **Step 3: Editar `src/components/PostComposer.tsx`** — añadir estado `paid` (bool) y `price` (number|""), recibir prop `creatorMode: boolean`. Añadir un botón/toggle "De pago" (💰) junto al 🔥 solo si `creatorMode`; al activar, mostrar input de precio. En `submit`: si `paid`, subir la media con `private` (añadir `fd.append("private","1")` en el FormData del upload) y enviar `priceCredits: paid && price!=="" ? Number(price) : null` en el body de `/api/posts`. Reset tras publicar. (El feed page que renderiza `PostComposer` debe pasar `creatorMode` — añadir `creatorMode: true` al select `me` en `src/app/feed/page.tsx` y pasar `creatorMode={me.creatorMode}`.)

- [ ] **Step 4:** `npx tsc --noEmit` → `npm run lint` → `curl` 401 unlock.
- [ ] **Step 5: Commit** — `git add "src/app/api/posts/[id]/unlock/route.ts" src/app/api/posts/route.ts src/components/PostComposer.tsx src/app/feed/page.tsx && git commit -m "feat(ppv): unlock endpoint + composer de pago (media privada)"`

### Task 4.3: PostMedia bloqueada + UnlockButton + badge

**Files:** Create: `src/components/UnlockButton.tsx`; Modify: `src/components/PostMedia.tsx`

- [ ] **Step 1: `src/components/UnlockButton.tsx`**
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UnlockButton({ kind, id, price }: { kind: "post" | "message"; id: string; price: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function unlock() {
    setBusy(true); setErr("");
    const url = kind === "post" ? `/api/posts/${id}/unlock` : `/api/messages/${id}/unlock`;
    const res = await fetch(url, { method: "POST" });
    setBusy(false);
    if (res.ok) router.refresh();
    else { const d = await res.json().catch(() => ({})); setErr(d.error ?? "Error"); }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button onClick={unlock} disabled={busy} className="rounded-full bg-gradient-to-tl from-purple to-purple-soft px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? "…" : `Desbloquear por ${price} ☾`}
      </button>
      {err && <span className="text-xs text-red-400">{err}</span>}
    </div>
  );
}
```

- [ ] **Step 2: Editar `src/components/PostMedia.tsx`** — al inicio del render, si `post.locked`, en vez del grid normal, mostrar un contenedor borroso con candado + `UnlockButton`:
```tsx
  if (post.locked) {
    return (
      <div className="relative mt-4 flex h-80 w-full items-center justify-center overflow-hidden rounded-xl border border-purple/20 bg-navy">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,#171334,#171334_12px,#1d1840_12px,#1d1840_24px)] opacity-60" />
        <div className="relative flex flex-col items-center gap-3 text-center">
          <span className="text-3xl">🔒</span>
          <p className="text-sm text-white/60">Contenido de pago</p>
          <UnlockButton kind="post" id={post.id} price={post.priceCredits ?? 0} />
        </div>
      </div>
    );
  }
```
(Colocar esto tras `if (images.length === 0) return null;` — o antes, de modo que un post de pago sin desbloquear muestre el candado aunque `images` esté vacío en el cliente. Importar `UnlockButton`.)
Añadir badge "N ☾" en el grid normal para posts de pago ya desbloqueados (esquina), opcional.

- [ ] **Step 3:** `npx tsc --noEmit` → `npm run lint`.
- [ ] **Step 4: Commit** — `git add src/components/UnlockButton.tsx src/components/PostMedia.tsx && git commit -m "feat(ppv): media bloqueada + botón desbloquear"`

---

# BLOQUE 5 — Suscripción a creador

### Task 5.1: Endpoint subscribe + botón en perfil

**Files:** Create: `src/app/api/creators/[username]/subscribe/route.ts`, `src/components/SubscribeButton.tsx`; Modify: `src/app/u/[username]/page.tsx`

- [ ] **Step 1: `src/app/api/creators/[username]/subscribe/route.ts`**
```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { transfer, InsufficientFunds } from "@/lib/wallet";
import { notify } from "@/lib/notifications";

export async function POST(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { username } = await params;

  const creator = await prisma.user.findUnique({ where: { username }, select: { id: true, creatorMode: true, subPriceCredits: true } });
  if (!creator) return NextResponse.json({ error: "No existe" }, { status: 404 });
  if (creator.id === session.sub) return NextResponse.json({ error: "No puedes suscribirte a ti mismo" }, { status: 400 });
  if (!creator.creatorMode || creator.subPriceCredits == null) return NextResponse.json({ error: "Este usuario no ofrece suscripción" }, { status: 400 });

  const price = creator.subPriceCredits;
  const now = new Date();
  try {
    await prisma.$transaction(async (tx) => {
      await transfer(tx, { fromId: session.sub, toId: creator.id, amount: price, kind: "sub", refType: "subscription", refId: creator.id });
      const existing = await tx.subscription.findUnique({ where: { subscriberId_creatorId: { subscriberId: session.sub, creatorId: creator.id } } });
      const base = existing && existing.expiresAt > now ? existing.expiresAt : now;
      const expiresAt = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
      await tx.subscription.upsert({
        where: { subscriberId_creatorId: { subscriberId: session.sub, creatorId: creator.id } },
        create: { subscriberId: session.sub, creatorId: creator.id, expiresAt, priceCredits: price },
        update: { expiresAt, priceCredits: price },
      });
    });
  } catch (e) {
    if (e instanceof InsufficientFunds) return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
    throw e;
  }
  await notify({ userId: creator.id, actorId: session.sub, type: "subscribe" });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: `src/components/SubscribeButton.tsx`**
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SubscribeButton({ username, price, activeUntil }: { username: string; price: number; activeUntil?: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function subscribe() {
    setBusy(true); setErr("");
    const res = await fetch(`/api/creators/${username}/subscribe`, { method: "POST" });
    setBusy(false);
    if (res.ok) router.refresh();
    else { const d = await res.json().catch(() => ({})); setErr(d.error ?? "Error"); }
  }

  if (activeUntil) {
    return <span className="rounded-[1.25rem] border-2 border-purple/40 px-4 py-2 text-sm font-bold text-purple">Suscrito · vence {new Date(activeUntil).toLocaleDateString("es")}</span>;
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={subscribe} disabled={busy} className="rounded-[1.25rem] bg-gradient-to-tl from-purple to-purple-soft px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
        {busy ? "…" : `Suscribirse por ${price} ☾/mes`}
      </button>
      {err && <span className="text-xs text-red-400">{err}</span>}
    </div>
  );
}
```

- [ ] **Step 3: Editar `src/app/u/[username]/page.tsx`** — añadir `creatorMode: true, subPriceCredits: true` al select del `profile`. Tras calcular `following`, cargar la suscripción activa del viewer:
```ts
  const sub = isMe ? null : await prisma.subscription.findUnique({
    where: { subscriberId_creatorId: { subscriberId: session.sub, creatorId: profile.id } },
    select: { expiresAt: true },
  });
  const subActiveUntil = sub && sub.expiresAt > new Date() ? sub.expiresAt.toISOString() : null;
```
En el bloque `{!isMe && (...)}` de acciones, si `profile.creatorMode && profile.subPriceCredits`, añadir `<SubscribeButton username={profile.username} price={profile.subPriceCredits} activeUntil={subActiveUntil} />`. Import del componente.

- [ ] **Step 4:** `npx tsc --noEmit` → `npm run lint` → `curl` 401 subscribe.
- [ ] **Step 5: Commit** — `git add "src/app/api/creators/[username]/subscribe/route.ts" src/components/SubscribeButton.tsx "src/app/u/[username]/page.tsx" && git commit -m "feat(sub): suscripción a creador + UI perfil"`

---

# BLOQUE 6 — Propinas

### Task 6.1: Endpoint tips + botón

**Files:** Create: `src/app/api/tips/route.ts`, `src/components/TipButton.tsx`; Modify: `src/components/PostCard.tsx`, `src/app/u/[username]/page.tsx`

- [ ] **Step 1: `src/app/api/tips/route.ts`**
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { transfer, InsufficientFunds } from "@/lib/wallet";
import { notify } from "@/lib/notifications";

const schema = z.object({ toUsername: z.string().min(1), postId: z.string().optional(), amount: z.number().int().min(1).max(100000) });

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const { toUsername, postId, amount } = parsed.data;

  const to = await prisma.user.findUnique({ where: { username: toUsername }, select: { id: true } });
  if (!to) return NextResponse.json({ error: "No existe" }, { status: 404 });
  if (to.id === session.sub) return NextResponse.json({ error: "No puedes darte propina" }, { status: 400 });

  try {
    await prisma.$transaction(async (tx) => {
      await transfer(tx, { fromId: session.sub, toId: to.id, amount, kind: "tip", refType: postId ? "post" : undefined, refId: postId });
    });
  } catch (e) {
    if (e instanceof InsufficientFunds) return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
    throw e;
  }
  await notify({ userId: to.id, actorId: session.sub, type: "tip", postId: postId ?? null });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: `src/components/TipButton.tsx`**
```tsx
"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useOutside } from "@/lib/useOutside";

export default function TipButton({ toUsername, postId }: { toUsername: string; postId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [custom, setCustom] = useState<number | "">("");
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false), open);

  async function tip(amount: number) {
    if (amount < 1) return;
    setBusy(true);
    const res = await fetch("/api/tips", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toUsername, postId, amount }) });
    setBusy(false);
    setOpen(false);
    if (res.ok) router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="transition hover:text-purple" aria-label="Propina">☾</button>
      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-48 rounded-xl border border-white/10 bg-navy-2 p-3 shadow-2xl">
          <div className="mb-2 flex gap-1.5">
            {[5, 10, 50].map((a) => (
              <button key={a} onClick={() => tip(a)} disabled={busy} className="flex-1 rounded-lg bg-purple/15 py-1.5 text-xs font-semibold text-purple hover:bg-purple/25 disabled:opacity-50">{a} ☾</button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input type="number" min={1} value={custom} onChange={(e) => setCustom(e.target.value === "" ? "" : Number(e.target.value))} placeholder="otro" className="w-full rounded-lg border border-white/10 bg-navy px-2 py-1 text-xs text-white outline-none" />
            <button onClick={() => custom !== "" && tip(Number(custom))} disabled={busy || custom === ""} className="rounded-lg bg-purple px-2 py-1 text-xs font-semibold text-white disabled:opacity-50">Dar</button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Editar `src/components/PostCard.tsx`** — en la barra de acciones, añadir `<TipButton toUsername={post.author.username} postId={post.id} />` (importar). Colócalo junto a los otros botones de acción.

- [ ] **Step 4: Editar `src/app/u/[username]/page.tsx`** — en el bloque de acciones `{!isMe && ...}`, añadir `<TipButton toUsername={profile.username} />`.

- [ ] **Step 5:** `npx tsc --noEmit` → `npm run lint` → `curl` 401 tips.
- [ ] **Step 6: Commit** — `git add src/app/api/tips src/components/TipButton.tsx src/components/PostCard.tsx "src/app/u/[username]/page.tsx" && git commit -m "feat(tips): propinas en post y perfil"`

---

# BLOQUE 7 — PPV en mensajes directos

### Task 7.1: Message.priceCredits + unlock + composer + burbuja

**Files:** Modify: `prisma/schema.prisma`, `src/app/api/messages/route.ts`, `src/lib/queries.ts` (getThread), `src/components/ChatThread.tsx`, `src/components/MessageComposer.tsx`; Create: `src/app/api/messages/[id]/unlock/route.ts`

- [ ] **Step 1:** En `model Message` añadir `priceCredits Int?`. `npx prisma generate`.

- [ ] **Step 2: `src/app/api/messages/[id]/unlock/route.ts`**
```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { transfer, InsufficientFunds } from "@/lib/wallet";
import { hasMessageAccess } from "@/lib/entitlement";
import { notify } from "@/lib/notifications";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const msg = await prisma.message.findUnique({ where: { id }, select: { id: true, senderId: true, recipientId: true, priceCredits: true } });
  if (!msg) return NextResponse.json({ error: "No existe" }, { status: 404 });
  if (msg.recipientId !== session.sub) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  if (msg.priceCredits == null) return NextResponse.json({ ok: true, already: true });
  if (await hasMessageAccess(session.sub, msg)) return NextResponse.json({ ok: true, already: true });

  try {
    await prisma.$transaction(async (tx) => {
      await transfer(tx, { fromId: session.sub, toId: msg.senderId, amount: msg.priceCredits!, kind: "purchase", refType: "message", refId: msg.id });
      await tx.purchase.create({ data: { buyerId: session.sub, kind: "message", messageId: msg.id, priceCredits: msg.priceCredits! } });
    });
  } catch (e) {
    if (e instanceof InsufficientFunds) return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
    throw e;
  }
  await notify({ userId: msg.senderId, actorId: session.sub, type: "purchase" });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Editar `src/app/api/messages/route.ts`** — añadir `priceCredits: z.number().int().min(1).max(100000).nullable().default(null)` al schema y `priceCredits` al `create`. Si `priceCredits != null`, exigir `creatorMode` del sender (query + 403 si no).

- [ ] **Step 4: Editar `src/lib/queries.ts` `getThread` + `ThreadMessage`** — incluir `priceCredits` y computar `locked` por mensaje para el viewer. `ThreadMessage` añade `priceCredits: number | null; locked: boolean`. En `getThread`, tras traer los mensajes, para los de pago que no envió el viewer, resolver acceso (batch: `prisma.purchase.findMany({ where: { buyerId: viewerId, messageId: { in: paidIds } } })`), y setear `locked` + ocultar `imageUrl`/`body` si bloqueado (dejar `imageUrl: null` cuando locked para no filtrar la URL).

- [ ] **Step 5: Editar `src/components/ChatThread.tsx`** — para un mensaje con `locked`, renderizar burbuja con candado + `UnlockButton kind="message" id={m.id} price={m.priceCredits}`. (Leer el archivo para el punto exacto de render de burbuja.)

- [ ] **Step 6: Editar `src/components/MessageComposer.tsx`** — si el usuario es `creatorMode`, permitir adjuntar media con precio (input ☾) y subir con `private`. (Leer el archivo; añadir estado price + flag private en el upload + `priceCredits` en el POST a messages. Requiere pasar `creatorMode` al composer desde la página de mensajes.)

- [ ] **Step 7:** `npx prisma generate` → `npx tsc --noEmit` → `npm run lint` → `curl` 401 unlock.
- [ ] **Step 8: Commit** — `git add prisma/schema.prisma "src/app/api/messages/[id]/unlock/route.ts" src/app/api/messages/route.ts src/lib/queries.ts src/components/ChatThread.tsx src/components/MessageComposer.tsx && git commit -m "feat(ppv-dm): mensajes de pago (unlock, composer, burbuja bloqueada)"`

---

# BLOQUE 8 — Notificaciones de pago

### Task 8.1: Render de nuevos tipos

**Files:** Modify: `src/lib/notifications.ts`, `src/app/notificaciones/page.tsx`

- [ ] **Step 1: `src/lib/notifications.ts`** — extender el tipo:
```ts
type NotifType = "like" | "comment" | "follow" | "purchase" | "tip" | "subscribe";
```
(Ya se generan desde los endpoints de bloques 4–6; esto solo permite el tipo.)

- [ ] **Step 2: `src/app/notificaciones/page.tsx`** — añadir al mapa `verb`:
```ts
  purchase: "desbloqueó tu contenido de pago",
  tip: "te envió una propina",
  subscribe: "se suscribió a ti",
```
(Si el dropdown de la campana `NotifBell` tiene su propio mapa de verbos, actualizarlo igual — revisar `src/components/NotifBell.tsx`.)

- [ ] **Step 3:** `npx tsc --noEmit` → `npm run lint`.
- [ ] **Step 4: Commit** — `git add src/lib/notifications.ts src/app/notificaciones/page.tsx && git commit -m "feat(notifs): render purchase/tip/subscribe"`
- [ ] **Step 5: (opcional) build + deploy final del subsistema.**

---

## Self-Review

**Cobertura del spec:**
- Núcleo wallet+ledger+entitlement → Tasks 1.1–1.2, 3.2. ✔
- Grant bienvenida → 1.3. ✔ · Recarga simulada + saldo → 1.4–1.5. ✔ · Modo creador → 2.1. ✔
- Protección media (bucket privado, presign, proxy) → 3.1, 3.3, 3.4. ✔
- PPV post → 4.1–4.3. ✔ · Suscripción → 5.1. ✔ · Propinas → 6.1. ✔ · PPV DM → 7.1. ✔ · Notifs → 8.1. ✔

**Consistencia de tipos:**
- `transfer(tx, {fromId,toId,amount,kind,refType?,refId?})` y `InsufficientFunds` (1.2) usados por 4.2, 5.1, 6.1, 7.1. ✔
- `hasPostAccess`/`hasMessageAccess`/`loadViewerEntitlements` (3.2) usados por proxy (3.3), shaping (4.1), unlock (4.2, 7.1). ✔
- `FeedPost.priceCredits/locked` (4.1) consumidos por `PostMedia` (4.3). `ThreadMessage.priceCredits/locked` (7.1) por `ChatThread` (7.1). ✔
- `putMedia(...,{private})` y `presignGet` (3.1) usados por upload (3.1), composer (4.2, 7.1), proxy (3.3). ✔
- Claves compuestas Prisma: `buyerId_postId`, `buyerId_messageId`, `subscriberId_creatorId` — definidas por los `@@unique` (1.1), usadas en entitlement (3.2), unlock (4.2, 7.1), subscribe (5.1). ✔

**Placeholders:** los steps que dicen "leer el archivo" (ChatThread 7.5, MessageComposer 7.6) son ediciones sobre componentes no incluidos aquí; llevan el contrato exacto (props, endpoint, comportamiento) — el implementador lee el archivo para el punto de inserción. El resto trae código completo.

**Riesgo abierto:** `@aws-sdk/s3-request-presigner` puede requerir instalación (3.1 lo cubre). `prisma.post.findFirst({ where: { images: { has: url } } })` requiere que la URL guardada sea exactamente `/api/media/<key>` (garantizado por `putMedia`).
