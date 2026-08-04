import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

/** El comprador confirma recepción → libera el escrow al vendedor (earnings). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const order = await prisma.marketOrder.findUnique({ where: { id }, select: { buyerId: true, sellerId: true, credits: true, status: true } });
  if (!order) return NextResponse.json({ error: "No existe" }, { status: 404 });
  if (order.buyerId !== session.sub) return NextResponse.json({ error: "No es tuya" }, { status: 403 });

  try {
    await prisma.$transaction(async (tx) => {
      const claim = await tx.marketOrder.updateMany({ where: { id, status: "held" }, data: { status: "released", confirmedAt: new Date() } });
      if (claim.count === 0) throw new Error("STATE");
      await tx.user.update({ where: { id: order.sellerId }, data: { earnings: { increment: order.credits } } });
      await tx.walletTransaction.create({ data: { userId: order.sellerId, delta: order.credits, type: "escrow_release", refType: "market", refId: id } });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "STATE") return NextResponse.json({ error: "La orden no está retenida" }, { status: 400 });
    throw e;
  }
  return NextResponse.json({ ok: true });
}
