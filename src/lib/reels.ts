import { prisma } from "./db";

export type ReelItem = {
  id: string;
  videoUrl: string;
  caption: string | null;
  createdAt: string;
  author: { username: string; displayName: string | null; avatarUrl: string | null };
  likeCount: number;
  likedByMe: boolean;
  isMine: boolean;
};

/** Feed de reels: recientes de todos, con estado de like del viewer. */
export async function getReelsFeed(viewerId: string, take = 30): Promise<ReelItem[]> {
  const reels = await prisma.reel.findMany({
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      videoUrl: true,
      caption: true,
      createdAt: true,
      authorId: true,
      author: { select: { username: true, displayName: true, avatarUrl: true } },
      _count: { select: { likes: true } },
      likes: { where: { userId: viewerId }, select: { id: true } },
    },
  });
  return reels.map((r) => ({
    id: r.id,
    videoUrl: r.videoUrl,
    caption: r.caption,
    createdAt: r.createdAt.toISOString(),
    author: r.author,
    likeCount: r._count.likes,
    likedByMe: r.likes.length > 0,
    isMine: r.authorId === viewerId,
  }));
}
