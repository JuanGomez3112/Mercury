import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import PostCard from "@/components/PostCard";
import GroupJoinButton from "@/components/GroupJoinButton";
import GroupComposer from "@/components/GroupComposer";
import { getGroupBySlug } from "@/lib/groups";
import { getGroupPosts } from "@/lib/queries";
import { IconUser } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function GrupoPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { slug } = await params;

  const [me, group] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.sub }, select: { username: true, avatarUrl: true } }),
    getGroupBySlug(slug, session.sub),
  ]);
  if (!me) redirect("/login");
  if (!group) notFound();

  const canSee = !group.isPrivate || group.isMember;
  const posts = canSee ? await getGroupPosts(group.id, session.sub) : [];

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl} wide flush>
      <div className="space-y-4">
        {/* Cabecera del grupo */}
        <section className="rounded-2xl border border-white/10 bg-navy-2/50 p-6 max-sm:rounded-none max-sm:border-x-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-xl font-semibold text-white">
                {group.name}
                {group.isPrivate && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/50">privado</span>}
              </h1>
              <p className="mt-1 flex items-center gap-1 text-sm text-white/40"><IconUser className="h-4 w-4" />{group.memberCount} miembros</p>
              {group.description && <p className="mt-2 text-sm text-white/80">{group.description}</p>}
            </div>
            <GroupJoinButton slug={group.slug} initialMember={group.isMember} isOwner={group.isOwner} />
          </div>
        </section>

        {/* Composer (solo miembros) */}
        {group.isMember && <GroupComposer groupId={group.id} avatarUrl={me.avatarUrl} />}

        {/* Posts */}
        {!canSee ? (
          <p className="px-4 text-center text-sm text-white/40 sm:px-0">Este grupo es privado. Únete para ver las publicaciones.</p>
        ) : posts.length === 0 ? (
          <p className="px-4 text-center text-sm text-white/40 sm:px-0">Aún no hay publicaciones en el grupo.</p>
        ) : (
          <div className="space-y-4">
            {posts.map((p) => <PostCard key={p.id} post={p} viewerAvatarUrl={me.avatarUrl} />)}
          </div>
        )}
      </div>
    </AppShell>
  );
}
