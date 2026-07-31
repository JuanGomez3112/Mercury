import { redirect } from "next/navigation";
import { getSession, isTabuUnlocked } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getFeedByTab, getRecentChats, type FeedTab } from "@/lib/queries";
import TopBar from "@/components/TopBar";
import LeftRail from "@/components/LeftRail";
import LeftPanel from "@/components/LeftPanel";
import RightPanel from "@/components/RightPanel";
import Stories from "@/components/Stories";
import PostComposer from "@/components/PostComposer";
import FeedTabs from "@/components/FeedTabs";
import TabuGate from "@/components/TabuGate";

export const dynamic = "force-dynamic";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { tab: tabParam } = await searchParams;
  const tab: FeedTab = tabParam === "feed" || tabParam === "tabu" ? tabParam : "explora";

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, username: true, displayName: true, avatarUrl: true, mode: true },
  });
  if (!me) redirect("/login");

  const tabuLocked = tab === "tabu" ? !(await isTabuUnlocked(me.id)) : false;
  const hasPin = tab === "tabu"
    ? (await prisma.user.findUnique({ where: { id: me.id }, select: { tabuPinHash: true } }))!.tabuPinHash !== null
    : false;

  const following = await prisma.user.findMany({
    where: { followers: { some: { followerId: me.id } } },
    select: { id: true },
  });
  const followingIds = following.map((f) => f.id);

  const [posts, stories, suggestions, chats] = await Promise.all([
    getFeedByTab(me.id, tab),
    prisma.user.findMany({
      where: { id: { not: me.id } },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { username: true, displayName: true, avatarUrl: true, mode: true },
    }),
    prisma.user.findMany({
      where: { id: { notIn: [me.id, ...followingIds] } },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { username: true, displayName: true, avatarUrl: true },
    }),
    getRecentChats(me.id),
  ]);

  const displayName = me.displayName ?? me.username;

  return (
    <>
      <TopBar username={me.username} avatarUrl={me.avatarUrl} />
      <div className="mx-auto flex w-full max-w-[1920px] gap-8 py-6 pl-4 pr-8">
        <LeftRail username={me.username} />
        <LeftPanel me={me} />

        <main className="w-full min-w-0 flex-1 space-y-6 xl:max-w-[896px]">
          <Stories me={{ username: me.username, displayName: me.displayName, avatarUrl: me.avatarUrl, mode: me.mode }} stories={stories} />
          <PostComposer displayName={displayName} avatarUrl={me.avatarUrl} />

          {/* Tabs + publicaciones (cambio de tab client, solo re-pide posts) */}
          <FeedTabs initialTab={tab} initialPosts={posts} viewerAvatarUrl={me.avatarUrl} />
        </main>

        <RightPanel suggestions={suggestions} chats={chats} />
      </div>
      {tabuLocked && <TabuGate hasPin={hasPin} />}
    </>
  );
}
