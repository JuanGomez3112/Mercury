import { prisma } from "./db";
import type { FeedPost } from "./types";

type Row = {
  id: string;
  body: string;
  images: string[];
  isAdult: boolean;
  createdAt: Date;
  authorId: string;
  author: { username: string; displayName: string | null; avatarUrl: string | null };
  _count: { likes: number; comments: number };
  likes: { userId: string }[];
};

function toFeedPost(p: Row, viewerId: string): FeedPost {
  return {
    id: p.id,
    body: p.body,
    images: p.images,
    isAdult: p.isAdult,
    createdAt: p.createdAt,
    author: p.author,
    likeCount: p._count.likes,
    commentCount: p._count.comments,
    likedByMe: p.likes.length > 0,
    isMine: p.authorId === viewerId,
  };
}

const include = (viewerId: string) => ({
  author: { select: { username: true, displayName: true, avatarUrl: true } },
  _count: { select: { likes: true, comments: true } },
  likes: { where: { userId: viewerId }, select: { userId: true } },
});

export type FeedTab = "feed" | "explora" | "tabu";

/**
 * Feed por pestaña:
 * - feed: tuyo + a quienes sigues (sin adulto)
 * - explora: gente que NO sigues (descubrir, sin adulto)
 * - tabu: contenido adulto (18+)
 */
export async function getFeedByTab(viewerId: string, tab: FeedTab): Promise<FeedPost[]> {
  let where;
  if (tab === "tabu") {
    where = { isAdult: true };
  } else {
    const following = await prisma.follow.findMany({
      where: { followerId: viewerId },
      select: { followingId: true },
    });
    const circle = [viewerId, ...following.map((f) => f.followingId)];
    where =
      tab === "feed"
        ? { authorId: { in: circle }, isAdult: false }
        : { authorId: { notIn: circle }, isAdult: false };
  }
  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: include(viewerId),
  });
  return posts.map((p) => toFeedPost(p as Row, viewerId));
}

/** Tendencias: hashtags más usados en los posts recientes. */
export async function getTrends(limit = 6): Promise<{ tag: string; count: number }[]> {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    select: { body: true },
  });
  const counts = new Map<string, number>();
  for (const p of posts) {
    const tags = p.body.match(/#[\p{L}0-9_]+/gu) ?? [];
    for (const t of tags) {
      const k = t.toLowerCase();
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
}

/** Publicaciones de un autor concreto. */
export async function getUserPosts(authorId: string, viewerId: string): Promise<FeedPost[]> {
  const posts = await prisma.post.findMany({
    where: { authorId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: include(viewerId),
  });
  return posts.map((p) => toFeedPost(p as Row, viewerId));
}
