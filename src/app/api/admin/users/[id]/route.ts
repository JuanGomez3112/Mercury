import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminUnlocked } from "@/lib/admin";

const schema = z.object({
  action: z.enum(["ban", "unban", "suspend"]),
  days: z.number().int().min(1).max(3650).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUnlocked();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Inválido" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, isAdmin: true } });
  if (!target) return NextResponse.json({ error: "No existe" }, { status: 404 });
  if (target.isAdmin) return NextResponse.json({ error: "No puedes sancionar a un admin" }, { status: 400 });

  const data =
    parsed.data.action === "ban"
      ? { banned: true }
      : parsed.data.action === "unban"
      ? { banned: false, suspendedUntil: null }
      : { suspendedUntil: new Date(Date.now() + (parsed.data.days ?? 7) * 24 * 60 * 60 * 1000) };

  await prisma.user.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
