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
