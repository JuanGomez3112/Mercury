import { prisma } from "./db";
import { getSession } from "./session";

/** Devuelve el usuario si es admin, o null. Úsalo en rutas/API /admin. */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) return null;
  const u = await prisma.user.findUnique({ where: { id: session.sub }, select: { id: true, username: true, isAdmin: true } });
  if (!u?.isAdmin) return null;
  return { id: u.id, username: u.username };
}
