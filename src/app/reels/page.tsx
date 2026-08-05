import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import MobileNav from "@/components/MobileNav";
import ReelsFeed from "@/components/ReelsFeed";
import { getReelsFeed } from "@/lib/reels";

export const dynamic = "force-dynamic";

export default async function ReelsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { id: true } });
  if (!me) redirect("/login");

  const reels = await getReelsFeed(me.id);

  return (
    <>
      <ReelsFeed reels={reels} />
      <MobileNav />
    </>
  );
}
