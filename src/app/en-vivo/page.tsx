import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import { getLiveStreams } from "@/lib/live";

export const dynamic = "force-dynamic";

export default async function EnVivoPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { username: true, avatarUrl: true } });
  if (!me) redirect("/login");

  const streams = await getLiveStreams();

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl} wide>
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between px-4 sm:px-0">
          <h1 className="text-xl font-semibold text-white">En vivo</h1>
          <Link href="/en-vivo/transmitir" className="rounded-full bg-gradient-to-tl from-purple to-purple-soft px-4 py-2 text-sm font-semibold text-white">Transmitir</Link>
        </div>

        {streams.length === 0 ? (
          <p className="px-4 text-sm text-white/40 sm:px-0">Nadie está en vivo ahora. ¡Sé el primero!</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {streams.map((s) => (
              <Link key={s.username} href={`/en-vivo/${s.username}`} className="overflow-hidden rounded-2xl border border-white/10 bg-navy-2/50 transition hover:border-purple/40 max-sm:rounded-none max-sm:border-x-0">
                <div className="relative flex aspect-video items-center justify-center bg-gradient-to-tr from-purple/30 via-navy-2 to-purple-soft/20">
                  <span className="absolute left-3 top-3 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">● EN VIVO</span>
                  <Avatar src={s.avatarUrl} className="h-16 w-16 ring-2 ring-white/30" />
                </div>
                <div className="p-3">
                  <p className="truncate font-semibold text-white">{s.title || "Transmisión en vivo"}</p>
                  <p className="truncate text-sm text-white/50">{s.displayName ?? s.username}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
