import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminUnlocked } from "@/lib/admin";
import { getConfig } from "@/lib/token";

const schema = z.object({
  rateCents: z.number().int().min(1).optional(),
  launched: z.boolean().optional(),
});

export async function POST(req: Request) {
  const admin = await requireAdminUnlocked();
  if (!admin) return NextResponse.json({ error: "Prohibido" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Inválido" }, { status: 400 });

  await getConfig();
  await prisma.tokenConfig.update({ where: { id: "singleton" }, data: parsed.data });
  return NextResponse.json({ ok: true });
}
