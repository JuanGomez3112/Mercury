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
import PaymentRow from "@/components/PaymentRow";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
  refund_pending: "Reembolso pendiente",
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

  const [products, zones, cfg, withdrawals, orders, sums, payments] = await Promise.all([
    prisma.product.findMany({ include: { variants: true }, orderBy: { createdAt: "desc" } }),
    prisma.shippingZone.findMany({ orderBy: { createdAt: "desc" } }),
    getConfig(),
    prisma.withdrawal.findMany({ where: { status: "pending" }, include: { user: { select: { username: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.order.findMany({ include: { items: true, user: { select: { username: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.user.aggregate({ _sum: { balance: true, earnings: true } }),
    prisma.payment.findMany({ take: 50, orderBy: { createdAt: "desc" }, include: { user: { select: { username: true } } } }),
  ]);

  const maxSupply = Number(cfg.maxSupply);
  const treasury = Number(cfg.treasury);
  const circulating = maxSupply - treasury;

  // Solvencia: la reserva real debe cubrir las ☾ retirables (earnings) valoradas al peg.
  const balanceSum = sums._sum.balance ?? 0;
  const earningsSum = sums._sum.earnings ?? 0;
  const reserveCents = Number(cfg.reserveCents);
  const obligationsCents = earningsSum * cfg.rateCents; // lo que se debería si todos retiran
  const solvencyCents = reserveCents - obligationsCents;
  const supplyOk = treasury + balanceSum + earningsSum === maxSupply;
  const usd = (c: number) => `$${(c / 100).toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
              id: "solvencia",
              label: "Solvencia",
              content: (
                <div className="space-y-4">
                  <div
                    className={`rounded-2xl border p-5 ${
                      solvencyCents >= 0 ? "border-emerald-500/30 bg-emerald-500/[0.05]" : "border-red-500/40 bg-red-500/[0.06]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">
                        {solvencyCents >= 0 ? "Solvente" : "INSOLVENTE"}
                      </span>
                      <span className={`text-sm font-semibold ${solvencyCents >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                        {solvencyCents >= 0 ? "+" : ""}{usd(solvencyCents)}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-white/40">Reserva real</div>
                        <div className="text-white">{usd(reserveCents)}</div>
                      </div>
                      <div>
                        <div className="text-white/40">Obligaciones (retirable × peg)</div>
                        <div className="text-white">{usd(obligationsCents)}</div>
                      </div>
                    </div>
                    {solvencyCents < 0 && (
                      <p className="mt-3 text-xs text-red-300">
                        La reserva no cubre las ☾ retirables. No actives `launched` ni pagues retiros hasta cerrar el hueco.
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-navy-2/50 p-5 text-sm">
                    <div className="mb-2 font-semibold text-white/70">Supply</div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><div className="text-white/40">Treasury</div><div className="text-white">{treasury.toLocaleString("es")} ☾</div></div>
                      <div><div className="text-white/40">Gastable (balance)</div><div className="text-white">{balanceSum.toLocaleString("es")} ☾</div></div>
                      <div><div className="text-white/40">Retirable (earnings)</div><div className="text-white">{earningsSum.toLocaleString("es")} ☾</div></div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <span className={supplyOk ? "text-emerald-300" : "text-red-300"}>
                        {supplyOk ? "✓ invariante de supply OK" : "✗ invariante roto"}
                      </span>
                      <span className="text-white/30">(treasury + balance + earnings = {maxSupply.toLocaleString("es")})</span>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              id: "pagos",
              label: "Pagos",
              content: (
                <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-navy-2/50">
                  {payments.length === 0 ? (
                    <p className="p-8 text-center text-sm text-white/40">Sin pagos.</p>
                  ) : (
                    payments.map((pay) => (
                      <PaymentRow
                        key={pay.id}
                        payment={{
                          id: pay.id,
                          kind: pay.kind,
                          credits: pay.credits,
                          amountCents: pay.amountCents,
                          status: pay.status,
                          username: pay.user.username,
                          createdAt: pay.createdAt.toISOString(),
                        }}
                      />
                    ))
                  )}
                </div>
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
