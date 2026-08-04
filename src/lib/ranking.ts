import { prisma } from "./db";

// Ranking de feed por comportamiento. Heurístico, sin ML. Señales ya en DB.

const W = { author: 3, tag: 1.5, popularity: 1, recency: 1.5, cold: 2 };
const RECENCY_TAU_H = 48; // horas
const POP_NORM = Math.log(60);

export type ViewerSignals = {
  authorAffinity: Map<string, number>; // authorId → peso acumulado
  tagProfile: Map<string, number>;     // hashtag → frecuencia (de lo que te gusta)
  prefs: { sexuality: string | null; nationality: string | null; mode: string | null };
  signalCount: number;                 // total de señales conductuales (para atenuar cold-start)
};

export type AuthorAttr = { sexuality: string | null; nationality: string | null; mode: string | null };

function extractTags(body: string): string[] {
  return (body.match(/#(\w{2,30})/g) ?? []).map((t) => t.slice(1).toLowerCase());
}

/** Carga en lote las señales del viewer (pocas queries acotadas). */
export async function loadViewerSignals(viewerId: string): Promise<ViewerSignals> {
  const [likes, follows, purchases, bookmarks, me] = await Promise.all([
    prisma.like.findMany({ where: { userId: viewerId }, take: 500, select: { post: { select: { authorId: true, body: true } } } }),
    prisma.follow.findMany({ where: { followerId: viewerId }, take: 500, select: { followingId: true } }),
    prisma.purchase.findMany({ where: { buyerId: viewerId, kind: "post" }, take: 300, select: { postId: true } }),
    prisma.bookmark.findMany({ where: { userId: viewerId }, take: 300, select: { post: { select: { authorId: true, body: true } } } }),
    prisma.user.findUnique({ where: { id: viewerId }, select: { sexuality: true, nationality: true, mode: true } }),
  ]);

  const authorAffinity = new Map<string, number>();
  const bump = (id: string | undefined | null, w: number) => { if (id) authorAffinity.set(id, (authorAffinity.get(id) ?? 0) + w); };
  const tagProfile = new Map<string, number>();
  const addTags = (body: string) => extractTags(body).forEach((t) => tagProfile.set(t, (tagProfile.get(t) ?? 0) + 1));

  likes.forEach((l) => { bump(l.post?.authorId, 1); if (l.post?.body) addTags(l.post.body); });
  follows.forEach((f) => bump(f.followingId, 2));
  bookmarks.forEach((b) => { bump(b.post?.authorId, 1.5); if (b.post?.body) addTags(b.post.body); });

  // Purchase no tiene relación post; resolver autores de los posts comprados en lote.
  const purchasedPostIds = purchases.map((p) => p.postId).filter((x): x is string => !!x);
  if (purchasedPostIds.length) {
    const pp = await prisma.post.findMany({ where: { id: { in: purchasedPostIds } }, select: { authorId: true } });
    pp.forEach((p) => bump(p.authorId, 3));
  }

  const signalCount = likes.length + follows.length + purchases.length + bookmarks.length;
  return { authorAffinity, tagProfile, prefs: me ?? { sexuality: null, nationality: null, mode: null }, signalCount };
}

/** Atributos de autor para cold-start, en lote. */
export async function loadAuthorAttrs(authorIds: string[]): Promise<Map<string, AuthorAttr>> {
  const ids = [...new Set(authorIds)];
  const rows = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, sexuality: true, nationality: true, mode: true } });
  return new Map(rows.map((r) => [r.id, { sexuality: r.sexuality, nationality: r.nationality, mode: r.mode }]));
}

function coldStartWeight(signalCount: number): number {
  return 1 / (1 + signalCount / 8); // 1 sin conducta → decae al acumular señales
}

function coldMatch(prefs: ViewerSignals["prefs"], attr?: AuthorAttr): number {
  if (!attr) return 0;
  let s = 0;
  if (prefs.nationality && attr.nationality && prefs.nationality === attr.nationality) s += 0.5;
  if (prefs.mode && attr.mode && prefs.mode === attr.mode) s += 0.3;
  if (prefs.sexuality && attr.sexuality && prefs.sexuality === attr.sexuality) s += 0.2;
  return s;
}

type Candidate = { authorId: string; body: string; createdAt: Date; _count: { likes: number; comments: number } };

export function scorePost(post: Candidate, sig: ViewerSignals, authorAttrs: Map<string, AuthorAttr>, now: number): number {
  const affinity = Math.min((sig.authorAffinity.get(post.authorId) ?? 0) / 5, 1);
  const tags = extractTags(post.body);
  const tagAff = tags.length === 0 ? 0 : Math.min(tags.reduce((a, t) => a + (sig.tagProfile.get(t) ? 1 : 0), 0) / tags.length, 1);
  const popularity = Math.min(Math.log1p(post._count.likes + post._count.comments) / POP_NORM, 1);
  const hours = (now - post.createdAt.getTime()) / 3_600_000;
  const recency = Math.exp(-hours / RECENCY_TAU_H);
  const cold = coldStartWeight(sig.signalCount) * coldMatch(sig.prefs, authorAttrs.get(post.authorId));
  return W.author * affinity + W.tag * tagAff + W.popularity * popularity + W.recency * recency + W.cold * cold;
}

/** Ordena por score y evita el mismo autor consecutivo (diversidad). */
export function arrangeByScore<T extends { authorId: string; _score: number }>(items: T[]): T[] {
  const sorted = [...items].sort((a, b) => b._score - a._score);
  const out: T[] = [];
  const pending = [...sorted];
  while (pending.length) {
    let i = pending.findIndex((p) => out.length === 0 || p.authorId !== out[out.length - 1].authorId);
    if (i === -1) i = 0;
    out.push(pending.splice(i, 1)[0]);
  }
  return out;
}
