import { prisma } from "./db";

export type StoryItem = {
  id: string;
  mediaUrl: string;
  isVideo: boolean;
  createdAt: string;
  seen: boolean;
};

export type StoryGroup = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  mode: string | null;
  isMe: boolean;
  hasUnseen: boolean;
  items: StoryItem[];
};

/**
 * Historias activas (no expiradas) de mí + a quienes sigo, agrupadas por autor.
 * Orden: yo primero (si tengo), luego no-vistas antes que vistas, recientes arriba.
 */
export async function getStoryFeed(viewerId: string): Promise<StoryGroup[]> {
  const following = await prisma.follow.findMany({
    where: { followerId: viewerId },
    select: { followingId: true },
  });
  const authorIds = [viewerId, ...following.map((f) => f.followingId)];

  const stories = await prisma.story.findMany({
    where: { authorId: { in: authorIds }, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      mediaUrl: true,
      isVideo: true,
      createdAt: true,
      authorId: true,
      author: { select: { username: true, displayName: true, avatarUrl: true, mode: true } },
      views: { where: { viewerId }, select: { id: true } },
    },
  });
  if (stories.length === 0) return [];

  const groups = new Map<string, StoryGroup>();
  for (const s of stories) {
    let g = groups.get(s.authorId);
    if (!g) {
      g = {
        username: s.author.username,
        displayName: s.author.displayName,
        avatarUrl: s.author.avatarUrl,
        mode: s.author.mode,
        isMe: s.authorId === viewerId,
        hasUnseen: false,
        items: [],
      };
      groups.set(s.authorId, g);
    }
    const seen = s.views.length > 0;
    if (!seen && !g.isMe) g.hasUnseen = true;
    g.items.push({ id: s.id, mediaUrl: s.mediaUrl, isVideo: s.isVideo, createdAt: s.createdAt.toISOString(), seen });
  }

  const arr = [...groups.values()];
  arr.sort((a, b) => {
    if (a.isMe !== b.isMe) return a.isMe ? -1 : 1;
    if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
    return 0;
  });
  return arr;
}
