import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminUnlocked } from "@/lib/admin";

const schema = z.object({
  name: z.string().min(1).optional(),
  countries: z.array(z.string()).optional(),
  priceCents: z.number().int().min(0).optional(),
  priceCredits: z.number().int().min(0).optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUnlocked();
  if (!admin) return NextResponse.json({ error: "Prohibido" }, { status: 403 });
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Inválido" }, { status: 400 });
  const { isDefault, ...data } = parsed.data;

  await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.shippingZone.updateMany({ where: { isDefault: true, NOT: { id } }, data: { isDefault: false } });
    }
    await tx.shippingZone.update({ where: { id }, data: { ...data, ...(isDefault !== undefined ? { isDefault } : {}) } });
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUnlocked();
  if (!admin) return NextResponse.json({ error: "Prohibido" }, { status: 403 });
  const { id } = await params;
  await prisma.shippingZone.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
