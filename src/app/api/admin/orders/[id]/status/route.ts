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
      if (status === "cancelled") {
        // Claim el cancel atómicamente: solo si no estaba ya cancelada (evita doble restock por carrera/doble-cancel).
        const claim = await tx.order.updateMany({ where: { id, status: { not: "cancelled" } }, data: { status: "cancelled" } });
        if (claim.count === 0) throw new Error("TERMINAL");
        for (const it of order.items) {
          if (it.variantId) {
            await tx.productVariant.updateMany({ where: { id: it.variantId }, data: { stock: { increment: it.qty } } });
          }
        }
      } else {
        // No permitir transiciones saliendo de "cancelled" (estado terminal).
        const upd = await tx.order.updateMany({ where: { id, status: { not: "cancelled" } }, data: { status } });
        if (upd.count === 0) throw new Error("TERMINAL");
      }
    });
  } catch (e) {
    if (e instanceof Error && e.message === "NF") return NextResponse.json({ error: "No existe" }, { status: 404 });
    if (e instanceof Error && e.message === "TERMINAL") return NextResponse.json({ error: "Orden cancelada (estado terminal) o no modificable" }, { status: 400 });
    throw e;
  }

  return NextResponse.json({ ok: true });
}
