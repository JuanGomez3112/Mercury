import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

const schema = z.object({ variantId: z.string().min(1), qty: z.number().int().min(1).default(1) });

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Inválido" }, { status: 400 });
  const { variantId, qty } = parsed.data;
  const v = await prisma.productVariant.findUnique({ where: { id: variantId }, select: { active: true, stock: true } });
  if (!v || !v.active || v.stock <= 0) return NextResponse.json({ error: "No disponible" }, { status: 400 });
  const existing = await prisma.cartItem.findUnique({ where: { userId_variantId: { userId: session.sub, variantId } } });
  const next = Math.min((existing?.qty ?? 0) + qty, v.stock);
  await prisma.cartItem.upsert({
    where: { userId_variantId: { userId: session.sub, variantId } },
    create: { userId: session.sub, variantId, qty: next },
    update: { qty: next },
  });
  return NextResponse.json({ ok: true });
}
