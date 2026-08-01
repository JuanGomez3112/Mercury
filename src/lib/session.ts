import { cookies } from "next/headers";
import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./db";

const COOKIE = "mercury_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 días

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET no definido");
  return new TextEncoder().encode(s);
}

export type SessionPayload = { sub: string; username: string };

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // secure requiere HTTPS; en LAN http va desactivado. Activar con TLS (COOKIE_SECURE=1).
    secure: process.env.COOKIE_SECURE === "1",
    path: "/",
    maxAge: MAX_AGE,
  });
}

/**
 * Estado de bloqueo del usuario, deduplicado por request (React cache): una sola lectura a DB
 * aunque getSession se llame varias veces en el mismo render/handler.
 */
const loadBlockState = cache(async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { banned: true, suspendedUntil: true },
  });
});

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const sub = String(payload.sub);
    // Revocación de sesión: baneo/suspensión invalidan la cookie JWT viva al instante (logout forzado
    // global, no solo en la próxima escritura). Cuenta borrada → sesión muerta también.
    const u = await loadBlockState(sub);
    if (!u) return null;
    if (u.banned) return null;
    if (u.suspendedUntil && u.suspendedUntil > new Date()) return null;
    return { sub, username: String(payload.username) };
  } catch {
    return null;
  }
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

const TABU_COOKIE = "mercury_tabu";

export async function setTabuUnlock(userId: string) {
  const token = await new SignJWT({ sub: userId, tabu: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
  const jar = await cookies();
  jar.set(TABU_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "1",
    path: "/",
  });
}

export async function clearTabuUnlock() {
  const jar = await cookies();
  jar.delete(TABU_COOKIE);
}

export async function isTabuUnlocked(userId: string): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(TABU_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.tabu === true && String(payload.sub) === userId;
  } catch {
    return false;
  }
}

const ADMIN_COOKIE = "mercury_admin";

/** Segundo factor del panel admin: cookie firmada de corta duración. */
export async function setAdminUnlock(userId: string) {
  const token = await new SignJWT({ sub: userId, admin: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(secret());
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "1",
    path: "/",
  });
}

export async function clearAdminUnlock() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}

export async function isAdminUnlocked(userId: string): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.admin === true && String(payload.sub) === userId;
  } catch {
    return false;
  }
}
