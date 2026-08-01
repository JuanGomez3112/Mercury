import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";

export const dynamic = "force-dynamic";

export default async function TiendaPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { username: true, avatarUrl: true },
  });
  if (!me) redirect("/login");

  const products = await prisma.product.findMany({
    where: { active: true },
    include: { variants: { where: { active: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl} wide>
      <div className="space-y-5">
        <h1 className="text-xl font-semibold text-white">Tienda</h1>
        {products.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-navy-2/50 p-8 text-center text-sm text-white/40">
            Aún no hay productos en la tienda.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {products.map((p) => {
              const minCredits = p.variants.length > 0 ? Math.min(...p.variants.map((v) => v.priceCredits)) : null;
              const minCents = p.variants.length > 0 ? Math.min(...p.variants.map((v) => v.priceCents)) : null;
              const soldOut = p.variants.length > 0 && p.variants.every((v) => v.stock <= 0);

              return (
                <Link
                  key={p.id}
                  href={`/tienda/${p.id}`}
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-navy-2/50 transition hover:border-purple/40"
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-navy">
                    {p.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl text-white/20">☾</div>
                    )}
                    {soldOut && (
                      <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white/70">
                        Agotado
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <h2 className="truncate text-sm font-semibold text-white">{p.name}</h2>
                    {minCredits !== null && minCents !== null ? (
                      <p className="mt-0.5 text-xs text-white/50">
                        desde {minCredits} ☾ / ${(minCents / 100).toFixed(2)}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-white/30">Sin variantes</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
