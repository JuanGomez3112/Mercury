import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, isTabuUnlocked } from "@/lib/session";
import { prisma } from "@/lib/db";
import { searchAll, type SearchType } from "@/lib/search";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import PostCard from "@/components/PostCard";
import SearchFilters from "@/components/SearchFilters";
import TabuGate from "@/components/TabuGate";

export const dynamic = "force-dynamic";

const TYPES = ["all", "users", "posts", "tags", "tabu", "reels", "grupos", "paginas"];

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { username: true, avatarUrl: true },
  });
  if (!me) redirect("/login");

  const { q: qParam, type: typeParam } = await searchParams;
  const q = (qParam ?? "").trim();
  const type: SearchType = (TYPES.includes(typeParam ?? "") ? typeParam : "all") as SearchType;

  const unlocked = await isTabuUnlocked(session.sub);
  const hasPin = (await prisma.user.findUnique({ where: { id: session.sub }, select: { tabuPinHash: true } }))!.tabuPinHash !== null;

  const { users, posts, tags, groups, pages } = await searchAll(session.sub, q, type);

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl}>
      <div className="space-y-5">
        <h1 className="text-xl font-semibold text-white">
          {q ? <>Resultados para <span className="text-purple">{q}</span></> : "Buscar"}
        </h1>
        <SearchFilters q={q} active={type} />

        {!q && <p className="text-sm text-white/40">Escribe algo para buscar.</p>}

        {q && (type === "all" || type === "users") && users.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-white/50">Personas</h2>
            {users.map((u) => (
              <Link key={u.username} href={`/u/${u.username}`} className="flex items-center gap-3 rounded-xl border border-white/10 bg-navy-2/50 p-3 hover:border-purple/30">
                <Avatar src={u.avatarUrl} className="h-11 w-11" />
                <div>
                  <div className="text-sm font-semibold text-white">{u.displayName ?? u.username}</div>
                  <div className="text-xs text-white/40">@{u.username}</div>
                </div>
              </Link>
            ))}
          </section>
        )}

        {q && (type === "all" || type === "tags") && tags.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-white/50">Hashtags</h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <Link key={t.tag} href={`/buscar?q=${encodeURIComponent(t.tag)}&type=posts`} className="rounded-full border border-white/10 bg-navy-2/50 px-4 py-1.5 text-sm text-purple hover:border-purple/30">
                  {t.tag} <span className="text-white/30">{t.count}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {q && (type === "all" || type === "posts" || type === "tabu" || type === "reels") && posts.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-white/50">Publicaciones</h2>
            {posts.map((p) => (
              <div key={p.id} className={p.isAdult && !unlocked ? "pointer-events-none blur-md" : ""}>
                <PostCard post={p} viewerAvatarUrl={me.avatarUrl} fireLike={p.isAdult} />
              </div>
            ))}
          </section>
        )}

        {q && (type === "all" || type === "grupos") && groups.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-white/50">Grupos</h2>
            {groups.map((g) => (
              <Link key={g.slug} href={`/grupos/${g.slug}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-navy-2/50 p-3 hover:border-purple/30">
                <span className="text-sm font-semibold text-white">👥 {g.name}</span>
                <span className="text-xs text-white/40">{g.memberCount} miembros</span>
              </Link>
            ))}
          </section>
        )}

        {q && (type === "all" || type === "paginas") && pages.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-white/50">Páginas</h2>
            {pages.map((p) => (
              <Link key={p.slug} href={`/paginas/${p.slug}`} className="flex items-center gap-3 rounded-xl border border-white/10 bg-navy-2/50 p-3 hover:border-purple/30">
                <Avatar src={p.avatarUrl} className="h-10 w-10" />
                <span className="flex-1 text-sm font-semibold text-white">{p.name}</span>
                <span className="text-xs text-white/40">{p.followerCount} seguidores</span>
              </Link>
            ))}
          </section>
        )}

        {q && users.length === 0 && posts.length === 0 && tags.length === 0 && groups.length === 0 && pages.length === 0 && (
          <p className="text-sm text-white/40">Sin resultados.</p>
        )}
        {type === "tabu" && !unlocked && <TabuGate hasPin={hasPin} />}
      </div>
    </AppShell>
  );
}
