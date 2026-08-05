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
  collaborators: z
    .array(z.object({ username: z.string().trim().min(1), percent: z.number().int().min(1).max(99) }))
    .max(5)
    .default([]),
  groupId: z.string().optional(),
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
  const { body, images, adult, priceCredits, location, linkUrl, poll, collaborators, groupId } = parsed.data;
  if (!body && images.length === 0 && !poll) {
    return NextResponse.json({ error: "Publicación vacía" }, { status: 400 });
  }

  // Publicar en grupo requiere ser miembro
  if (groupId) {
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: session.sub } },
      select: { id: true },
    });
    if (!member) return NextResponse.json({ error: "No eres miembro del grupo" }, { status: 403 });
  }

  // Colaboradores (reparto de ganancias) — solo en contenido de pago
  let collabCreate: { userId: string; percent: number }[] = [];
  if (priceCredits != null) {
    const author = await prisma.user.findUnique({ where: { id: session.sub }, select: { creatorMode: true } });
    if (!author?.creatorMode) {
      return NextResponse.json({ error: "Activa modo creador" }, { status: 403 });
    }
    if (collaborators.length > 0) {
      const sum = collaborators.reduce((s, c) => s + c.percent, 0);
      if (sum > 99) return NextResponse.json({ error: "La suma de porcentajes debe dejar al menos 1% para ti" }, { status: 400 });
      const names = collaborators.map((c) => c.username.replace(/^@/, ""));
      const users = await prisma.user.findMany({ where: { username: { in: names } }, select: { id: true, username: true } });
      const byName = new Map(users.map((u) => [u.username.toLowerCase(), u.id]));
      for (const c of collaborators) {
        const uid = byName.get(c.username.replace(/^@/, "").toLowerCase());
        if (!uid) return NextResponse.json({ error: `@${c.username} no existe` }, { status: 400 });
        if (uid === session.sub) return NextResponse.json({ error: "No puedes añadirte como colaborador" }, { status: 400 });
        if (collabCreate.some((x) => x.userId === uid)) return NextResponse.json({ error: "Colaborador repetido" }, { status: 400 });
        collabCreate.push({ userId: uid, percent: c.percent });
      }
    }
  } else {
    collabCreate = [];
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
      groupId: groupId || null,
      ...(poll
        ? {
            poll: {
              create: {
                options: { create: poll.options.map((text, i) => ({ text, order: i })) },
              },
            },
          }
        : {}),
      ...(collabCreate.length > 0 ? { collaborators: { create: collabCreate } } : {}),
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
