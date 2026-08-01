import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminUnlocked } from "@/lib/admin";

const schema = z.object({
  name: z.string().min(1),
  countries: z.array(z.string()).default([]),
  priceCents: z.number().int().min(0).default(0),
  priceCredits: z.number().int().min(0).default(0),
  isDefault: z.boolean().default(false),
});

export async function POST(req: Request) {
  const admin = await requireAdminUnlocked();
  if (!admin) return NextResponse.json({ error: "Prohibido" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Inválido" }, { status: 400 });
  const { isDefault, ...data } = parsed.data;

  const zone = await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.shippingZone.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }
    return tx.shippingZone.create({ data: { ...data, isDefault } });
  });
  return NextResponse.json({ ok: true, id: zone.id });
}
