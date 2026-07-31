import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { tabuPinSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = tabuPinSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { current, next } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { tabuPinHash: true } });
  if (!user) return NextResponse.json({ error: "No existe" }, { status: 404 });

  if (user.tabuPinHash) {
    if (!current) return NextResponse.json({ error: "Clave actual requerida" }, { status: 400 });
    const ok = await bcrypt.compare(current, user.tabuPinHash);
    if (!ok) return NextResponse.json({ error: "Clave actual incorrecta" }, { status: 400 });
  }

  const tabuPinHash = await bcrypt.hash(next, 10);
  await prisma.user.update({ where: { id: session.sub }, data: { tabuPinHash } });
  return NextResponse.json({ ok: true });
}
