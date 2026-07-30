import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getFeed } from "@/lib/queries";
import TopBar from "@/components/TopBar";
import LeftRail from "@/components/LeftRail";
import LeftPanel from "@/components/LeftPanel";
import RightPanel from "@/components/RightPanel";
import Stories from "@/components/Stories";
import PostComposer from "@/components/PostComposer";
import Tabs from "@/components/Tabs";
import PostCard from "@/components/PostCard";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  });
  if (!me) redirect("/login");

  const following = await prisma.user.findMany({
    where: { followers: { some: { followerId: me.id } } },
    select: { id: true },
  });
  const followingIds = following.map((f) => f.id);

  const [posts, stories, suggestions] = await Promise.all([
    getFeed(me.id),
    prisma.user.findMany({
      where: { id: { not: me.id } },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { username: true, displayName: true, avatarUrl: true },
    }),
    prisma.user.findMany({
      where: { id: { notIn: [me.id, ...followingIds] } },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { username: true, displayName: true, avatarUrl: true },
    }),
  ]);

  const displayName = me.displayName ?? me.username;

  return (
    <>
      <TopBar username={me.username} avatarUrl={me.avatarUrl} />
      <div className="mx-auto flex w-full max-w-[1920px] justify-center gap-8 px-6 py-6">
        <LeftRail />
        <LeftPanel me={me} />

        <main className="w-full min-w-0 flex-1 space-y-6 xl:max-w-[896px]">
          <Stories me={{ username: me.username, displayName: me.displayName, avatarUrl: me.avatarUrl }} stories={stories} />
          <PostComposer displayName={displayName} avatarUrl={me.avatarUrl} />

          {/* Contenedor: tabs + publicaciones (padding 32, gap 32) */}
          <div className="rounded-2xl border border-white/10 bg-navy-2/30 p-8">
            <Tabs />
            <div className="mt-8 space-y-8">
              {posts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-white/50">
                  Tu feed está vacío.
                  <br />
                  <span className="text-sm">Publica algo o sigue a otras personas para ver contenido.</span>
                </div>
              ) : (
                posts.map((p) => <PostCard key={p.id} post={p} />)
              )}
            </div>
          </div>
        </main>

        <RightPanel me={me} suggestions={suggestions} />
      </div>
    </>
  );
}
