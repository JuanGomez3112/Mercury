import { prisma } from "./db";

export type Candidate = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
};

export type MatchUser = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

/** Par ordenado (menor, mayor) para deduplicar matches. */
export function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/** Usuarios que aún no he swipeado (ni yo mismo). */
export async function getCandidates(userId: string, take = 20): Promise<Candidate[]> {
  const swiped = await prisma.swipe.findMany({
    where: { swiperId: userId },
    select: { targetId: true },
  });
  const exclude = [userId, ...swiped.map((s) => s.targetId)];
  return prisma.user.findMany({
    where: { id: { notIn: exclude }, banned: false },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, username: true, displayName: true, avatarUrl: true, coverUrl: true, bio: true },
  });
}

/** Mis matches (el otro usuario de cada par). */
export async function getMatches(userId: string): Promise<MatchUser[]> {
  const matches = await prisma.match.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    orderBy: { createdAt: "desc" },
  });
  const otherIds = matches.map((m) => (m.userAId === userId ? m.userBId : m.userAId));
  if (otherIds.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: otherIds } },
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  return otherIds.map((id) => byId.get(id)).filter((u): u is MatchUser => !!u);
}
