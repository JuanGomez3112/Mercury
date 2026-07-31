import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { setTabuUnlock } from "@/lib/session";

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const pin = typeof body?.pin === "string" ? body.pin : "";

  const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { tabuPinHash: true } });
  if (!user?.tabuPinHash) return NextResponse.json({ error: "Sin clave configurada", needsPin: true }, { status: 400 });

  const ok = await bcrypt.compare(pin, user.tabuPinHash);
  if (!ok) return NextResponse.json({ error: "Clave incorrecta" }, { status: 400 });

  await setTabuUnlock(session.sub);
  return NextResponse.json({ ok: true });
}
