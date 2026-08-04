import { prisma } from "./db";

/** Libera los escrows 'held' vencidos (releaseAt pasado, sin disputa). Idempotente. Se llama al cargar el market. */
export async function sweepAutoRelease() {
  const due = await prisma.marketOrder.findMany({
    where: { status: "held", releaseAt: { lt: new Date() } },
    select: { id: true, sellerId: true, credits: true },
    take: 100,
  });
  for (const o of due) {
    await prisma.$transaction(async (tx) => {
      const claim = await tx.marketOrder.updateMany({ where: { id: o.id, status: "held" }, data: { status: "released", confirmedAt: new Date() } });
      if (claim.count === 0) return;
      await tx.user.update({ where: { id: o.sellerId }, data: { earnings: { increment: o.credits } } });
      await tx.walletTransaction.create({ data: { userId: o.sellerId, delta: o.credits, type: "escrow_release", refType: "market", refId: o.id } });
    });
  }
}
