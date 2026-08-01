import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getConfig } from "@/lib/token";
import AppShell from "@/components/AppShell";
import CheckoutForm, { type CheckoutItem, type CheckoutZone } from "@/components/CheckoutForm";

export const dynamic = "force-dynamic";

export default async function PagarPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { username: true, avatarUrl: true, balance: true },
  });
  if (!me) redirect("/login");

  const cartItems = await prisma.cartItem.findMany({
    where: { userId: session.sub },
    include: { variant: { include: { product: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (cartItems.length === 0) redirect("/carrito");

  const [zonesRaw, cfg] = await Promise.all([
    prisma.shippingZone.findMany({ orderBy: { createdAt: "asc" } }),
    getConfig(),
  ]);

  const items: CheckoutItem[] = cartItems.map((it) => ({
    productName: it.variant.product.name,
    label: it.variant.label,
    priceCredits: it.variant.priceCredits,
    priceCents: it.variant.priceCents,
    qty: it.qty,
  }));
  const zones: CheckoutZone[] = zonesRaw.map((z) => ({
    id: z.id,
    countries: z.countries,
    priceCredits: z.priceCredits,
    priceCents: z.priceCents,
    isDefault: z.isDefault,
  }));

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl}>
      <div className="space-y-5">
        <h1 className="text-xl font-semibold text-white">Pagar</h1>
        <CheckoutForm items={items} zones={zones} balance={me.balance} rateCents={cfg.rateCents} />
      </div>
    </AppShell>
  );
}
