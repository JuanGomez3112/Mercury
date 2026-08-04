import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser, ensureNotBlocked } from "@/lib/auth";

const schema = z.object({
  title: z.string().trim().min(1, "Título requerido").max(120),
  description: z.string().trim().max(2000).default(""),
  images: z.array(z.string()).max(10).default([]),
  priceCredits: z.number().int().min(0).max(10_000_000),
  acceptsCredits: z.boolean().default(true),
  acceptsCash: z.boolean().default(false),
  condition: z.enum(["new", "used"]).default("used"),
  category: z.string().trim().max(40).default("otros"),
  location: z.string().trim().max(200).default(""),
});

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const blk = await ensureNotBlocked(session.sub);
  if (blk.blocked) return NextResponse.json({ error: blk.reason }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Inválido" }, { status: 400 });
  const d = parsed.data;
  if (!d.acceptsCredits && !d.acceptsCash) return NextResponse.json({ error: "Elige al menos un método de pago" }, { status: 400 });

  const listing = await prisma.listing.create({
    data: { sellerId: session.sub, ...d },
  });
  return NextResponse.json({ ok: true, id: listing.id });
}
