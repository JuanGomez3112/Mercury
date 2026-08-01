# Mercury — On-ramp / Procesador de Pago Real (comprar ☾, checkout externo, payout)

- **Fecha:** 2026-08-01
- **Estado:** DISEÑO / documentado. **No implementado.** La elección e integración del procesador y el manejo de dinero real son **decisión y responsabilidad del usuario** (la IA no ejecuta cobros/pagos reales).
- **Proyecto:** Mercury (`E:\Proyectos\Proyectos\Programacion\Mercury`).
- **Stack:** Next.js 16 · React 19 · TS · Prisma **6** · PostgreSQL.

> ⚠️ **No es asesoría legal/financiera.** Aceptar y pagar dinero real = actividad regulada (ver [[2026-08-01-mercury-cumplimiento-design]]: licencias, KYC/AML). Este doc cubre el **diseño técnico**.

## Objetivo

Conectar el dinero real con la economía MeryCoin (hoy simulada), **cerrando el hueco de solvencia** y habilitando `launched=true`:
1. **Comprar ☾** (on-ramp): el usuario paga dinero real → se emiten ☾ del treasury a su `balance`, respaldados por una **reserva** real.
2. **Checkout externo de tienda:** órdenes `pending` se cobran de verdad → `paid` + reserva de stock al pagar.
3. **Payout de retiros:** dinero real hacia creadores (reverso del on-ramp) — ligado a KYC/AML.

**Principio de solvencia:** por cada ☾ retirable (`earnings`) debe existir dinero real en reserva que lo respalde. El on-ramp es lo que crea ese respaldo. Sin él, `launched=false` (retiros off) — como está hoy.

## Procesador (decisión del usuario)

Los procesadores generales (Stripe/PayPal) rechazan adulto → **CCBill / Segpay / Verotel** (especializados) o **cripto** (stablecoin/on-chain). El diseño es **agnóstico** vía interfaz `PaymentProvider`; se elige e integra uno al construir. Credenciales/cuenta = del usuario.

---

## Interfaz `PaymentProvider` (`src/lib/payments/*`)

Ya existe un scaffold (`external` lanza "no configurado"). Se formaliza:

```ts
interface PaymentProvider {
  name: string;
  // Inicia un cobro; devuelve a dónde mandar al usuario (checkout hospedado) o un client secret.
  createCharge(input: { amountCents: number; currency: string; ref: string; metadata: Record<string,string> })
    : Promise<{ redirectUrl?: string; clientSecret?: string; providerRef: string }>;
  // Verifica la firma del webhook y devuelve el evento normalizado.
  verifyWebhook(req: Request): Promise<{ providerRef: string; status: "paid"|"failed"|"refunded"; amountCents: number } | null>;
  // Payout hacia un beneficiario (retiros). Puede ser manual (admin) si el proveedor no lo soporta.
  createPayout?(input: { amountCents: number; payoutInfo: string; ref: string }): Promise<{ providerRef: string }>;
}
```

Registro de proveedores por `name`; el activo se elige por config/env. `merycoin` (interno) y el proveedor externo conviven.

---

## Modelo de datos

```prisma
model Payment {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider    String   // ccbill | segpay | verotel | crypto | ...
  providerRef String   @unique   // id del cobro en el proveedor (idempotencia)
  kind        String   // buy_credits | store_order
  credits     Int?     // ☾ a emitir (si buy_credits)
  amountCents Int
  currency    String   @default("USD")
  status      String   @default("pending") // pending | paid | failed | refunded
  orderId     String?  // si store_order
  createdAt   DateTime @default(now())
  paidAt      DateTime?

  @@index([userId, createdAt])
  @@index([status])
}
```

`TokenConfig` gana **`reserveCents BigInt @default(0)`** (dinero real en reserva) para reconciliar solvencia. `launched` solo debe ponerse `true` cuando existe on-ramp real + reserva.

---

## Flujos

