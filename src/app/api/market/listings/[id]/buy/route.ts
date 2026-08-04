import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser, ensureNotBlocked } from "@/lib/auth";

/** Compra con escrow: retiene ☾ del comprador; el listing pasa a 'sold'. Se libera al confirmar recepción. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const blk = await ensureNotBlocked(session.sub);
  if (blk.blocked) return NextResponse.json({ error: blk.reason }, { status: 403 });

  const { id } = await params;
  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { id: true, sellerId: true, priceCredits: true, acceptsCredits: true, status: true },
  });
  if (!listing) return NextResponse.json({ error: "No existe" }, { status: 404 });
  if (listing.status !== "active") return NextResponse.json({ error: "Ya no está disponible" }, { status: 400 });
  if (!listing.acceptsCredits) return NextResponse.json({ error: "No acepta ☾" }, { status: 400 });
  if (listing.sellerId === session.sub) return NextResponse.json({ error: "No puedes comprar tu propio anuncio" }, { status: 400 });

  let orderId = "";
  try {
    orderId = await prisma.$transaction(async (tx) => {
      // Débito atómico del comprador (anti-saldo-negativo).
      const debit = await tx.user.updateMany({
        where: { id: session.sub, balance: { gte: listing.priceCredits } },
        data: { balance: { decrement: listing.priceCredits } },
      });
      if (debit.count === 0) throw new Error("FUNDS");
      // Claim del listing: sólo se vende una vez.
      const claim = await tx.listing.updateMany({ where: { id, status: "active" }, data: { status: "sold" } });
      if (claim.count === 0) throw new Error("SOLD");

      const order = await tx.marketOrder.create({
        data: {
          listingId: id,
          buyerId: session.sub,
          sellerId: listing.sellerId,
          credits: listing.priceCredits,
          status: "held",
          releaseAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      await tx.walletTransaction.create({ data: { userId: session.sub, delta: -listing.priceCredits, type: "escrow_hold", refType: "market", refId: order.id } });
      return order.id;
    });
  } catch (e) {
    if (e instanceof Error && e.message === "FUNDS") return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
    if (e instanceof Error && e.message === "SOLD") return NextResponse.json({ error: "Ya no está disponible" }, { status: 400 });
    throw e;
  }

  return NextResponse.json({ ok: true, orderId });
}
