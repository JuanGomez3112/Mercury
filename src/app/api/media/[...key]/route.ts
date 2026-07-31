import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { hasPostAccess, hasMessageAccess } from "@/lib/entitlement";
import { presignGet } from "@/lib/s3";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { key: parts } = await params;
  const key = parts.join("/");
  const url = `/api/media/${key}`;

  // ¿A qué post pertenece?
  // Nota: Post.priceCredits aún no existe en el schema (llega en Bloque 4); se
  // pasa `priceCredits: null` explícitamente, lo que hoy es siempre correcto
  // (ningún post puede tener precio todavía) y es forward-compatible con
  // hasPostAccess una vez que el campo se agregue.
  const post = await prisma.post.findFirst({
    where: { images: { has: url } },
    select: { id: true, authorId: true },
  });
  if (post) {
    if (!(await hasPostAccess(session.sub, { ...post, priceCredits: null }))) {
      return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    }
    return NextResponse.redirect(await presignGet(key));
  }

  // ¿A qué mensaje? (Message.priceCredits llega en Bloque 7; mismo razonamiento que arriba.)
  const msg = await prisma.message.findFirst({
    where: { imageUrl: url },
    select: { id: true, senderId: true, recipientId: true },
  });
  if (msg) {
    if (msg.recipientId !== session.sub && msg.senderId !== session.sub) {
      return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    }
    if (!(await hasMessageAccess(session.sub, { ...msg, priceCredits: null }))) {
      return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    }
    return NextResponse.redirect(await presignGet(key));
  }

  return NextResponse.json({ error: "No encontrado" }, { status: 404 });
}
