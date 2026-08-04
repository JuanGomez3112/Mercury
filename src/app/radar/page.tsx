import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import MapView from "@/components/MapView";
import { getVisibleLocations } from "@/lib/geo";

export const dynamic = "force-dynamic";

export default async function RadarPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { username: true, avatarUrl: true, shareLocation: true, locationScope: true },
  });
  if (!me) redirect("/login");

  const nearby = await getVisibleLocations(session.sub);
  const scope = me.locationScope === "public" ? "public" : "friends";

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl} wide flush>
      <div className="space-y-4">
        <div className="px-4 pt-4 sm:px-0">
          <h1 className="text-xl font-semibold text-white">Radar</h1>
          <p className="text-sm text-white/40">Mira quién está cerca. Tú decides cuándo y para quién compartir tu ubicación.</p>
        </div>
        <MapView initialShare={{ shareLocation: me.shareLocation, locationScope: scope }} initialNearby={nearby} myAvatarUrl={me.avatarUrl} />
      </div>
    </AppShell>
  );
}
