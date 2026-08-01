import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { setAdminUnlock } from "@/lib/session";

// Desbloquea el panel admin (segundo factor). Requiere isAdmin base + PIN admin correcto.
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Prohibido" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const pin = typeof body?.pin === "string" ? body.pin : "";

  const user = await prisma.user.findUnique({ where: { id: admin.id }, select: { adminPinHash: true } });
  if (!user?.adminPinHash) return NextResponse.json({ error: "Sin PIN admin configurado", needsPin: true }, { status: 400 });

  const ok = await bcrypt.compare(pin, user.adminPinHash);
  if (!ok) return NextResponse.json({ error: "PIN incorrecto" }, { status: 400 });

  await setAdminUnlock(admin.id);
  return NextResponse.json({ ok: true });
}
