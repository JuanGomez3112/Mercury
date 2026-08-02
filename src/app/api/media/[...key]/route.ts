import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { hasPostAccess, hasMessageAccess } from "@/lib/entitlement";
import { s3, PAID_BUCKET } from "@/lib/s3";

/** Transmite el objeto privado desde MinIO (server-side). No redirige a una URL prefirmada:
 * el endpoint 127.0.0.1:9000 es interno y el navegador del cliente no lo alcanza. */
async function streamObject(key: string) {
  const obj = await s3.send(new GetObjectCommand({ Bucket: PAID_BUCKET, Key: key }));
  if (!obj.Body) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return new NextResponse(obj.Body.transformToWebStream(), {
    headers: {
      "Content-Type": obj.ContentType ?? "application/octet-stream",
      "Cache-Control": "private, no-store",
    },
  });
}

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
  const post = await prisma.post.findFirst({
    where: { images: { has: url } },
    select: { id: true, authorId: true, priceCredits: true },
  });
  if (post) {
    if (!(await hasPostAccess(session.sub, post))) {
      return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    }
    return streamObject(key);
  }

  // ¿A qué mensaje?
  const msg = await prisma.message.findFirst({
    where: { imageUrl: url },
    select: { id: true, senderId: true, recipientId: true, priceCredits: true },
  });
  if (msg) {
    if (msg.recipientId !== session.sub && msg.senderId !== session.sub) {
      return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    }
    if (!(await hasMessageAccess(session.sub, msg))) {
      return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    }
    return streamObject(key);
  }

  return NextResponse.json({ error: "No encontrado" }, { status: 404 });
}
