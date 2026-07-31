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
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json({ ok: true, already: true });
    }
    throw e;
  }
  await notify({ userId: msg.senderId, actorId: session.sub, type: "purchase" });
  return NextResponse.json({ ok: true });
}
