import { prisma } from "./db";
import { getSession, isAdminUnlocked } from "./session";

/** Devuelve el usuario si es admin, o null. Base isAdmin (para decidir redirect vs desbloqueo en la página). */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) return null;
  const u = await prisma.user.findUnique({ where: { id: session.sub }, select: { id: true, username: true, isAdmin: true } });
  if (!u?.isAdmin) return null;
  return { id: u.id, username: u.username };
}

/** isAdmin + segundo factor (cookie admin_unlock válida). Úsalo en TODAS las APIs /admin. */
export async function requireAdminUnlocked() {
  const admin = await requireAdmin();
  if (!admin) return null;
  if (!(await isAdminUnlocked(admin.id))) return null;
  return admin;
}
