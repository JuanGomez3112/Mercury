import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser, ensureNotBlocked } from "@/lib/auth";
import { transfer, transferSplit, splitRecipients, InsufficientFunds } from "@/lib/wallet";
import { notify } from "@/lib/notifications";

const schema = z.object({ toUsername: z.string().min(1), postId: z.string().optional(), amount: z.number().int().min(1).max(100000) });

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const blk = await ensureNotBlocked(session.sub);
  if (blk.blocked) return NextResponse.json({ error: blk.reason }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const { toUsername, postId, amount } = parsed.data;

  const to = await prisma.user.findUnique({ where: { username: toUsername }, select: { id: true } });
  if (!to) return NextResponse.json({ error: "No existe" }, { status: 404 });
  if (to.id === session.sub) return NextResponse.json({ error: "No puedes darte propina" }, { status: 400 });

  // Si la propina es sobre un post colaborativo del autor, se reparte igual que el post
  let collaborators: { userId: string; percent: number }[] = [];
  if (postId) {
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true, collaborators: { select: { userId: true, percent: true } } } });
    if (post && post.authorId === to.id) collaborators = post.collaborators;
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (collaborators.length > 0) {
        await transferSplit(tx, { fromId: session.sub, amount, kind: "tip", recipients: splitRecipients(to.id, amount, collaborators), refType: "post", refId: postId });
      } else {
        await transfer(tx, { fromId: session.sub, toId: to.id, amount, kind: "tip", refType: postId ? "post" : undefined, refId: postId });
      }
    });
  } catch (e) {
    if (e instanceof InsufficientFunds) return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
    throw e;
  }
  const tipNotify = [to.id, ...collaborators.map((c) => c.userId)].filter((uid) => uid !== session.sub);
  await Promise.all([...new Set(tipNotify)].map((uid) => notify({ userId: uid, actorId: session.sub, type: "tip", postId: postId ?? null })));
  return NextResponse.json({ ok: true });
}
