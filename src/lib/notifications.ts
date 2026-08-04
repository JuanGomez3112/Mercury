import { prisma } from "./db";

type NotifType = "like" | "comment" | "follow" | "purchase" | "subscribe" | "tip" | "transfer" | "withdrawal" | "order" | "mention";

export async function notify(args: {
  userId: string;
  actorId: string;
  type: NotifType;
  postId?: string | null;
}) {
  if (args.userId === args.actorId) return; // no auto-notificarse
  await prisma.notification.create({
    data: {
      userId: args.userId,
      actorId: args.actorId,
      type: args.type,
      postId: args.postId ?? null,
    },
  });
}

export async function unnotify(args: {
  userId: string;
  actorId: string;
  type: NotifType;
  postId?: string | null;
}) {
  await prisma.notification.deleteMany({
    where: {
      userId: args.userId,
      actorId: args.actorId,
      type: args.type,
      ...(args.postId ? { postId: args.postId } : {}),
    },
  });
}
