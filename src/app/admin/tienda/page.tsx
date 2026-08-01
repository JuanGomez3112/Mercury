import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { isAdminUnlocked } from "@/lib/session";
import { getConfig } from "@/lib/token";
import AppShell from "@/components/AppShell";
import AdminUnlock from "@/components/AdminUnlock";
import AdminTabs from "@/components/AdminTabs";
import ProductAdmin from "@/components/ProductAdmin";
import ZoneAdmin from "@/components/ZoneAdmin";
import TokenConfigForm from "@/components/TokenConfigForm";
import WithdrawalRow from "@/components/WithdrawalRow";
import OrderStatusButton from "@/components/OrderStatusButton";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export default async function AdminTiendaPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/");

  const me = await prisma.user.findUnique({ where: { id: admin.id }, select: { username: true, avatarUrl: true, adminPinHash: true } });
  if (!me) redirect("/");

  // Segundo factor: aunque tenga sesión de admin, exige desbloqueo con PIN.
  if (!(await isAdminUnlocked(admin.id))) {
    return (
      <AppShell username={me.username} avatarUrl={me.avatarUrl}>
        <AdminUnlock hasPin={me.adminPinHash !== null} />
      </AppShell>
    );
  }

  const [products, zones, cfg, withdrawals, orders] = await Promise.all([
    prisma.product.findMany({ include: { variants: true }, orderBy: { createdAt: "desc" } }),
    prisma.shippingZone.findMany({ orderBy: { createdAt: "desc" } }),
    getConfig(),
    prisma.withdrawal.findMany({ where: { status: "pending" }, include: { user: { select: { username: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.order.findMany({ include: { items: true, user: { select: { username: true } } }, orderBy: { createdAt: "desc" } }),
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
            {
              id: "ordenes",
              label: "Órdenes",
              content: (
                <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-navy-2/50">
                  {orders.length === 0 ? (
                    <p className="p-8 text-center text-sm text-white/40">Sin órdenes.</p>
                  ) : (
                    orders.map((o) => {
                      const totalCredits = o.subtotalCredits + o.shippingCredits;
                      const totalCents = o.subtotalCents + o.shippingCents;
                      return (
                        <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                          <div>
                            <div className="text-sm text-white/80">
                              #{o.id.slice(-8)} · @{o.user.username} · {o.items.length} ítem(s)
                            </div>
                            <div className="text-xs text-white/40">
                              {o.paymentMethod === "merycoin" ? `${totalCredits} ☾` : `$${(totalCents / 100).toFixed(2)}`} ·{" "}
                              {o.createdAt.toLocaleDateString("es")}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="rounded-full border border-white/10 bg-navy px-3 py-1 text-xs text-white/60">
                              {STATUS_LABEL[o.status] ?? o.status}
                            </span>
                            <OrderStatusButton orderId={o.id} status={o.status} />
                          </div>
                        </div>
                      );
                    })
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
