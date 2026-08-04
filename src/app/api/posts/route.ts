import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser, ensureNotBlocked } from "@/lib/auth";
import { notify } from "@/lib/notifications";

const schema = z.object({
  body: z.string().trim().max(2000).default(""),
  images: z.array(z.string()).max(10).default([]),
  adult: z.boolean().default(false),
  priceCredits: z.number().int().min(1).max(100000).nullable().default(null),
  location: z.string().trim().max(120).nullable().default(null),
  linkUrl: z.string().trim().url("Enlace inválido").max(500).nullable().default(null),
  poll: z
    .object({ options: z.array(z.string().trim().min(1).max(80)).min(2).max(6) })
    .nullable()
    .default(null),
});

/** Extrae @usuarios únicos del cuerpo (a-z, 0-9, _). */
function parseMentions(body: string): string[] {
  const set = new Set<string>();
  for (const m of body.matchAll(/@([a-zA-Z0-9_]{2,30})/g)) set.add(m[1].toLowerCase());
  return [...set];
}

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const blk = await ensureNotBlocked(session.sub);
  if (blk.blocked) return NextResponse.json({ error: blk.reason }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Inválido" }, { status: 400 });
  }
  const { body, images, adult, priceCredits, location, linkUrl, poll } = parsed.data;
  if (!body && images.length === 0 && !poll) {
    return NextResponse.json({ error: "Publicación vacía" }, { status: 400 });
  }

  if (priceCredits != null) {
    const author = await prisma.user.findUnique({ where: { id: session.sub }, select: { creatorMode: true } });
    if (!author?.creatorMode) {
      return NextResponse.json({ error: "Activa modo creador" }, { status: 403 });
    }
  }

  const link = linkUrl && /^https?:\/\//i.test(linkUrl) ? linkUrl : null;

  const post = await prisma.post.create({
    data: {
      authorId: session.sub,
      body,
      images,
      isAdult: adult,
      priceCredits,
      location: location || null,
      linkUrl: link,
      ...(poll
        ? {
            poll: {
              create: {
                options: { create: poll.options.map((text, i) => ({ text, order: i })) },
              },
            },
          }
        : {}),
    },
  });

  // Notificar a los mencionados existentes
  const mentions = parseMentions(body);
  if (mentions.length > 0) {
    const users = await prisma.user.findMany({
      where: { username: { in: mentions } },
      select: { id: true },
    });
    await Promise.all(
      users.map((u) => notify({ userId: u.id, actorId: session.sub, type: "mention", postId: post.id })),
    );
  }

  return NextResponse.json({ ok: true, id: post.id });
}
