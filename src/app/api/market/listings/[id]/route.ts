import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  priceCredits: z.number().int().min(0).max(10_000_000).optional(),
  acceptsCredits: z.boolean().optional(),
  acceptsCash: z.boolean().optional(),
  condition: z.enum(["new", "used"]).optional(),
  category: z.string().trim().max(40).optional(),
  location: z.string().trim().max(200).optional(),
  status: z.enum(["active", "sold", "removed"]).optional(),
});

async function ownListing(id: string, userId: string) {
  const l = await prisma.listing.findUnique({ where: { id }, select: { id: true, sellerId: true } });
  if (!l) return { error: NextResponse.json({ error: "No existe" }, { status: 404 }) };
  if (l.sellerId !== userId) return { error: NextResponse.json({ error: "No es tuyo" }, { status: 403 }) };
  return { ok: true as const };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const own = await ownListing(id, session.sub);
  if ("error" in own) return own.error;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Inválido" }, { status: 400 });
  await prisma.listing.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const own = await ownListing(id, session.sub);
  if ("error" in own) return own.error;
  await prisma.listing.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
