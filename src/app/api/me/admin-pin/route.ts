import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { adminPinSchema } from "@/lib/validation";

// Configurar/cambiar el PIN admin (segundo factor). Solo admins.
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Prohibido" }, { status: 403 });

  const parsed = adminPinSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { current, next } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: admin.id }, select: { adminPinHash: true } });
  if (user?.adminPinHash) {
    if (!current) return NextResponse.json({ error: "PIN actual requerido" }, { status: 400 });
    const ok = await bcrypt.compare(current, user.adminPinHash);
    if (!ok) return NextResponse.json({ error: "PIN actual incorrecto" }, { status: 400 });
  }

  const adminPinHash = await bcrypt.hash(next, 10);
  await prisma.user.update({ where: { id: admin.id }, data: { adminPinHash } });
  return NextResponse.json({ ok: true });
}
