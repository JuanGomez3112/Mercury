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
      }
      // kind store_order → se maneja en el bloque de checkout externo (reserve-on-pay), fuera de alcance aquí.
    });
  } else if (evt.status === "failed" || evt.status === "refunded") {
    await prisma.payment.updateMany({
      where: { providerRef: evt.providerRef, status: "pending" },
      data: { status: evt.status },
    });
  }

  return NextResponse.json({ ok: true });
}
