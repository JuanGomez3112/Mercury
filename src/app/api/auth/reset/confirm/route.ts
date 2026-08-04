import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, "Mínimo 8 caracteres").max(200),
});

/** Paso 2 del reset: token válido + nueva contraseña → actualiza. Single-use, con expiración. */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Inválido" }, { status: 400 });

  const tokenHash = crypto.createHash("sha256").update(parsed.data.token).digest("hex");
  const reset = await prisma.passwordReset.findUnique({ where: { tokenHash }, select: { id: true, userId: true, expiresAt: true, usedAt: true } });
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
    return NextResponse.json({ error: "Enlace inválido o vencido" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  try {
    await prisma.$transaction(async (tx) => {
      // Claim atómico: marca usado sólo si aún no lo estaba (evita doble uso por carrera).
      const claim = await tx.passwordReset.updateMany({ where: { id: reset.id, usedAt: null }, data: { usedAt: new Date() } });
      if (claim.count === 0) throw new Error("USED");
      await tx.user.update({ where: { id: reset.userId }, data: { passwordHash } });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "USED") return NextResponse.json({ error: "Enlace ya usado" }, { status: 400 });
    throw e;
  }

  return NextResponse.json({ ok: true });
}
