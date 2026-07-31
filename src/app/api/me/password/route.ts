import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { current, next } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { passwordHash: true },
  });
  if (!user) return NextResponse.json({ error: "No existe" }, { status: 404 });

  if (user.passwordHash) {
    if (!current) return NextResponse.json({ error: "Contraseña actual requerida" }, { status: 400 });
    const ok = await bcrypt.compare(current, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(next, 10);
  await prisma.user.update({ where: { id: session.sub }, data: { passwordHash } });
  return NextResponse.json({ ok: true });
}
