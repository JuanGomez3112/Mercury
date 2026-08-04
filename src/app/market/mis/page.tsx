import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { sweepAutoRelease } from "@/lib/market";
import AppShell from "@/components/AppShell";
import MarketOrderActions from "@/components/MarketOrderActions";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { held: "En escrow", released: "Completada", refunded: "Reembolsada", disputed: "En disputa" };
const LSTATUS: Record<string, string> = { active: "Activo", sold: "Vendido", removed: "Retirado" };

export default async function MisAnunciosPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { username: true, avatarUrl: true } });
  if (!me) redirect("/login");

  await sweepAutoRelease();
  const [listings, buys, sales] = await Promise.all([
    prisma.listing.findMany({ where: { sellerId: session.sub }, orderBy: { createdAt: "desc" }, select: { id: true, title: true, priceCredits: true, status: true } }),
    prisma.marketOrder.findMany({ where: { buyerId: session.sub }, orderBy: { createdAt: "desc" }, include: { listing: { select: { id: true, title: true } } } }),
    prisma.marketOrder.findMany({ where: { sellerId: session.sub }, orderBy: { createdAt: "desc" }, include: { listing: { select: { id: true, title: true } } } }),
  ]);

  const card = "rounded-2xl border border-white/10 bg-navy-2/50 max-sm:rounded-none max-sm:border-x-0";
  const section = (title: string, children: React.ReactNode) => (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-white/70 max-sm:px-4">{title}</h2>
      {children}
    </div>
  );

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl} wide>
      <div className="space-y-6">
        <div className="flex items-center justify-between max-sm:px-4">
          <h1 className="text-xl font-semibold text-white">Mis anuncios</h1>
          <Link href="/market/nuevo" className="rounded-full bg-purple px-4 py-1.5 text-sm font-medium text-navy hover:opacity-90">Vender</Link>
        </div>

        {section("Publicados", listings.length === 0 ? <p className="px-4 text-sm text-white/40">Nada publicado.</p> : (
          <div className={`divide-y divide-white/5 ${card}`}>
            {listings.map((l) => (
              <Link key={l.id} href={`/market/${l.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-white/5">
                <span className="text-sm text-white/85">{l.title}</span>
                <span className="flex items-center gap-3 text-xs"><span className="text-purple">{l.priceCredits} ☾</span><span className="text-white/40">{LSTATUS[l.status] ?? l.status}</span></span>
              </Link>
            ))}
          </div>
        ))}

        {section("Mis compras", buys.length === 0 ? <p className="px-4 text-sm text-white/40">Sin compras.</p> : (
          <div className={`divide-y divide-white/5 ${card}`}>
            {buys.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div><Link href={`/market/${o.listing.id}`} className="text-sm text-white/85 hover:underline">{o.listing.title}</Link>
                  <div className="text-xs text-white/40">{o.credits} ☾ · {STATUS[o.status] ?? o.status}</div></div>
                <MarketOrderActions orderId={o.id} isBuyer status={o.status} />
              </div>
            ))}
          </div>
        ))}

        {section("Mis ventas", sales.length === 0 ? <p className="px-4 text-sm text-white/40">Sin ventas.</p> : (
          <div className={`divide-y divide-white/5 ${card}`}>
            {sales.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div><Link href={`/market/${o.listing.id}`} className="text-sm text-white/85 hover:underline">{o.listing.title}</Link>
                  <div className="text-xs text-white/40">{o.credits} ☾ · {STATUS[o.status] ?? o.status}</div></div>
                <MarketOrderActions orderId={o.id} isBuyer={false} status={o.status} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
