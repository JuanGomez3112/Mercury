import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

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

  if (existing) {
    await prisma.like.delete({ where: key });
  } else {
    // valida que el post exista (evita FK error silencioso)
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) return NextResponse.json({ error: "No existe" }, { status: 404 });
    await prisma.like.create({ data: { userId: session.sub, postId } });
  }

  const count = await prisma.like.count({ where: { postId } });
  return NextResponse.json({ ok: true, liked: !existing, count });
}
