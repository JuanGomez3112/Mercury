import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

const schema = z.object({
  to: z.string().min(1),
  body: z.string().trim().min(1, "Vacío").max(2000),
});

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Inválido" }, { status: 400 });
  }

  const recipient = await prisma.user.findUnique({
    where: { username: parsed.data.to },
    select: { id: true },
  });
  if (!recipient) return NextResponse.json({ error: "Usuario no existe" }, { status: 404 });
  if (recipient.id === session.sub) {
    return NextResponse.json({ error: "No puedes enviarte mensajes" }, { status: 400 });
  }

  const msg = await prisma.message.create({
    data: { senderId: session.sub, recipientId: recipient.id, body: parsed.data.body },
  });
  return NextResponse.json({ ok: true, id: msg.id });
}
