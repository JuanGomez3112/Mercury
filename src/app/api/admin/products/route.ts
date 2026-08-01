import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminUnlocked } from "@/lib/admin";

const schema = z.object({ name: z.string().min(1), description: z.string().default(""), images: z.array(z.string()).default([]) });

export async function POST(req: Request) {
  const admin = await requireAdminUnlocked();
  if (!admin) return NextResponse.json({ error: "Prohibido" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Inválido" }, { status: 400 });
  const p = await prisma.product.create({ data: { ...parsed.data, sellerId: null } });
  return NextResponse.json({ ok: true, id: p.id });
}
