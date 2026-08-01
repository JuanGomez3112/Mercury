import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import AddToCart from "@/components/AddToCart";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { username: true, avatarUrl: true },
  });
  if (!me) redirect("/login");

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: { where: { active: true }, orderBy: { label: "asc" } } },
  });
  if (!product || !product.active) notFound();

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl}>
      <div className="space-y-5">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-navy-2/50">
          <div className="aspect-square w-full bg-navy">
            {product.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-5xl text-white/20">☾</div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto p-3">
              {product.images.slice(1).map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="" className="h-16 w-16 flex-shrink-0 rounded-lg object-cover" />
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="text-xl font-semibold text-white">{product.name}</h1>
          {product.description && <p className="mt-2 text-sm text-white/60">{product.description}</p>}
        </div>

        <AddToCart
          variants={product.variants.map((v) => ({
            id: v.id,
            label: v.label,
            priceCredits: v.priceCredits,
            priceCents: v.priceCents,
            stock: v.stock,
          }))}
        />
      </div>
    </AppShell>
  );
}
