import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { getThread } from "@/lib/queries";

// GET /api/messages/:username — hilo + marca como leídos los del interlocutor
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { username } = await params;
  const partner = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!partner) return NextResponse.json({ error: "No existe" }, { status: 404 });

  // marca leídos (del interlocutor hacia mí)
  await prisma.message.updateMany({
    where: { senderId: partner.id, recipientId: session.sub, readAt: null },
    data: { readAt: new Date() },
  });

  const messages = await getThread(session.sub, partner.id);
  return NextResponse.json({ messages });
}
