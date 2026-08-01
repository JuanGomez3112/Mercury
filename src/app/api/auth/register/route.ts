import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validation";
import { createSession } from "@/lib/session";
import { mint } from "@/lib/token";
import { WELCOME_CREDITS } from "@/lib/wallet";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Datos inválidos";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const { nombre, apellido, username, password, birthdate } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) {
    return NextResponse.json({ error: "Ese usuario ya existe" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const displayName = [nombre, apellido].filter(Boolean).join(" ").trim();

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        username,
        passwordHash,
        displayName: displayName || nombre,
        birthdate: new Date(birthdate),
        ageVerified: true,
      },
    });
    await mint(tx, u.id, WELCOME_CREDITS);
    await tx.walletTransaction.create({ data: { userId: u.id, delta: WELCOME_CREDITS, type: "welcome" } });
    return u;
  });

  await createSession({ sub: user.id, username: user.username });
  return NextResponse.json({ ok: true });
}
