import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { transfer, InsufficientFunds } from "@/lib/wallet";
import { notify } from "@/lib/notifications";

const schema = z.object({ toUsername: z.string().min(1), postId: z.string().optional(), amount: z.number().int().min(1).max(100000) });

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const { toUsername, postId, amount } = parsed.data;

  const to = await prisma.user.findUnique({ where: { username: toUsername }, select: { id: true } });
  if (!to) return NextResponse.json({ error: "No existe" }, { status: 404 });
  if (to.id === session.sub) return NextResponse.json({ error: "No puedes darte propina" }, { status: 400 });

  try {
    await prisma.$transaction(async (tx) => {
      await transfer(tx, { fromId: session.sub, toId: to.id, amount, kind: "tip", refType: postId ? "post" : undefined, refId: postId });
    });
  } catch (e) {
    if (e instanceof InsufficientFunds) return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
    throw e;
  }
  await notify({ userId: to.id, actorId: session.sub, type: "tip", postId: postId ?? null });
  return NextResponse.json({ ok: true });
}
