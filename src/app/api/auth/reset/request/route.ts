import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

/** Paso 1 del reset: usuario/email → genera token → envía email con el link. Respuesta uniforme (anti-enumeración). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const identifier = String(body?.identifier ?? "").trim();
  const uniform = NextResponse.json({ ok: true }); // misma respuesta exista o no el usuario

  if (!identifier) return uniform;

  const user = await prisma.user.findFirst({
    where: { OR: [{ username: identifier }, { email: identifier }] },
    select: { id: true, email: true, recoveryEmail: true },
  });
  if (!user) return uniform;

  const dest = user.email ?? user.recoveryEmail;
  if (!dest) return uniform; // sin email al que enviar

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  await prisma.passwordReset.create({
    data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  });

  const base = (process.env.APP_URL ?? "").replace(/\/$/, "");
  const link = `${base}/recuperar/${token}`;
  await sendEmail({
    to: dest,
    subject: "Mercury — restablecer contraseña",
    html: `<p>Recibimos una solicitud para restablecer tu contraseña.</p>
           <p><a href="${link}">Haz clic aquí para establecer una nueva contraseña</a>. El enlace vence en 1 hora.</p>
           <p>Si no lo solicitaste, ignora este correo.</p>`,
    text: `Restablecer contraseña: ${link} (vence en 1 hora). Si no lo solicitaste, ignóralo.`,
  });

  return uniform;
}
