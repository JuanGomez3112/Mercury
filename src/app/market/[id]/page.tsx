import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import MarketActions from "@/components/MarketActions";

export const dynamic = "force-dynamic";

/* eslint-disable @next/next/no-img-element */
export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { username: true, avatarUrl: true } });
  if (!me) redirect("/login");

  const l = await prisma.listing.findUnique({
    where: { id },
    include: { seller: { select: { username: true, displayName: true, avatarUrl: true } } },
  });
  if (!l || l.status === "removed") notFound();
  const isMine = l.sellerId === session.sub;

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl}>
      <div className="mx-auto max-w-2xl space-y-4">
        {l.images.length > 0 && (
          <div className="grid grid-cols-1 gap-2 max-sm:gap-0.5">
            {l.images.map((img) => <img key={img} src={img} alt="" className="w-full rounded-xl object-cover max-sm:rounded-none" />)}
          </div>
        )}

        <div className="space-y-3 max-sm:px-4">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-semibold text-white">{l.title}</h1>
            {l.status === "sold" && <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">Vendido</span>}
          </div>
          <p className="text-2xl font-bold text-purple">{l.acceptsCredits ? `${l.priceCredits} ☾` : "Efectivo"}</p>
          <div className="flex flex-wrap gap-2 text-xs text-white/50">
            <span className="rounded-full bg-white/5 px-2 py-0.5">{l.condition === "new" ? "Nuevo" : "Usado"}</span>
            <span className="rounded-full bg-white/5 px-2 py-0.5">{l.category}</span>
            {l.location && <span className="rounded-full bg-white/5 px-2 py-0.5">{l.location}</span>}
          </div>
          {l.description && <p className="whitespace-pre-wrap break-words text-sm text-white/80">{l.description}</p>}

          <Link href={`/u/${l.seller.username}`} className="flex items-center gap-2 text-sm text-white/70 hover:text-white">
            <span className="text-white/40">Vendedor:</span> @{l.seller.username}
          </Link>

          <div className="pt-2">
            {isMine ? (
              <p className="text-sm text-white/40">Este es tu anuncio. Gestiónalo en <Link href="/market/mis" className="text-purple hover:underline">Mis anuncios</Link>.</p>
            ) : l.status === "active" ? (
              <MarketActions listingId={l.id} sellerUsername={l.seller.username} priceCredits={l.priceCredits} acceptsCredits={l.acceptsCredits} acceptsCash={l.acceptsCash} />
            ) : (
              <p className="text-sm text-white/40">Este anuncio ya no está disponible.</p>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
