import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import LogoutButton from "@/components/LogoutButton";
import { IconUser, IconFire, IconLock } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { username: true, displayName: true, avatarUrl: true },
  });
  if (!me) redirect("/login");

  const row = "flex items-center gap-3 rounded-xl border border-white/10 bg-navy-2/50 px-4 py-3.5 text-sm text-white/85 transition hover:bg-navy-2 max-sm:rounded-none max-sm:border-x-0";

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl} wide>
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="px-4 text-xl font-semibold text-white sm:px-0">Ajustes</h1>

        <Link href={`/u/${me.username}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-navy-2/50 p-4 transition hover:border-purple/40 max-sm:rounded-none max-sm:border-x-0">
          <Avatar src={me.avatarUrl} className="h-14 w-14" />
          <div>
            <p className="font-semibold text-white">{me.displayName ?? me.username}</p>
            <p className="text-sm text-white/40">@{me.username}</p>
          </div>
        </Link>

        <div className="space-y-2">
          <Link href="/ajustes/perfil" className={row}>
            <IconUser className="h-5 w-5 text-purple" /> Editar perfil
            <span className="ml-auto text-white/30">›</span>
          </Link>
          <Link href="/ajustes/creador" className={row}>
            <IconFire className="h-5 w-5 text-purple" /> Modo creador
            <span className="ml-auto text-white/30">›</span>
          </Link>
          <Link href="/ajustes/seguridad" className={row}>
            <IconLock className="h-5 w-5 text-purple" /> Seguridad
            <span className="ml-auto text-white/30">›</span>
          </Link>
        </div>

        <div className="pt-2 max-sm:px-4"><LogoutButton /></div>

        <p className="text-center text-xs text-white/30">
          Verificación de edad y privacidad — próximamente.
        </p>
      </div>
    </AppShell>
  );
}
