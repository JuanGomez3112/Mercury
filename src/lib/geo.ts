import { prisma } from "./db";

export type NearbyUser = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  lat: number;
  lng: number;
  scope: string;
  mode: string | null;
  distanceKm: number | null;
  isFriend: boolean;
  locationAt: string | null;
};

const NEAR_KM = 2; // "cerca de ti"

/** Distancia haversine en km. */
export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Amigos = follow mutuo. */
export async function getFriendIds(userId: string): Promise<Set<string>> {
  const [following, followers] = await Promise.all([
    prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } }),
    prisma.follow.findMany({ where: { followingId: userId }, select: { followerId: true } }),
  ]);
  const followingSet = new Set(following.map((f) => f.followingId));
  return new Set(followers.map((f) => f.followerId).filter((id) => followingSet.has(id)));
}

/**
 * Usuarios que comparten ubicación y son visibles para mí:
 * - scope "public": visibles para todos
 * - scope "friends": visibles solo si somos amigos (follow mutuo)
 * Ordenados por cercanía si tengo mi ubicación.
 */
export async function getVisibleLocations(userId: string): Promise<NearbyUser[]> {
  const [me, friends, users] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { lat: true, lng: true } }),
    getFriendIds(userId),
    prisma.user.findMany({
      where: {
        id: { not: userId },
        shareLocation: true,
        lat: { not: null },
        lng: { not: null },
        banned: false,
      },
      select: { id: true, username: true, displayName: true, avatarUrl: true, lat: true, lng: true, locationScope: true, locationAt: true, mode: true },
    }),
  ]);

  const out: NearbyUser[] = [];
  for (const u of users) {
    const isFriend = friends.has(u.id);
    const visible = u.locationScope === "public" || (u.locationScope === "friends" && isFriend);
    if (!visible) continue;
    const distanceKm =
      me?.lat != null && me?.lng != null ? haversineKm(me.lat, me.lng, u.lat!, u.lng!) : null;
    out.push({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      lat: u.lat!,
      lng: u.lng!,
      scope: u.locationScope,
      mode: u.mode,
      distanceKm,
      isFriend,
      locationAt: u.locationAt ? u.locationAt.toISOString() : null,
    });
  }
  out.sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9));
  return out;
}

export function isNear(distanceKm: number | null): boolean {
  return distanceKm != null && distanceKm <= NEAR_KM;
}
