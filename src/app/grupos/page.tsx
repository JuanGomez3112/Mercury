import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import CreateGroupForm from "@/components/CreateGroupForm";
import { getGroups } from "@/lib/groups";
import { IconUser } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function GruposPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { username: true, avatarUrl: true } });
  if (!me) redirect("/login");

  const groups = await getGroups(session.sub);

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl} wide>
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="px-4 text-xl font-semibold text-white sm:px-0">Grupos</h1>
        <CreateGroupForm />

        <div className="space-y-2">
          {groups.length === 0 && <p className="px-4 text-sm text-white/40 sm:px-0">Aún no hay grupos. ¡Crea el primero!</p>}
          {groups.map((g) => (
            <Link key={g.slug} href={`/grupos/${g.slug}`} className="block rounded-2xl border border-white/10 bg-navy-2/50 p-4 transition hover:border-purple/40 max-sm:rounded-none max-sm:border-x-0">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold text-white">
                    {g.name}
                    {g.isPrivate && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/50">privado</span>}
                    {g.isMember && <span className="rounded-full bg-purple/20 px-2 py-0.5 text-[10px] text-purple">miembro</span>}
                  </p>
                  {g.description && <p className="mt-0.5 line-clamp-1 text-sm text-white/50">{g.description}</p>}
                </div>
                <span className="flex shrink-0 items-center gap-1 text-sm text-white/40"><IconUser className="h-4 w-4" />{g.memberCount}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
