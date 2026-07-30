import { prisma } from "./db";
import type { FeedPost } from "@/components/PostCard";

type Row = {
  id: string;
  body: string;
  images: string[];
  createdAt: Date;
  authorId: string;
  author: { username: string; displayName: string | null };
  _count: { likes: number };
  likes: { userId: string }[];
};

function toFeedPost(p: Row, viewerId: string): FeedPost {
  return {
    id: p.id,
    body: p.body,
    images: p.images,
    createdAt: p.createdAt,
    author: p.author,
    likeCount: p._count.likes,
    likedByMe: p.likes.length > 0,
    isMine: p.authorId === viewerId,
  };
}

const include = (viewerId: string) => ({
  author: { select: { username: true, displayName: true } },
  _count: { select: { likes: true } },
  likes: { where: { userId: viewerId }, select: { userId: true } },
});

/** Feed: publicaciones propias + de a quienes sigo, más recientes primero. */
export async function getFeed(viewerId: string): Promise<FeedPost[]> {
  const following = await prisma.follow.findMany({
    where: { followerId: viewerId },
    select: { followingId: true },
  });
  const ids = [viewerId, ...following.map((f) => f.followingId)];
  const posts = await prisma.post.findMany({
    where: { authorId: { in: ids } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: include(viewerId),
  });
  return posts.map((p) => toFeedPost(p as Row, viewerId));
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
