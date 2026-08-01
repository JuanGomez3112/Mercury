import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { isAdminUnlocked } from "@/lib/session";
import AppShell from "@/components/AppShell";
import AdminUnlock from "@/components/AdminUnlock";

export const dynamic = "force-dynamic";

type Section = { key: string; label: string; desc: string; icon: string; href?: string };

const SECTIONS: Section[] = [
  { key: "tienda", label: "Tienda", desc: "Productos, variantes, zonas de envío, órdenes", icon: "🛍", href: "/admin/tienda" },
  { key: "economia", label: "Economía / MeryCoin", desc: "Tasa, supply, retiros (dentro de Tienda por ahora)", icon: "☾", href: "/admin/tienda" },
  { key: "usuarios", label: "Usuarios", desc: "Gestión de cuentas y roles", icon: "👥" },
  { key: "moderacion", label: "Moderación", desc: "Reportes, retiro de contenido", icon: "🛡" },
  { key: "cumplimiento", label: "Cumplimiento", desc: "Verificación de edad, T&C, pagos", icon: "📋" },
  { key: "stats", label: "Estadísticas", desc: "Métricas de la plataforma", icon: "📊" },
];

export default async function AdminHubPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/");

  const me = await prisma.user.findUnique({
    where: { id: admin.id },
    select: { username: true, avatarUrl: true, adminPinHash: true },
  });
  if (!me) redirect("/");

  // Segundo factor: exige desbloqueo con PIN.
  if (!(await isAdminUnlocked(admin.id))) {
    return (
      <AppShell username={me.username} avatarUrl={me.avatarUrl}>
        <AdminUnlock hasPin={me.adminPinHash !== null} />
      </AppShell>
    );
  }

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl} wide>
      <div className="space-y-5">
        <h1 className="text-xl font-semibold text-white">Panel de administración</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => {
            const inner = (
              <>
                <div className="mb-2 text-3xl">{s.icon}</div>
                <div className="text-base font-semibold text-white">{s.label}</div>
                <p className="mt-1 text-sm text-white/50">{s.desc}</p>
                {!s.href && <span className="mt-2 inline-block rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/40">pronto</span>}
              </>
            );
            return s.href ? (
              <Link
                key={s.key}
                href={s.href}
                className="rounded-2xl border border-white/10 bg-navy-2/50 p-6 transition hover:border-purple/40 hover:bg-navy-2"
              >
                {inner}
              </Link>
            ) : (
              <div key={s.key} className="cursor-not-allowed rounded-2xl border border-white/5 bg-navy-2/30 p-6 opacity-60">
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
