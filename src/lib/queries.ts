import { prisma } from "./db";
import type { FeedPost, Author } from "./types";
import type { Prisma } from "@prisma/client";
import { loadViewerEntitlements } from "./entitlement";

type Row = {
  id: string;
  body: string;
  images: string[];
  isAdult: boolean;
  priceCredits: number | null;
  createdAt: Date;
  authorId: string;
  author: { username: string; displayName: string | null; avatarUrl: string | null };
  _count: { likes: number; comments: number };
  likes: { userId: string }[];
  bookmarks: { userId: string }[];
};

function toFeedPost(
  p: Row,
  viewerId: string,
  ent?: { purchasedPosts: Set<string>; activeSubs: Set<string> },
): FeedPost {
  const priceCredits = p.priceCredits;
  const access =
    p.authorId === viewerId ||
    priceCredits == null ||
    (ent ? ent.purchasedPosts.has(p.id) || ent.activeSubs.has(p.authorId) : false);
  const locked = priceCredits != null && !access;
  return {
    id: p.id,
    body: p.body,
    images: locked ? [] : p.images,
    isAdult: p.isAdult,
    createdAt: p.createdAt,
    author: p.author,
    likeCount: p._count.likes,
    commentCount: p._count.comments,
    likedByMe: p.likes.length > 0,
    isMine: p.authorId === viewerId,
    savedByMe: p.bookmarks.length > 0,
    priceCredits,
    locked,
  };
}

const include = (viewerId: string) => ({
  author: { select: { username: true, displayName: true, avatarUrl: true } },
  _count: { select: { likes: true, comments: true } },
  likes: { where: { userId: viewerId }, select: { userId: true } },
  bookmarks: { where: { userId: viewerId }, select: { userId: true } },
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
  const ent = await loadViewerEntitlements(viewerId, posts.map((p) => p.id), posts.map((p) => p.authorId));
  return posts.map((p) => toFeedPost(p as Row, viewerId, ent));
}

export type ChatPreview = {
  partner: Author;
  body: string;
  createdAt: Date;
  mine: boolean;
  unread: number;
};

/** Conversaciones recientes: último mensaje por interlocutor + no leídos. */
export async function getRecentChats(viewerId: string, limit = 8): Promise<ChatPreview[]> {
  const msgs = await prisma.message.findMany({
    where: { OR: [{ senderId: viewerId }, { recipientId: viewerId }] },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      sender: { select: { username: true, displayName: true, avatarUrl: true } },
      recipient: { select: { username: true, displayName: true, avatarUrl: true } },
    },
  });
  const seen = new Map<string, ChatPreview>();
  for (const m of msgs) {
    const mine = m.senderId === viewerId;
    const partner = mine ? m.recipient : m.sender;
    if (!seen.has(partner.username)) {
      const body =
        !mine && m.priceCredits != null
          ? "💰 Mensaje de pago"
          : m.body || (m.imageUrl ? "📷 Foto" : "");
      seen.set(partner.username, { partner, body, createdAt: m.createdAt, mine, unread: 0 });
    }
    // no leído: mensaje del interlocutor hacia mí sin leer
    if (!mine && m.readAt === null) {
      const c = seen.get(partner.username)!;
      c.unread += 1;
    }
  }
  return [...seen.values()].slice(0, limit);
}

/** Total de mensajes no leídos del viewer. */
export async function getUnreadTotal(viewerId: string): Promise<number> {
  return prisma.message.count({ where: { recipientId: viewerId, readAt: null } });
}

export type NotifItem = {
  id: string;
  type: string;
  postId: string | null;
  readAt: Date | null;
  createdAt: Date;
  actor: Author;
};

export async function getNotifications(userId: string, limit = 30): Promise<NotifItem[]> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { actor: { select: { username: true, displayName: true, avatarUrl: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    postId: r.postId,
    readAt: r.readAt,
    createdAt: r.createdAt,
    actor: r.actor,
  }));
}

export async function getUnreadNotifCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export type ThreadMessage = {
  id: string;
  body: string;
  imageUrl: string | null;
  createdAt: Date;
  mine: boolean;
  priceCredits: number | null;
  locked: boolean;
};

/** Hilo de mensajes entre el viewer y un usuario. */
export async function getThread(viewerId: string, partnerId: string): Promise<ThreadMessage[]> {
  const msgs = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: viewerId, recipientId: partnerId },
        { senderId: partnerId, recipientId: viewerId },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  const paidIds = msgs.filter((m) => m.senderId !== viewerId && m.priceCredits != null).map((m) => m.id);
  const purchased = paidIds.length
    ? new Set(
        (
          await prisma.purchase.findMany({
            where: { buyerId: viewerId, messageId: { in: paidIds } },
            select: { messageId: true },
          })
        ).map((p) => p.messageId!),
      )
    : new Set<string>();

  return msgs.map((m) => {
    const mine = m.senderId === viewerId;
    const locked = !mine && m.priceCredits != null && !purchased.has(m.id);
    return {
      id: m.id,
      body: locked ? "" : m.body,
      imageUrl: locked ? null : m.imageUrl,
      createdAt: m.createdAt,
      mine,
      priceCredits: m.priceCredits,
      locked,
    };
  });
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

/** Posts por filtro arbitrario, shaping FeedPost. Reutilizado por búsqueda. */
export async function getFeedPostsByWhere(
  viewerId: string,
  where: Prisma.PostWhereInput,
  take = 20,
): Promise<FeedPost[]> {
  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    include: include(viewerId),
  });
  const ent = await loadViewerEntitlements(viewerId, posts.map((p) => p.id), posts.map((p) => p.authorId));
  return posts.map((p) => toFeedPost(p as Row, viewerId, ent));
}

/** Publicaciones de un autor concreto. */
export async function getUserPosts(authorId: string, viewerId: string): Promise<FeedPost[]> {
  const posts = await prisma.post.findMany({
    where: { authorId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: include(viewerId),
  });
  const ent = await loadViewerEntitlements(viewerId, posts.map((p) => p.id), posts.map((p) => p.authorId));
  return posts.map((p) => toFeedPost(p as Row, viewerId, ent));
}

/** Posts guardados por el viewer, más recientes primero. */
export async function getSavedPosts(viewerId: string): Promise<FeedPost[]> {
  const rows = await prisma.bookmark.findMany({
    where: { userId: viewerId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { post: { include: include(viewerId) } },
  });
  const posts = rows.map((b) => b.post);
  const ent = await loadViewerEntitlements(viewerId, posts.map((p) => p.id), posts.map((p) => p.authorId));
  return posts.map((p) => toFeedPost(p as Row, viewerId, ent));
}
