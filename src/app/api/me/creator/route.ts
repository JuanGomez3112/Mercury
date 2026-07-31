import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

const schema = z.object({
  creatorMode: z.boolean(),
  subPriceCredits: z.number().int().min(1).max(100000).nullable().optional(),
});

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const { creatorMode, subPriceCredits } = parsed.data;
  await prisma.user.update({
    where: { id: session.sub },
    data: { creatorMode, subPriceCredits: creatorMode ? (subPriceCredits ?? null) : null },
  });
  return NextResponse.json({ ok: true });
}
