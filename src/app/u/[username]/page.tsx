import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getUserPosts } from "@/lib/queries";
import AppShell from "@/components/AppShell";
import ProfilePosts from "@/components/ProfilePosts";
import FollowButton from "@/components/FollowButton";
import Avatar from "@/components/Avatar";
import { VerifiedGrad } from "@/components/GradientIcons";
import SubscribeButton from "@/components/SubscribeButton";
import ReportUserButton from "@/components/ReportUserButton";
import TipButton from "@/components/TipButton";

export const dynamic = "force-dynamic";

/* eslint-disable @next/next/no-img-element */
function Deco({ mode }: { mode?: string | null }) {
  if (mode === "devil")
    return <img src="/Cuernos.svg" alt="" className="pointer-events-none absolute bottom-[calc(100%-10px)] left-1/2 h-11 w-[66px] -translate-x-1/2" />;
  if (mode === "angel")
    return <img src="/Aurola.svg" alt="" className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 h-5 w-16 -translate-x-1/2" />;
  return null;
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { username } = await params;
  const [viewer, profile] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.sub }, select: { username: true, avatarUrl: true } }),
    prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        mode: true,
        creatorMode: true,
        subPriceCredits: true,
        _count: { select: { posts: true, followers: true, following: true } },
      },
    }),
  ]);
  if (!profile || !viewer) notFound();

  const isMe = profile.id === session.sub;
  const following = isMe
    ? false
    : (await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: session.sub, followingId: profile.id } },
        select: { followerId: true },
      })) !== null;

  const sub = isMe ? null : await prisma.subscription.findUnique({
    where: { subscriberId_creatorId: { subscriberId: session.sub, creatorId: profile.id } },
    select: { expiresAt: true },
  });
  const subActiveUntil = sub && sub.expiresAt > new Date() ? sub.expiresAt.toISOString() : null;

  const posts = await getUserPosts(profile.id, session.sub);
  const name = profile.displayName ?? profile.username;

  return (
    <AppShell username={viewer.username} avatarUrl={viewer.avatarUrl} wide>
      <div className="space-y-6">
        {/* Cabecera del perfil */}
        <section className="rounded-2xl border border-white/10 bg-navy-2/50 p-8 max-sm:rounded-none max-sm:border-x-0 max-sm:p-5">
          <div className="flex items-start justify-between max-sm:flex-col max-sm:gap-4">
            <div className="flex items-center gap-5 max-sm:gap-4">
              <div className="relative">
                <Deco mode={profile.mode} />
                <Avatar src={profile.avatarUrl} className="h-24 w-24 ring-2 ring-purple/40" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold text-white">{name}</h1>
                  <VerifiedGrad className="h-5 w-5" />
                </div>
                <p className="text-sm text-white/50">@{profile.username}</p>
                {profile.bio && <p className="mt-2 max-w-md text-sm text-white/80">{profile.bio}</p>}
              </div>
            </div>
            {!isMe && (
              <div className="flex items-center gap-2 max-sm:w-full max-sm:flex-wrap">
                <a
                  href={`/mensajes/${profile.username}`}
                  className="rounded-[1.25rem] border-2 border-white/20 px-4 py-2 text-sm font-bold text-white transition hover:border-purple hover:text-purple"
                >
                  Mensaje
                </a>
                <FollowButton username={profile.username} initialFollowing={following} />
                {profile.creatorMode && profile.subPriceCredits != null && (
                  <SubscribeButton username={profile.username} price={profile.subPriceCredits} activeUntil={subActiveUntil} />
                )}
                <TipButton toUsername={profile.username} />
                <ReportUserButton targetId={profile.id} />
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-6 text-sm text-white/60">
            <span><b className="text-white">{profile._count.posts}</b> publicaciones</span>
            <span><b className="text-white">{profile._count.followers}</b> seguidores</span>
            <span><b className="text-white">{profile._count.following}</b> siguiendo</span>
          </div>
        </section>

        {/* Publicaciones: normales vs Tabú */}
        <ProfilePosts posts={posts} viewerAvatarUrl={viewer.avatarUrl} />
      </div>
    </AppShell>
  );
}
