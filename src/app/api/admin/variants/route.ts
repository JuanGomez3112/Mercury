import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

const schema = z.object({
  productId: z.string().min(1),
  label: z.string().min(1),
  priceCredits: z.number().int().min(0),
  priceCents: z.number().int().min(0),
  stock: z.number().int().min(0),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Prohibido" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Inválido" }, { status: 400 });
  const v = await prisma.productVariant.create({ data: parsed.data });
  return NextResponse.json({ ok: true, id: v.id });
}
