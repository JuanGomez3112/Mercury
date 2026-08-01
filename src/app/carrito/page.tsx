import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import CartList, { type CartRow } from "@/components/CartList";

export const dynamic = "force-dynamic";

export default async function CarritoPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { username: true, avatarUrl: true },
  });
  if (!me) redirect("/login");

  const items = await prisma.cartItem.findMany({
    where: { userId: session.sub },
    include: { variant: { include: { product: true } } },
    orderBy: { createdAt: "asc" },
  });

  const rows: CartRow[] = items.map((it) => ({
    variantId: it.variantId,
    qty: it.qty,
    stock: it.variant.stock,
    label: it.variant.label,
    priceCredits: it.variant.priceCredits,
    priceCents: it.variant.priceCents,
    productId: it.variant.productId,
    productName: it.variant.product.name,
    image: it.variant.product.images[0] ?? null,
  }));

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl}>
      <div className="space-y-5">
        <h1 className="text-xl font-semibold text-white">Carrito</h1>
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-navy-2/50 p-8 text-center text-sm text-white/40">
            Tu carrito está vacío.
          </p>
        ) : (
          <CartList items={rows} />
        )}
      </div>
    </AppShell>
  );
}
