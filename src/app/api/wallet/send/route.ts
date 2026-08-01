import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser, ensureNotBlocked } from "@/lib/auth";
import { transfer, InsufficientFunds } from "@/lib/wallet";
import { notify } from "@/lib/notifications";

const schema = z.object({ toUsername: z.string().min(1), amount: z.number().int().min(1).max(1000000000) });

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const blk = await ensureNotBlocked(session.sub);
  if (blk.blocked) return NextResponse.json({ error: blk.reason }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const { toUsername, amount } = parsed.data;

  const to = await prisma.user.findUnique({ where: { username: toUsername }, select: { id: true } });
  if (!to) return NextResponse.json({ error: "Usuario no existe" }, { status: 404 });
  if (to.id === session.sub) return NextResponse.json({ error: "No puedes enviarte a ti mismo" }, { status: 400 });

  try {
    await prisma.$transaction(async (tx) => {
      await transfer(tx, { fromId: session.sub, toId: to.id, amount, kind: "transfer" });
    });
  } catch (e) {
    if (e instanceof InsufficientFunds) return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
    throw e;
  }
  await notify({ userId: to.id, actorId: session.sub, type: "transfer" });
  return NextResponse.json({ ok: true });
}
