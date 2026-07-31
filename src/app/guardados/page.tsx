import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getSavedPosts } from "@/lib/queries";
import AppShell from "@/components/AppShell";
import PostCard from "@/components/PostCard";

export const dynamic = "force-dynamic";

export default async function GuardadosPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { username: true, avatarUrl: true },
  });
  if (!me) redirect("/login");

  const posts = await getSavedPosts(session.sub);

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl}>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-white">Guardados</h1>
        {posts.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-navy-2/50 p-8 text-center text-sm text-white/40">
            Aún no guardas nada. Toca el marcador en un post para guardarlo.
          </p>
        ) : (
          <div className="space-y-6">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} viewerAvatarUrl={me.avatarUrl} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
