import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser, ensureNotBlocked } from "@/lib/auth";

// POST /api/comments/:id/like — toggle like a un comentario
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const blk = await ensureNotBlocked(session.sub);
  if (blk.blocked) return NextResponse.json({ error: blk.reason }, { status: 403 });

  const { id: commentId } = await params;
  const comment = await prisma.comment.findUnique({ where: { id: commentId }, select: { id: true } });
  if (!comment) return NextResponse.json({ error: "No existe" }, { status: 404 });

  const key = { userId_commentId: { userId: session.sub, commentId } };
  const existing = await prisma.commentLike.findUnique({ where: key });
  if (existing) {
    await prisma.commentLike.delete({ where: key });
  } else {
    await prisma.commentLike.create({ data: { userId: session.sub, commentId } });
  }

  const count = await prisma.commentLike.count({ where: { commentId } });
  return NextResponse.json({ ok: true, liked: !existing, count });
}
