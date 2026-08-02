import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getConfig, mint } from "@/lib/token";
import { activeProvider } from "@/lib/payments";

// Webhook público, autenticado por firma HMAC del proveedor. Idempotente por providerRef unique + claim.
export async function POST(req: Request) {
  const provider = activeProvider();
  if (!provider) return NextResponse.json({ error: "Pago no configurado" }, { status: 503 });

  const rawBody = await req.text();
  const evt = await provider.verifyWebhook(rawBody, req.headers);
  if (!evt) return NextResponse.json({ error: "Firma inválida o evento ignorado" }, { status: 400 });

  const payment = await prisma.payment.findUnique({ where: { providerRef: evt.providerRef } });
  if (!payment) return NextResponse.json({ ok: true, ignored: "unknown" }); // invoice ajena → ack sin efecto

  if (evt.status === "paid") {
    await getConfig(); // asegura singleton para el mint
    await prisma.$transaction(async (tx) => {
      // Claim atómico: solo el primer webhook 'paid' procesa; repeticiones no re-emiten.
      const claim = await tx.payment.updateMany({
        where: { providerRef: evt.providerRef, status: "pending" },
        data: { status: "paid", paidAt: new Date() },
      });
      if (claim.count === 0) return; // ya procesado

      if (payment.kind === "buy_credits" && payment.credits) {
        await mint(tx, payment.userId, payment.credits); // treasury → balance
        await tx.tokenConfig.update({
          where: { id: "singleton" },
          data: { reserveCents: { increment: BigInt(payment.amountCents) } }, // respaldo real
        });
        await tx.walletTransaction.create({
          data: { userId: payment.userId, delta: payment.credits, type: "buy" },
        });
      } else if (payment.kind === "store_order" && payment.orderId) {
        // Reserve-on-pay: el stock se descuenta AHORA que el pago está confirmado.
        const order = await tx.order.findUnique({ where: { id: payment.orderId }, include: { items: true } });
        if (order) {
          const claimOrder = await tx.order.updateMany({
            where: { id: order.id, status: "pending" },
            data: { status: "paid" },
          });
          if (claimOrder.count > 0) {
            const decremented: { variantId: string; qty: number }[] = [];
            let failName: string | null = null;
            for (const it of order.items) {
              if (!it.variantId) continue;
              const dec = await tx.productVariant.updateMany({
                where: { id: it.variantId, active: true, stock: { gte: it.qty } },
                data: { stock: { decrement: it.qty } },
              });
              if (dec.count === 0) { failName = it.nameSnapshot; break; }
              decremented.push({ variantId: it.variantId, qty: it.qty });
            }
            if (failName) {
              // Sin stock tras el pago: compensa lo decrementado y marca reembolso (dinero ya cobrado).
              for (const d of decremented) {
                await tx.productVariant.updateMany({ where: { id: d.variantId }, data: { stock: { increment: d.qty } } });
              }
              await tx.order.update({ where: { id: order.id }, data: { status: "refund_pending" } });
            } else {
              await tx.tokenConfig.update({
                where: { id: "singleton" },
                data: { reserveCents: { increment: BigInt(payment.amountCents) } }, // ingreso plataforma
              });
            }
            await tx.notification.create({ data: { userId: order.userId, actorId: order.userId, type: "order" } });
          }
        }
      }
    });
  } else if (evt.status === "failed" || evt.status === "refunded") {
    await prisma.payment.updateMany({
      where: { providerRef: evt.providerRef, status: "pending" },
      data: { status: evt.status },
    });
  }

  return NextResponse.json({ ok: true });
}
