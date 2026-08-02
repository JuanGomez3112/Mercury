import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { currentUser, ensureNotBlocked } from "@/lib/auth";
import { spend, InsufficientFunds } from "@/lib/wallet";
import { resolveZone } from "@/lib/store";
import { activeProvider } from "@/lib/payments";

const schema = z.object({
  idempotencyKey: z.string().trim().min(8).max(64),
  paymentMethod: z.enum(["merycoin", "external"]),
  shipName: z.string().min(1),
  shipLine1: z.string().min(1),
  shipLine2: z.string().optional(),
  shipCity: z.string().min(1),
  shipState: z.string().optional(),
  shipCountry: z.string().min(1),
  shipZip: z.string().optional(),
  shipPhone: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const blk = await ensureNotBlocked(session.sub);
  if (blk.blocked) return NextResponse.json({ error: blk.reason }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const s = parsed.data;

  // Idempotencia: si este intento ya produjo una orden, devolverla sin recobrar ni redecrementar stock.
  // Cubre el caso "primer request ya comprometido" (doble-clic, reintento de red, respuesta perdida).
  const existing = await prisma.order.findUnique({ where: { idempotencyKey: s.idempotencyKey }, select: { id: true, userId: true } });
  if (existing) {
    if (existing.userId !== session.sub) return NextResponse.json({ error: "Clave inválida" }, { status: 409 });
    return NextResponse.json({ ok: true, orderId: existing.id, duplicate: true });
  }

  // Pago externo = cripto vía proveedor (BTCPay). Verificar disponibilidad antes de crear nada.
  const provider = s.paymentMethod === "external" ? activeProvider() : null;
  if (s.paymentMethod === "external" && !provider) {
    return NextResponse.json({ error: "Pago externo no configurado" }, { status: 503 });
  }

  const items = await prisma.cartItem.findMany({
    where: { userId: session.sub },
    include: { variant: { include: { product: true } } },
  });
  if (items.length === 0) return NextResponse.json({ error: "Carrito vacío" }, { status: 400 });

  const subtotalCredits = items.reduce((a, it) => a + it.variant.priceCredits * it.qty, 0);
  const subtotalCents = items.reduce((a, it) => a + it.variant.priceCents * it.qty, 0);
  const shipCountry = s.shipCountry.trim().toUpperCase();
  const zone = await resolveZone(shipCountry);
  const shippingCredits = zone?.priceCredits ?? 0;
  const shippingCents = zone?.priceCents ?? 0;
  const totalCents = subtotalCents + shippingCents;

  let orderId = "";
  try {
    orderId = await prisma.$transaction(async (tx) => {
      if (s.paymentMethod === "merycoin") {
        for (const it of items) {
          const dec = await tx.productVariant.updateMany({
            where: { id: it.variantId, active: true, stock: { gte: it.qty } },
            data: { stock: { decrement: it.qty } },
          });
          if (dec.count === 0) throw new Error(`STOCK:${it.variant.product.name}`);
        }
      }
      // v1: externo no reserva stock — reserve-on-pay cuando exista el procesador real
      if (s.paymentMethod === "merycoin" && (subtotalCredits + shippingCredits) > 0) {
        await spend(tx, { userId: session.sub, amount: subtotalCredits + shippingCredits, refType: "order" });
      }
      const order = await tx.order.create({
        data: {
          userId: session.sub,
          idempotencyKey: s.idempotencyKey,
          status: s.paymentMethod === "merycoin" ? "paid" : "pending",
          paymentMethod: s.paymentMethod,
          subtotalCents,
          subtotalCredits,
          shippingCents,
          shippingCredits,
          zoneId: zone?.id ?? null,
          shipName: s.shipName,
          shipLine1: s.shipLine1,
          shipLine2: s.shipLine2 ?? null,
          shipCity: s.shipCity,
          shipState: s.shipState ?? null,
          shipCountry,
          shipZip: s.shipZip ?? null,
          shipPhone: s.shipPhone ?? null,
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
      // MeryCoin: pago inmediato → vacía carrito ya. Externo: se vacía tras iniciar el cobro (abajo),
      // para no perder el carrito si el proveedor falla.
      if (s.paymentMethod === "merycoin") {
        await tx.cartItem.deleteMany({ where: { userId: session.sub } });
      }
      return order.id;
    });
  } catch (e) {
    if (e instanceof InsufficientFunds) return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
    if (e instanceof Error && e.message.startsWith("STOCK:")) {
      return NextResponse.json({ error: `Sin stock: ${e.message.slice(6)}` }, { status: 400 });
    }
    // Dup concurrente: otro request con la misma clave ganó la carrera. El tx actual revirtió
    // (stock/cobro deshechos). Postgres bloquea el insert hasta que el ganador comitea, así que
    // aquí ya existe; devolverlo idempotente.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const won = await prisma.order.findUnique({ where: { idempotencyKey: s.idempotencyKey }, select: { id: true } });
      if (won) return NextResponse.json({ ok: true, orderId: won.id, duplicate: true });
    }
    throw e;
  }

  if (s.paymentMethod === "merycoin") {
    // `notify` ignora auto-notificaciones (userId===actorId); la confirmación de pedido es para el propio
    // comprador, así que se crea la notificación directo saltando ese guard.
    await prisma.notification.create({
      data: { userId: session.sub, actorId: session.sub, type: "order" },
    });
    return NextResponse.json({ ok: true, orderId });
  }

  // --- Externo (cripto): reserve-on-pay. Se cobra ahora; stock + paid + reserva ocurren en el webhook. ---
  if (totalCents <= 0) {
    // Nada que cobrar → marcar pagado directo (raro: ítems y envío gratis).
    await prisma.order.update({ where: { id: orderId }, data: { status: "paid" } });
    await prisma.cartItem.deleteMany({ where: { userId: session.sub } });
    await prisma.notification.create({ data: { userId: session.sub, actorId: session.sub, type: "order" } });
    return NextResponse.json({ ok: true, orderId });
  }

  let charge: { redirectUrl?: string; providerRef: string };
  try {
    charge = await provider!.createCharge({
      amountCents: totalCents,
      currency: "USD",
      ref: orderId,
      metadata: { orderId, kind: "store_order" },
    });
  } catch {
    // Orden queda `pending` sin cobro; el carrito sigue intacto para reintentar (recargar da nueva clave).
    return NextResponse.json({ error: "No se pudo iniciar el pago externo" }, { status: 502 });
  }

  await prisma.payment.create({
    data: {
      userId: session.sub,
      provider: provider!.name,
      providerRef: charge.providerRef,
      kind: "store_order",
      amountCents: totalCents,
      orderId,
      status: "pending",
    },
  });
  await prisma.cartItem.deleteMany({ where: { userId: session.sub } });

  return NextResponse.json({ ok: true, orderId, redirectUrl: charge.redirectUrl });
}
