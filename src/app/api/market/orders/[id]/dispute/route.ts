import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

/** Comprador o vendedor abre disputa → congela el escrow (no auto-libera). El admin resuelve. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const order = await prisma.marketOrder.findUnique({ where: { id }, select: { buyerId: true, sellerId: true, status: true } });
  if (!order) return NextResponse.json({ error: "No existe" }, { status: 404 });
  if (order.buyerId !== session.sub && order.sellerId !== session.sub) return NextResponse.json({ error: "No es tuya" }, { status: 403 });

  const claim = await prisma.marketOrder.updateMany({ where: { id, status: "held" }, data: { status: "disputed" } });
  if (claim.count === 0) return NextResponse.json({ error: "La orden no está retenida" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
