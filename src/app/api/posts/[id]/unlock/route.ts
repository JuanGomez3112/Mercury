import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { transferSplit, InsufficientFunds } from "@/lib/wallet";
import { hasPostAccess } from "@/lib/entitlement";
import { notify } from "@/lib/notifications";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id: postId } = await params;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, priceCredits: true, collaborators: { select: { userId: true, percent: true } } },
  });
  if (!post) return NextResponse.json({ error: "No existe" }, { status: 404 });
  if (post.priceCredits == null) return NextResponse.json({ ok: true, already: true });
  if (await hasPostAccess(session.sub, post)) return NextResponse.json({ ok: true, already: true });

  const price = post.priceCredits;
  // Reparto: cada colaborador su %, el autor el resto (absorbe el redondeo)
  const collabAmts = post.collaborators.map((c) => ({ toId: c.userId, amount: Math.floor((price * c.percent) / 100) }));
  const authorAmt = price - collabAmts.reduce((s, c) => s + c.amount, 0);
  const recipients = [{ toId: post.authorId, amount: authorAmt }, ...collabAmts].filter((r) => r.amount > 0);

  try {
    await prisma.$transaction(async (tx) => {
      await transferSplit(tx, { fromId: session.sub, amount: price, recipients, refType: "post", refId: post.id });
      await tx.purchase.create({ data: { buyerId: session.sub, kind: "post", postId: post.id, priceCredits: price } });
    });
  } catch (e) {
    if (e instanceof InsufficientFunds) return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json({ ok: true, already: true });
    }
    throw e;
  }
  // Notificar al autor y a los colaboradores (menos el comprador)
  const notifyIds = [post.authorId, ...post.collaborators.map((c) => c.userId)].filter((uid) => uid !== session.sub);
  await Promise.all([...new Set(notifyIds)].map((uid) => notify({ userId: uid, actorId: session.sub, type: "purchase", postId: post.id })));
  return NextResponse.json({ ok: true });
}
