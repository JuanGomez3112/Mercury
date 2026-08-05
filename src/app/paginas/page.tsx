import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import CreatePageForm from "@/components/CreatePageForm";
import { getPages } from "@/lib/pages";
import { IconUser } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function PaginasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { username: true, avatarUrl: true } });
  if (!me) redirect("/login");

  const pages = await getPages(session.sub);

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl} wide>
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="px-4 text-xl font-semibold text-white sm:px-0">Páginas</h1>
        <CreatePageForm />

        <div className="space-y-2">
          {pages.length === 0 && <p className="px-4 text-sm text-white/40 sm:px-0">Aún no hay páginas. ¡Crea la primera!</p>}
          {pages.map((p) => (
            <Link key={p.slug} href={`/paginas/${p.slug}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-navy-2/50 p-4 transition hover:border-purple/40 max-sm:rounded-none max-sm:border-x-0">
              <Avatar src={p.avatarUrl} className="h-12 w-12" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-semibold text-white">
                  {p.name}
                  {p.isFollowing && <span className="rounded-full bg-purple/20 px-2 py-0.5 text-[10px] text-purple">siguiendo</span>}
                </p>
                {p.description && <p className="mt-0.5 line-clamp-1 text-sm text-white/50">{p.description}</p>}
              </div>
              <span className="flex shrink-0 items-center gap-1 text-sm text-white/40"><IconUser className="h-4 w-4" />{p.followerCount}</span>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
