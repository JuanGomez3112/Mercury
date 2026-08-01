import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { getConfig } from "@/lib/token";
import AppShell from "@/components/AppShell";
import AdminTabs from "@/components/AdminTabs";
import ProductAdmin from "@/components/ProductAdmin";
import ZoneAdmin from "@/components/ZoneAdmin";
import TokenConfigForm from "@/components/TokenConfigForm";
import WithdrawalRow from "@/components/WithdrawalRow";

export const dynamic = "force-dynamic";

export default async function AdminTiendaPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/");

  const me = await prisma.user.findUnique({ where: { id: admin.id }, select: { username: true, avatarUrl: true } });
  if (!me) redirect("/");

  const [products, zones, cfg, withdrawals] = await Promise.all([
    prisma.product.findMany({ include: { variants: true }, orderBy: { createdAt: "desc" } }),
    prisma.shippingZone.findMany({ orderBy: { createdAt: "desc" } }),
    getConfig(),
    prisma.withdrawal.findMany({ where: { status: "pending" }, include: { user: { select: { username: true } } }, orderBy: { createdAt: "asc" } }),
  ]);

  const maxSupply = Number(cfg.maxSupply);
  const treasury = Number(cfg.treasury);
  const circulating = maxSupply - treasury;

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl} wide>
      <div className="space-y-5">
        <h1 className="text-xl font-semibold text-white">Admin · Tienda</h1>
        <AdminTabs
          tabs={[
            { id: "productos", label: "Productos", content: <ProductAdmin products={products} /> },
            { id: "zonas", label: "Zonas", content: <ZoneAdmin zones={zones} /> },
            {
              id: "token",
              label: "Token",
              content: (
                <TokenConfigForm
                  maxSupply={maxSupply}
                  treasury={treasury}
                  circulating={circulating}
                  rateCents={cfg.rateCents}
                  launched={cfg.launched}
                />
              ),
            },
            {
              id: "retiros",
              label: "Retiros",
              content: (
                <div className="rounded-2xl border border-white/10 bg-navy-2/50">
                  {withdrawals.length === 0 ? (
                    <p className="p-8 text-center text-sm text-white/40">Sin retiros pendientes.</p>
                  ) : (
                    withdrawals.map((w) => <WithdrawalRow key={w.id} withdrawal={w} />)
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>
    </AppShell>
  );
}
