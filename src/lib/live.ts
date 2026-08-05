import crypto from "crypto";
import { prisma } from "./db";

export type LiveCard = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  title: string | null;
  startedAt: string | null;
};

/** Transmisiones en vivo ahora mismo. */
export async function getLiveStreams(): Promise<LiveCard[]> {
  const rows = await prisma.liveStream.findMany({
    where: { isLive: true },
    orderBy: { startedAt: "desc" },
    take: 50,
    select: {
      title: true,
      startedAt: true,
      broadcaster: { select: { username: true, displayName: true, avatarUrl: true } },
    },
  });
  return rows.map((r) => ({
    username: r.broadcaster.username,
    displayName: r.broadcaster.displayName,
    avatarUrl: r.broadcaster.avatarUrl,
    title: r.title,
    startedAt: r.startedAt ? r.startedAt.toISOString() : null,
  }));
}

/** Asegura la config de transmisión del usuario (crea streamKey si no existe). */
export async function getOrCreateMyStream(userId: string) {
  const existing = await prisma.liveStream.findUnique({ where: { broadcasterId: userId } });
  if (existing) return existing;
  return prisma.liveStream.create({
    data: { broadcasterId: userId, streamKey: crypto.randomBytes(12).toString("hex") },
  });
}

/** Transmisión de un usuario por username (para la página de ver). */
export async function getLiveByUsername(username: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, displayName: true, avatarUrl: true, liveStream: true },
  });
  if (!user || !user.liveStream) return null;
  return {
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    title: user.liveStream.title,
    isLive: user.liveStream.isLive,
    streamKey: user.liveStream.streamKey,
  };
}
