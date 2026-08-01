import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { getConfig, burnToTreasury } from "@/lib/token";

export const MIN_WITHDRAW = 100;

const schema = z.object({ credits: z.number().int().min(1), payoutInfo: z.string().trim().min(1).max(500) });

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const { credits, payoutInfo } = parsed.data;

  const cfg = await getConfig();
  if (!cfg.launched) return NextResponse.json({ error: "Retiros no disponibles (pre-lanzamiento)" }, { status: 400 });
  if (credits < MIN_WITHDRAW) return NextResponse.json({ error: `Mínimo ${MIN_WITHDRAW} ☾` }, { status: 400 });
  const amountCents = credits * cfg.rateCents;

  try {
    await prisma.$transaction(async (tx) => {
      const debit = await tx.user.updateMany({
        where: { id: session.sub, earnings: { gte: credits } },
        data: { earnings: { decrement: credits } },
      });
      if (debit.count === 0) throw new Error("EARN");
      await burnToTreasury(tx, credits);
      await tx.walletTransaction.create({ data: { userId: session.sub, delta: -credits, type: "withdraw" } });
      await tx.withdrawal.create({ data: { userId: session.sub, credits, amountCents, payoutInfo } });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "EARN") return NextResponse.json({ error: "Ganancias insuficientes" }, { status: 400 });
    throw e;
  }
  return NextResponse.json({ ok: true });
}
