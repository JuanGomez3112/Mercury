import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { mint } from "@/lib/token";

const schema = z.object({ action: z.enum(["paid", "rejected"]) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Prohibido" }, { status: 403 });
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Inválido" }, { status: 400 });

  const w = await prisma.withdrawal.findUnique({ where: { id } });
  if (!w || w.status !== "pending") return NextResponse.json({ error: "No pendiente" }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    if (parsed.data.action === "rejected") {
      // Reembolsa: re-mintea del treasury a earnings.
      await mint(tx, w.userId, w.credits, true);
      await tx.walletTransaction.create({ data: { userId: w.userId, delta: w.credits, type: "withdraw_refund" } });
    }
    await tx.withdrawal.update({ where: { id }, data: { status: parsed.data.action, resolvedAt: new Date() } });
  });
  // notify() ignora auto-notificación (userId===actorId); aquí userId===actorId por diseño (notif de sistema al propio usuario),
  // así que se crea la notificación directamente en vez de usar notify().
  await prisma.notification.create({ data: { userId: w.userId, actorId: w.userId, type: "withdrawal" } });
  return NextResponse.json({ ok: true });
}
