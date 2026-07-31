import { prisma } from "./db";

export async function hasPostAccess(
  viewerId: string,
  post: { authorId: string; priceCredits: number | null; id: string },
): Promise<boolean> {
  if (post.authorId === viewerId) return true;
  if (post.priceCredits == null) return true;
  const bought = await prisma.purchase.findUnique({ where: { buyerId_postId: { buyerId: viewerId, postId: post.id } } });
  if (bought) return true;
  const sub = await prisma.subscription.findUnique({ where: { subscriberId_creatorId: { subscriberId: viewerId, creatorId: post.authorId } } });
  return !!sub && sub.expiresAt > new Date();
}

export async function hasMessageAccess(
  viewerId: string,
  message: { senderId: string; recipientId: string; priceCredits: number | null; id: string },
): Promise<boolean> {
  if (message.senderId === viewerId) return true;
  if (message.priceCredits == null) return true;
  const bought = await prisma.purchase.findUnique({ where: { buyerId_messageId: { buyerId: viewerId, messageId: message.id } } });
  return !!bought;
}

/** Precarga para shaping de feed: qué posts compró y a qué creadores está suscrito (activo) el viewer. */
export async function loadViewerEntitlements(viewerId: string, postIds: string[], creatorIds: string[]) {
  const [purchases, subs] = await Promise.all([
    prisma.purchase.findMany({ where: { buyerId: viewerId, postId: { in: postIds } }, select: { postId: true } }),
    prisma.subscription.findMany({ where: { subscriberId: viewerId, creatorId: { in: creatorIds }, expiresAt: { gt: new Date() } }, select: { creatorId: true } }),
  ]);
  return {
    purchasedPosts: new Set(purchases.map((p) => p.postId!).filter(Boolean)),
    activeSubs: new Set(subs.map((s) => s.creatorId)),
  };
}
