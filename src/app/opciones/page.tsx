import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import AdminLink from "@/components/AdminLink";
import LogoutButton from "@/components/LogoutButton";
import MoodSlider from "@/components/MoodSlider";
import { IconUser, IconTable, IconBookmark, IconBell, IconMasks, IconMapPeople, IconSearch } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function OpcionesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { username: true, displayName: true, avatarUrl: true, mode: true } });
  if (!me) redirect("/login");
  const mood = me.mode === "angel" || me.mode === "devil" ? me.mode : null;

  const row = "flex items-center gap-3 rounded-xl border border-white/10 bg-navy-2/50 px-4 py-3.5 text-sm text-white/85 transition hover:bg-navy-2 max-sm:rounded-none max-sm:border-x-0";
  const soon = "flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-navy-2/20 px-4 py-3.5 text-sm text-white/35 max-sm:rounded-none max-sm:border-x-0";

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl} wide>
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-navy-2/50 p-4 max-sm:rounded-none max-sm:border-x-0">
          <Link href={`/u/${me.username}`} className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar src={me.avatarUrl} className="h-14 w-14" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">{me.displayName ?? me.username}</p>
              <p className="text-sm text-white/40">Ver mi perfil</p>
            </div>
          </Link>
          <MoodSlider initial={mood} />
        </div>

        <div className="space-y-2">
          <Link href={`/u/${me.username}`} className={row}><IconUser className="h-5 w-5 text-purple" /> Perfil</Link>
          <Link href="/tienda" className={row}><IconTable className="h-5 w-5 text-purple" /> Tienda</Link>
          <Link href="/cartera" className={row}><span className="w-5 text-center text-purple">☾</span> Cartera / MeryCoin</Link>
          <Link href="/market" className={row}><span className="w-5 text-center text-purple">🏷</span> Marketplace</Link>
          <Link href="/guardados" className={row}><IconBookmark className="h-5 w-5 text-purple" /> Guardados</Link>
          <Link href="/notificaciones" className={row}><IconBell className="h-5 w-5 text-purple" /> Notificaciones</Link>
          <Link href="/buscar" className={row}><IconSearch className="h-5 w-5 text-purple" /> Buscar</Link>
          <Link href="/tabu" className={row}><IconMasks className="h-5 w-5 text-purple" /> Tabú <span className="ml-auto rounded-full bg-purple/20 px-2 py-0.5 text-[10px] text-purple">match</span></Link>
          <Link href="/mapa" className={row}><IconMapPeople className="h-5 w-5 text-purple" /> Mapa</Link>
          <Link href="/ajustes" className={row}><span className="w-5 text-center text-purple">⚙</span> Ajustes</Link>
          <AdminLink className={row} />
        </div>

        <div className="pt-2 max-sm:px-4"><LogoutButton /></div>
      </div>
    </AppShell>
  );
}
