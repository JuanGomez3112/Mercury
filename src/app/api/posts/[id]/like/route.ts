import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { notify, unnotify } from "@/lib/notifications";

// POST /api/posts/:id/like — toggle like
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: postId } = await params;
  const key = { userId_postId: { userId: session.sub, postId } };
  const existing = await prisma.like.findUnique({ where: key });
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
  if (!post) return NextResponse.json({ error: "No existe" }, { status: 404 });

  if (existing) {
    await prisma.like.delete({ where: key });
    await unnotify({ userId: post.authorId, actorId: session.sub, type: "like", postId });
  } else {
    await prisma.like.create({ data: { userId: session.sub, postId } });
    await notify({ userId: post.authorId, actorId: session.sub, type: "like", postId });
  }

  const count = await prisma.like.count({ where: { postId } });
  return NextResponse.json({ ok: true, liked: !existing, count });
}
