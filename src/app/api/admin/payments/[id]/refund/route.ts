import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUnlocked } from "@/lib/admin";
import { burnToTreasury } from "@/lib/token";

// Reembolso/clawback iniciado por admin. Para cripto los chargebacks no existen (confirmado = final),
// así que el reembolso es una acción manual del admin (el dinero se devuelve fuera de banda vía BTCPay).
// Aquí se revierte el efecto contable: recuperar ☾ emitidos / restock, bajar reserva.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUnlocked();
  if (!admin) return NextResponse.json({ error: "Prohibido" }, { status: 403 });

  const { id } = await params;
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) return NextResponse.json({ error: "No existe" }, { status: 404 });
  if (payment.status !== "paid") return NextResponse.json({ error: "Solo se reembolsan pagos completados" }, { status: 400 });

  let shortfall = 0;
  try {
    await prisma.$transaction(async (tx) => {
      // Claim atómico: solo un reembolso procesa.
      const claim = await tx.payment.updateMany({ where: { id, status: "paid" }, data: { status: "refunded" } });
      if (claim.count === 0) throw new Error("CLAIMED");

      // Baja de reserva (dinero real que sale), con piso en 0.
      const cfg = await tx.tokenConfig.findUnique({ where: { id: "singleton" }, select: { reserveCents: true } });
      const back = BigInt(payment.amountCents);
      const newReserve = (cfg?.reserveCents ?? BigInt(0)) - back;
      await tx.tokenConfig.update({
        where: { id: "singleton" },
        data: { reserveCents: newReserve < BigInt(0) ? BigInt(0) : newReserve },
      });

      if (payment.kind === "buy_credits" && payment.credits) {
        // Clawback de ☾: debita del balance lo disponible (no lo dejamos negativo para no romper el
        // invariante de supply). Lo recuperado vuelve al treasury. El faltante = deuda/pérdida (se reporta).
        const user = await tx.user.findUnique({ where: { id: payment.userId }, select: { balance: true } });
        const available = user?.balance ?? 0;
        const debited = Math.min(available, payment.credits);
        shortfall = payment.credits - debited;
        if (debited > 0) {
          await tx.user.update({ where: { id: payment.userId }, data: { balance: { decrement: debited } } });
          await burnToTreasury(tx, debited);
          await tx.walletTransaction.create({
            data: { userId: payment.userId, delta: -debited, type: "clawback", refType: "payment", refId: id },
          });
        }
      } else if (payment.kind === "store_order" && payment.orderId) {
        // Restock + cancelar la orden.
        const order = await tx.order.findUnique({ where: { id: payment.orderId }, include: { items: true } });
        if (order && order.status === "paid") {
          for (const it of order.items) {
            if (it.variantId) {
              await tx.productVariant.updateMany({ where: { id: it.variantId }, data: { stock: { increment: it.qty } } });
            }
          }
          await tx.order.update({ where: { id: order.id }, data: { status: "cancelled" } });
        }
      }
    });
  } catch (e) {
    if (e instanceof Error && e.message === "CLAIMED") {
      return NextResponse.json({ error: "Ya reembolsado" }, { status: 400 });
    }
    throw e;
  }

  return NextResponse.json({ ok: true, shortfall });
}
