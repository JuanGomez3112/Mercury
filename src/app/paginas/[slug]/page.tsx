import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import PostCard from "@/components/PostCard";
import PageFollowButton from "@/components/PageFollowButton";
import GroupComposer from "@/components/GroupComposer";
import { getPageBySlug } from "@/lib/pages";
import { getPagePosts } from "@/lib/queries";
import { IconUser } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function PaginaPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { slug } = await params;

  const [me, page] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.sub }, select: { username: true, avatarUrl: true } }),
    getPageBySlug(slug, session.sub),
  ]);
  if (!me) redirect("/login");
  if (!page) notFound();

  const posts = await getPagePosts(page.id, session.sub);

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl} wide flush>
      <div className="space-y-4">
        {/* Cabecera de la página */}
        <section className="rounded-2xl border border-white/10 bg-navy-2/50 p-6 max-sm:rounded-none max-sm:border-x-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar src={page.avatarUrl} className="h-16 w-16 ring-2 ring-purple/40" />
              <div className="min-w-0">
                <h1 className="text-xl font-semibold text-white">{page.name}</h1>
                <p className="flex items-center gap-1 text-sm text-white/40"><IconUser className="h-4 w-4" />{page.followerCount} seguidores</p>
              </div>
            </div>
            <PageFollowButton slug={page.slug} initialFollowing={page.isFollowing} isOwner={page.isOwner} />
          </div>
          {page.description && <p className="mt-3 text-sm text-white/80">{page.description}</p>}
        </section>

        {/* Composer solo del dueño */}
        {page.isOwner && <GroupComposer pageId={page.id} avatarUrl={me.avatarUrl} placeholder="Publica en tu página…" />}

        {/* Posts */}
        {posts.length === 0 ? (
          <p className="px-4 text-center text-sm text-white/40 sm:px-0">Esta página aún no ha publicado.</p>
        ) : (
          <div className="space-y-4">
            {posts.map((p) => <PostCard key={p.id} post={p} viewerAvatarUrl={me.avatarUrl} />)}
          </div>
        )}
      </div>
    </AppShell>
  );
}
