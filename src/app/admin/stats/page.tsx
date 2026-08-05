import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { isAdminUnlocked } from "@/lib/session";
import AppShell from "@/components/AppShell";
import AdminUnlock from "@/components/AdminUnlock";

export const dynamic = "force-dynamic";

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-navy-2/50 p-5">
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-white/40">{sub}</p>}
    </div>
  );
}

export default async function AdminStatsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/");
  const me = await prisma.user.findUnique({ where: { id: admin.id }, select: { username: true, avatarUrl: true, adminPinHash: true } });
  if (!me) redirect("/");
  if (!(await isAdminUnlocked(admin.id))) {
    return <AppShell username={me.username} avatarUrl={me.avatarUrl}><AdminUnlock hasPin={me.adminPinHash !== null} /></AppShell>;
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [
    users, newUsers, creators, banned, posts, reels, groups, pages, activeStories,
    pendingReports, agg, cfg, orders,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gt: weekAgo } } }),
    prisma.user.count({ where: { creatorMode: true } }),
    prisma.user.count({ where: { banned: true } }),
    prisma.post.count(),
    prisma.reel.count(),
    prisma.group.count(),
    prisma.page.count(),
    prisma.story.count({ where: { expiresAt: { gt: new Date() } } }),
    prisma.report.count({ where: { status: "pending" } }),
    prisma.user.aggregate({ _sum: { balance: true, earnings: true } }),
    prisma.tokenConfig.findFirst(),
    prisma.order.count(),
  ]);

  const circulating = (agg._sum.balance ?? 0) + (agg._sum.earnings ?? 0);
  const treasury = cfg ? Number(cfg.treasury) : 0;
  const reserveCents = cfg ? Number(cfg.reserveCents) : 0;
  const rateCents = cfg?.rateCents ?? 100;
  const obligationsCents = (agg._sum.earnings ?? 0) * rateCents;
  const solvent = reserveCents >= obligationsCents;

  const fmt = (n: number) => n.toLocaleString("es");

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl} wide>
      <div className="space-y-5">
        <Link href="/admin" className="text-sm text-white/50 hover:text-white">‹ Panel</Link>
        <h1 className="text-xl font-semibold text-white">Estadísticas</h1>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-white/60">Comunidad</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Usuarios" value={fmt(users)} sub={`+${newUsers} esta semana`} />
            <Stat label="Creadores" value={fmt(creators)} />
            <Stat label="Baneados" value={fmt(banned)} />
            <Stat label="Reportes abiertos" value={fmt(pendingReports)} />
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-white/60">Contenido</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Publicaciones" value={fmt(posts)} />
            <Stat label="Reels" value={fmt(reels)} />
            <Stat label="Historias activas" value={fmt(activeStories)} />
            <Stat label="Grupos / Páginas" value={`${fmt(groups)} / ${fmt(pages)}`} />
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-white/60">Economía (MeryCoin)</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="En circulación" value={`${fmt(circulating)} ☾`} sub={`treasury ${fmt(treasury)} ☾`} />
            <Stat label="Reserva real" value={`$${fmt(reserveCents / 100)}`} />
            <Stat label="Obligaciones" value={`$${fmt(obligationsCents / 100)}`} sub={solvent ? "solvente ✓" : "insolvente ⚠"} />
            <Stat label="Órdenes tienda" value={fmt(orders)} />
          </div>
          {cfg && !cfg.launched && <p className="text-xs text-amber-400/80">Token en modo pre-lanzamiento (launched=false): ☾ emitido sin respaldo real; no habilitar retiros sin on-ramp.</p>}
        </div>
      </div>
    </AppShell>
  );
}