### A. Comprar ☾ (on-ramp)
1. `/comprar` (o dentro de `/cartera`): usuario elige monto de ☾ → precio = `credits * rateCents` (peg fijo, admin-set).
2. `POST /api/payments/buy` `{ credits }` → crea `Payment(kind=buy_credits, status=pending)` + `provider.createCharge` → devuelve `redirectUrl`/`clientSecret`. **No** se emiten ☾ aún.
3. Usuario paga en el proveedor. El proveedor llama al **webhook**.
4. `POST /api/payments/webhook` → `provider.verifyWebhook` (firma). Si `paid` y el `Payment` estaba `pending` (claim atómico `updateMany status:pending`): dentro de `$transaction` → `mint(tx, userId, credits)` (treasury→balance), `reserveCents += amountCents`, `Payment.status=paid`, ledger `buy`. **Idempotente** por `providerRef` unique + claim.
5. Si `failed`/`refunded` → `Payment.status`, sin emitir.

### B. Checkout externo de tienda (reserve-on-pay)
- Hoy el checkout externo crea orden `pending` **sin** reservar stock (v1). Con on-ramp real:
  1. `POST /api/checkout {paymentMethod:"external"}` crea `Order(pending)` + `Payment(kind=store_order, pending)` + `provider.createCharge(amount=total en ¢)` → redirige.
  2. Webhook `paid` → `$transaction`: **ahora** decrementa stock con guard (si algún ítem quedó sin stock → refund/cancelar la orden, notificar), marca `Order.paid`, `reserveCents += total`. (El dinero de tienda es ingreso de la plataforma, no earnings de creador — no toca solvencia de retiros.)
  3. Reconciliar con el modelo de tienda existente (el `spend` MeryCoin y el pago externo son ramas del mismo checkout).

### C. Payout de retiros (reverso)
- El retiro (`Withdrawal pending`, ya construido) lo paga el admin: si el proveedor soporta `createPayout`, botón "Pagar vía proveedor" → `provider.createPayout` → marca `paid`; si no, pago manual + marcar `paid` (como hoy). Al pagar: `reserveCents -= amountCents` (sale dinero real de la reserva).
- Gate: `launched` + `idVerified` + `kycVerified` (cumplimiento) + `reserveCents ≥ amountCents`.

---

## Seguridad e integridad

- **Webhook:** verificar **firma** del proveedor siempre; rechazar sin firma válida. Endpoint público pero autenticado por firma.
- **Idempotencia:** `providerRef` unique + claim atómico (`updateMany status:pending`) → un webhook repetido no emite ☾ dos veces (mismo patrón que los fixes de la economía).
- **Reembolsos/chargebacks:** si un cobro `paid` se revierte tras emitir ☾ → `refunded`: intentar **clawback** de los ☾ (débito de `balance`; si ya se gastaron/retiraron, registrar deuda/negativo controlado — política = decisión de negocio). Registrar y alertar admin.
- **Reconciliación:** job/vista admin que compara `reserveCents` vs suma de `earnings` retirables × `rateCents` (solvencia). Alertar si la reserva < obligaciones.
- **Nunca** exponer secretos del proveedor al cliente; montos siempre server-side.

---

## Bloques (cuando se construya)

| # | Bloque | Depende |
|---|--------|---------|
| 1 | `Payment` + `TokenConfig.reserveCents` + interfaz `PaymentProvider` + registro | proveedor elegido |
| 2 | Comprar ☾ (`/comprar`, `/api/payments/buy`, webhook, mint+reserve) | 1 |
| 3 | Checkout externo real (reserve-on-pay + webhook) | 1, tienda |
| 4 | Payout de retiros (createPayout o manual + reserve−) | 1, cumplimiento (KYC/AML) |
| 5 | Reconciliación/solvencia (vista admin, clawback de chargebacks) | 2,3,4 |
| 6 | Activar `launched=true` (solo con reserva real + cumplimiento) | 2,4, cumplimiento |

## Decisiones bloqueantes (externas a la IA)

1. **Procesador** (CCBill/Segpay/Verotel/cripto) + cuenta + credenciales + webhook secret.
2. **Peg** ☾↔dinero (hoy `rateCents` fijo; confirmar valor y si es fijo o revisable).
3. Política de **reembolso/chargeback** (clawback, deuda).
4. Cumplimiento (KYC/AML, licencia) antes de payouts reales — ver spec de cumplimiento.

## Fuera de alcance

Integración con un procesador concreto (hasta elegirlo), on-chain (spec aparte), impuestos, contabilidad, prevención de fraude avanzada.
