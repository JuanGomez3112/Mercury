import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

const schema = z.object({ qty: z.number().int().min(0) });

export async function POST(req: Request, { params }: { params: Promise<{ variantId: string }> }) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { variantId } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Inválido" }, { status: 400 });
  const { qty } = parsed.data;

  if (qty <= 0) {
    await prisma.cartItem.deleteMany({ where: { userId: session.sub, variantId } });
    return NextResponse.json({ ok: true });
  }

  const v = await prisma.productVariant.findUnique({ where: { id: variantId }, select: { active: true, stock: true } });
  if (!v || !v.active || v.stock <= 0) {
    await prisma.cartItem.deleteMany({ where: { userId: session.sub, variantId } });
    return NextResponse.json({ error: "No disponible" }, { status: 400 });
  }
  const next = Math.min(qty, v.stock);
  await prisma.cartItem.upsert({
    where: { userId_variantId: { userId: session.sub, variantId } },
    create: { userId: session.sub, variantId, qty: next },
    update: { qty: next },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ variantId: string }> }) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { variantId } = await params;
  await prisma.cartItem.deleteMany({ where: { userId: session.sub, variantId } });
  return NextResponse.json({ ok: true });
}
