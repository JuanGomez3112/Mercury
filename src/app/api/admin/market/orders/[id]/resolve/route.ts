import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminUnlocked } from "@/lib/admin";

const schema = z.object({ action: z.enum(["release", "refund"]) });

/** El admin resuelve una disputa: libera al vendedor o reembolsa al comprador. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUnlocked();
  if (!admin) return NextResponse.json({ error: "Prohibido" }, { status: 403 });
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Inválido" }, { status: 400 });
  const { action } = parsed.data;

  const order = await prisma.marketOrder.findUnique({ where: { id }, select: { buyerId: true, sellerId: true, credits: true, status: true, listingId: true } });
  if (!order) return NextResponse.json({ error: "No existe" }, { status: 404 });

  try {
    await prisma.$transaction(async (tx) => {
      const target = action === "release" ? "released" : "refunded";
      const claim = await tx.marketOrder.updateMany({ where: { id, status: "disputed" }, data: { status: target, resolvedById: admin.id, confirmedAt: new Date() } });
      if (claim.count === 0) throw new Error("STATE");
      if (action === "release") {
        await tx.user.update({ where: { id: order.sellerId }, data: { earnings: { increment: order.credits } } });
        await tx.walletTransaction.create({ data: { userId: order.sellerId, delta: order.credits, type: "escrow_release", refType: "market", refId: id } });
      } else {
        await tx.user.update({ where: { id: order.buyerId }, data: { balance: { increment: order.credits } } });
        await tx.walletTransaction.create({ data: { userId: order.buyerId, delta: order.credits, type: "escrow_refund", refType: "market", refId: id } });
        await tx.listing.updateMany({ where: { id: order.listingId, status: "sold" }, data: { status: "active" } });
      }
    });
  } catch (e) {
    if (e instanceof Error && e.message === "STATE") return NextResponse.json({ error: "La orden no está en disputa" }, { status: 400 });
    throw e;
  }
  return NextResponse.json({ ok: true });
}
