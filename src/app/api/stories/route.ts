import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser, ensureNotBlocked } from "@/lib/auth";

const schema = z.object({
  mediaUrl: z.string().min(1),
  isVideo: z.boolean().default(false),
});

const DAY_MS = 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const blk = await ensureNotBlocked(session.sub);
  if (blk.blocked) return NextResponse.json({ error: blk.reason }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Inválido" }, { status: 400 });

  const story = await prisma.story.create({
    data: {
      authorId: session.sub,
      mediaUrl: parsed.data.mediaUrl,
      isVideo: parsed.data.isVideo,
      expiresAt: new Date(Date.now() + DAY_MS),
    },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: story.id });
}
