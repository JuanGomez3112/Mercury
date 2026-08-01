import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

const schema = z.object({ status: z.enum(["paid", "shipped", "delivered", "cancelled"]) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Prohibido" }, { status: 403 });
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Inválido" }, { status: 400 });
  const { status } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
      if (!order) throw new Error("NF");
      if (status === "cancelled" && order.status !== "cancelled") {
        for (const it of order.items) {
          if (it.variantId) {
            await tx.productVariant.updateMany({ where: { id: it.variantId }, data: { stock: { increment: it.qty } } });
          }
        }
      }
      await tx.order.update({ where: { id }, data: { status } });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "NF") return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    throw e;
  }

  return NextResponse.json({ ok: true });
}
