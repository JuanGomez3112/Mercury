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
  try {
    await prisma.$transaction(async (tx) => {
      await transfer(tx, { fromId: session.sub, toId: creator.id, amount: price, kind: "sub", refType: "subscription", refId: creator.id });
      // Extensión atómica: el UPDATE toma lock de fila, así renovaciones concurrentes
      // componen +30d desde el expiresAt vigente (o desde ahora si ya venció) sin perder pagos.
      const affected = await tx.$executeRaw`
        UPDATE "Subscription"
        SET "expiresAt" = GREATEST("expiresAt", NOW()) + INTERVAL '30 days',
            "priceCredits" = ${price}
        WHERE "subscriberId" = ${session.sub} AND "creatorId" = ${creator.id}`;
      if (affected === 0) {
        await tx.subscription.create({
          data: { subscriberId: session.sub, creatorId: creator.id, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), priceCredits: price },
        });
      }
    });
  } catch (e) {
    if (e instanceof InsufficientFunds) return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
    throw e;
  }
  await notify({ userId: creator.id, actorId: session.sub, type: "subscribe" });
  return NextResponse.json({ ok: true });
}
