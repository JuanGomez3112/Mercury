import { prisma } from "./db";
import type { FeedPost } from "./types";
import { getFeedPostsByWhere } from "./queries";

export type SearchType = "all" | "users" | "posts" | "tags" | "tabu" | "reels" | "grupos" | "paginas";
export type UserHit = { username: string; displayName: string | null; avatarUrl: string | null; mode: string | null };
export type TagHit = { tag: string; count: number };
export type GroupHit = { slug: string; name: string; memberCount: number };
export type PageHit = { slug: string; name: string; avatarUrl: string | null; followerCount: number };
export type SearchResult = { users: UserHit[]; posts: FeedPost[]; tags: TagHit[]; groups: GroupHit[]; pages: PageHit[] };

const VIDEO_RE = /\.(mp4|webm)(\?|$)/i;

export async function searchAll(viewerId: string, qRaw: string, type: SearchType): Promise<SearchResult> {
  const q = qRaw.trim();
  const empty: SearchResult = { users: [], posts: [], tags: [], groups: [], pages: [] };
  if (!q) return empty;

  const wantUsers = type === "all" || type === "users";
  const wantPosts = type === "all" || type === "posts" || type === "tabu" || type === "reels";
  const wantTags = type === "all" || type === "tags";
  const wantGroups = type === "all" || type === "grupos";
  const wantPages = type === "all" || type === "paginas";

  const users: UserHit[] = wantUsers
    ? await prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: q, mode: "insensitive" } },
            { displayName: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 10,
        select: { username: true, displayName: true, avatarUrl: true, mode: true },
      })
    : [];

  let posts: FeedPost[] = [];
  if (wantPosts) {
    const bodyWhere = { body: { contains: q.replace(/^#/, ""), mode: "insensitive" as const } };
    const where =
      type === "tabu"
        ? { ...bodyWhere, isAdult: true }
        : bodyWhere;
    posts = await getFeedPostsByWhere(viewerId, where, type === "reels" ? 100 : 20);
    if (type === "reels") posts = posts.filter((p) => p.images.some((u) => VIDEO_RE.test(u))).slice(0, 20);
  }

  let tags: TagHit[] = [];
  if (wantTags) {
    const needle = q.replace(/^#/, "").toLowerCase();
    const recent = await prisma.post.findMany({
      where: { body: { contains: needle, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { body: true },
    });
    const counts = new Map<string, number>();
    for (const p of recent) {
      const found = p.body.match(/#[\p{L}0-9_]+/gu) ?? [];
      for (const t of found) {
        const k = t.toLowerCase();
        if (k.includes(needle)) counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
    tags = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));
  }

  const groups: GroupHit[] = wantGroups
    ? (await prisma.group.findMany({
        where: { name: { contains: q, mode: "insensitive" } },
        take: 10,
        select: { slug: true, name: true, _count: { select: { members: true } } },
      })).map((g) => ({ slug: g.slug, name: g.name, memberCount: g._count.members }))
    : [];

  const pages: PageHit[] = wantPages
    ? (await prisma.page.findMany({
        where: { name: { contains: q, mode: "insensitive" } },
        take: 10,
        select: { slug: true, name: true, avatarUrl: true, _count: { select: { followers: true } } },
      })).map((p) => ({ slug: p.slug, name: p.name, avatarUrl: p.avatarUrl, followerCount: p._count.followers }))
    : [];

  return { users, posts, tags, groups, pages };
}
