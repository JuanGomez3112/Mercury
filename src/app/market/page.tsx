import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { sweepAutoRelease } from "@/lib/market";
import AppShell from "@/components/AppShell";

export const dynamic = "force-dynamic";

/* eslint-disable @next/next/no-img-element */
export default async function MarketPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { username: true, avatarUrl: true } });
  if (!me) redirect("/login");

  await sweepAutoRelease();
  const listings = await prisma.listing.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { id: true, title: true, images: true, priceCredits: true, acceptsCredits: true, acceptsCash: true, seller: { select: { username: true } } },
  });

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl} wide>
      <div className="space-y-5">
        <div className="flex items-center justify-between max-sm:px-4">
          <h1 className="text-xl font-semibold text-white">Marketplace</h1>
          <div className="flex items-center gap-3">
            <Link href="/market/mis" className="text-sm text-white/60 hover:text-white">Mis anuncios</Link>
            <Link href="/market/nuevo" className="rounded-full bg-purple px-4 py-1.5 text-sm font-medium text-navy hover:opacity-90">Vender</Link>
          </div>
        </div>

        {listings.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-white/40 max-sm:mx-4">Aún no hay anuncios. Sé el primero en vender.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 max-sm:px-2 sm:grid-cols-3 lg:grid-cols-4">
            {listings.map((l) => (
              <Link key={l.id} href={`/market/${l.id}`} className="group overflow-hidden rounded-2xl border border-white/10 bg-navy-2/50 transition hover:border-purple/40">
                <div className="aspect-square w-full overflow-hidden bg-navy">
                  {l.images[0] ? <img src={l.images[0]} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-white/20">sin foto</div>}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-medium text-white">{l.title}</p>
                  <p className="mt-1 text-sm text-purple">{l.acceptsCredits ? `${l.priceCredits} ☾` : "Efectivo"}{l.acceptsCash && l.acceptsCredits ? " · efectivo" : ""}</p>
                  <p className="mt-0.5 truncate text-xs text-white/40">@{l.seller.username}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
