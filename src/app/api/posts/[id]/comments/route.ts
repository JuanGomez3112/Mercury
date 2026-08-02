import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser, ensureNotBlocked } from "@/lib/auth";
import { notify } from "@/lib/notifications";

const schema = z.object({ body: z.string().trim().min(1, "Vacío").max(1000) });

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sort = new URL(req.url).searchParams.get("sort"); // recent | relevant | (default asc)
  const session = await currentUser();

  const rows = await prisma.comment.findMany({
    where: { postId: id },
    orderBy:
      sort === "relevant"
        ? [{ likes: { _count: "desc" } }, { createdAt: "desc" }]
        : sort === "recent"
          ? { createdAt: "desc" }
          : { createdAt: "asc" },
    take: 200,
    include: {
      author: { select: { username: true, displayName: true, avatarUrl: true } },
      _count: { select: { likes: true } },
      likes: { where: { userId: session?.sub ?? "" }, select: { userId: true } },
    },
  });

  const comments = rows.map((c) => ({
    id: c.id,
    body: c.body,
    createdAt: c.createdAt,
    author: c.author,
    likeCount: c._count.likes,
    likedByMe: c.likes.length > 0,
  }));
  return NextResponse.json({ comments });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const blk = await ensureNotBlocked(session.sub);
  if (blk.blocked) return NextResponse.json({ error: blk.reason }, { status: 403 });

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Inválido" }, { status: 400 });
  }

  const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true } });
  if (!post) return NextResponse.json({ error: "No existe" }, { status: 404 });

  const created = await prisma.comment.create({
    data: { postId: id, authorId: session.sub, body: parsed.data.body },
    include: { author: { select: { username: true, displayName: true, avatarUrl: true } } },
  });
  await notify({ userId: post.authorId, actorId: session.sub, type: "comment", postId: id });
  const comment = {
    id: created.id,
    body: created.body,
    createdAt: created.createdAt,
    author: created.author,
    likeCount: 0,
    likedByMe: false,
  };
  return NextResponse.json({ ok: true, comment });
}
