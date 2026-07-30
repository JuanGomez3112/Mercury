import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { notify } from "@/lib/notifications";

const schema = z.object({ body: z.string().trim().min(1, "Vacío").max(1000) });

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const comments = await prisma.comment.findMany({
    where: { postId: id },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: { author: { select: { username: true, displayName: true, avatarUrl: true } } },
  });
  return NextResponse.json({ comments });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Inválido" }, { status: 400 });
  }

  const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true } });
  if (!post) return NextResponse.json({ error: "No existe" }, { status: 404 });

  const comment = await prisma.comment.create({
    data: { postId: id, authorId: session.sub, body: parsed.data.body },
    include: { author: { select: { username: true, displayName: true, avatarUrl: true } } },
  });
  await notify({ userId: post.authorId, actorId: session.sub, type: "comment", postId: id });
  return NextResponse.json({ ok: true, comment });
}
