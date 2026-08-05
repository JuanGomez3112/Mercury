import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { isAdminUnlocked } from "@/lib/session";
import AppShell from "@/components/AppShell";
import AdminUnlock from "@/components/AdminUnlock";
import AdminUserRow from "@/components/AdminUserRow";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/");
  const me = await prisma.user.findUnique({ where: { id: admin.id }, select: { username: true, avatarUrl: true, adminPinHash: true } });
  if (!me) redirect("/");
  if (!(await isAdminUnlocked(admin.id))) {
    return <AppShell username={me.username} avatarUrl={me.avatarUrl}><AdminUnlock hasPin={me.adminPinHash !== null} /></AppShell>;
  }

  const { q } = await searchParams;
  const users = await prisma.user.findMany({
    where: q
      ? { OR: [{ username: { contains: q, mode: "insensitive" } }, { displayName: { contains: q, mode: "insensitive" } }] }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 40,
    select: { id: true, username: true, displayName: true, avatarUrl: true, balance: true, earnings: true, isAdmin: true, banned: true, suspendedUntil: true },
  });

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl} wide>
      <div className="space-y-4">
        <Link href="/admin" className="text-sm text-white/50 hover:text-white">‹ Panel</Link>
        <h1 className="text-xl font-semibold text-white">Usuarios</h1>

        <form className="flex gap-2">
          <input name="q" defaultValue={q ?? ""} placeholder="Buscar por usuario o nombre" className="flex-1 rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-purple" />
          <button className="rounded-xl bg-gradient-to-tl from-purple to-purple-soft px-5 py-2.5 text-sm font-semibold text-white">Buscar</button>
        </form>

        <div className="space-y-2">
          {users.length === 0 && <p className="text-sm text-white/40">Sin resultados.</p>}
          {users.map((u) => (
            <AdminUserRow key={u.id} user={{ ...u, suspendedUntil: u.suspendedUntil ? u.suspendedUntil.toISOString() : null }} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
