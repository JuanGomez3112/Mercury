import { getSession, type SessionPayload } from "./session";
import { prisma } from "./db";

/** Devuelve la sesión o null. Para rutas API. */
export async function currentUser(): Promise<SessionPayload | null> {
  return getSession();
}

/** Formatea la fecha de fin de suspensión para el usuario. */
export function suspendedMessage(until: Date): string {
  return `Cuenta suspendida hasta ${until.toLocaleDateString("es")}`;
}

/**
 * Comprueba si un usuario está baneado o suspendido. Úsalo en rutas de ESCRITURA
 * (publicar, comentar, DM, propina, transferencia, checkout) tras validar la sesión.
 * Devuelve `{ blocked: true, reason }` si debe cortarse la acción (403).
 */
export async function ensureNotBlocked(userId: string): Promise<{ blocked: boolean; reason?: string }> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { banned: true, suspendedUntil: true },
  });
  if (!u) return { blocked: true, reason: "Cuenta no encontrada" };
  if (u.banned) return { blocked: true, reason: "Cuenta baneada" };
  if (u.suspendedUntil && u.suspendedUntil > new Date()) {
    return { blocked: true, reason: suspendedMessage(u.suspendedUntil) };
  }
  return { blocked: false };
}

/** Formato relativo simple en español. */
export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "ahora";
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `hace ${days} d`;
  return d.toLocaleDateString("es");
}
