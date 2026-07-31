import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { transfer, InsufficientFunds } from "@/lib/wallet";
import { hasPostAccess } from "@/lib/entitlement";
import { notify } from "@/lib/notifications";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id: postId } = await params;

  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true, authorId: true, priceCredits: true } });
  if (!post) return NextResponse.json({ error: "No existe" }, { status: 404 });
  if (post.priceCredits == null) return NextResponse.json({ ok: true, already: true });
  if (await hasPostAccess(session.sub, post)) return NextResponse.json({ ok: true, already: true });

  try {
    await prisma.$transaction(async (tx) => {
      await transfer(tx, { fromId: session.sub, toId: post.authorId, amount: post.priceCredits!, kind: "purchase", refType: "post", refId: post.id });
      await tx.purchase.create({ data: { buyerId: session.sub, kind: "post", postId: post.id, priceCredits: post.priceCredits! } });
    });
  } catch (e) {
    if (e instanceof InsufficientFunds) return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json({ ok: true, already: true });
    }
    throw e;
  }
  await notify({ userId: post.authorId, actorId: session.sub, type: "purchase", postId: post.id });
  return NextResponse.json({ ok: true });
}
