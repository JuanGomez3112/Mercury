import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser, ensureNotBlocked } from "@/lib/auth";

const schema = z.object({
  body: z.string().trim().max(2000).default(""),
  images: z.array(z.string()).max(10).default([]),
  adult: z.boolean().default(false),
  priceCredits: z.number().int().min(1).max(100000).nullable().default(null),
});

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const blk = await ensureNotBlocked(session.sub);
  if (blk.blocked) return NextResponse.json({ error: blk.reason }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Inválido" }, { status: 400 });
  }
  const { body, images, adult, priceCredits } = parsed.data;
  if (!body && images.length === 0) {
    return NextResponse.json({ error: "Publicación vacía" }, { status: 400 });
  }

  if (priceCredits != null) {
    const author = await prisma.user.findUnique({ where: { id: session.sub }, select: { creatorMode: true } });
    if (!author?.creatorMode) {
      return NextResponse.json({ error: "Activa modo creador" }, { status: 403 });
    }
  }

  const post = await prisma.post.create({
    data: { authorId: session.sub, body, images, isAdult: adult, priceCredits },
  });
  return NextResponse.json({ ok: true, id: post.id });
}
