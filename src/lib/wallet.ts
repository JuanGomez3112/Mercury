import { prisma } from "./db";
import type { Prisma } from "@prisma/client";
import { mint, burnToTreasury, getConfig } from "./token";

export const WELCOME_CREDITS = 500;

export class InsufficientFunds extends Error {
  constructor() {
    super("Saldo insuficiente");
    this.name = "InsufficientFunds";
  }
}

type Tx = Prisma.TransactionClient;

/** Transferencia atómica. Ventas (purchase|sub|tip) acreditan earnings; P2P (transfer) acredita balance. */
export async function transfer(
  tx: Tx,
  args: { fromId: string; toId: string; amount: number; kind: "purchase" | "sub" | "tip" | "transfer"; refType?: string; refId?: string },
) {
  const { fromId, toId, amount, kind, refType, refId } = args;
  if (amount <= 0) throw new Error("Monto inválido");

  const debit = await tx.user.updateMany({
    where: { id: fromId, balance: { gte: amount } },
    data: { balance: { decrement: amount } },
  });
  if (debit.count === 0) throw new InsufficientFunds();

  const toEarnings = kind !== "transfer";
  await tx.user.update({
    where: { id: toId },
    data: toEarnings ? { earnings: { increment: amount } } : { balance: { increment: amount } },
  });

  const outType = kind === "purchase" ? "purchase" : kind === "sub" ? "sub_out" : kind === "tip" ? "tip_out" : "transfer_out";
  const inType = kind === "purchase" ? "sale" : kind === "sub" ? "sub_in" : kind === "tip" ? "tip_in" : "transfer_in";
  await tx.walletTransaction.create({
    data: { userId: fromId, delta: -amount, type: outType, refType: refType ?? null, refId: refId ?? null, counterpartyId: toId },
  });
  await tx.walletTransaction.create({
    data: { userId: toId, delta: amount, type: inType, refType: refType ?? null, refId: refId ?? null, counterpartyId: fromId },
  });
}

/**
 * Venta con reparto: debita `amount` del comprador una sola vez y acredita
 * earnings a varios destinatarios según `recipients` (la suma debe ser `amount`).
 * Un solo cargo, sin saldo negativo. Usado para PPV con colaboradores.
 */
export async function transferSplit(
  tx: Tx,
  args: {
    fromId: string;
    amount: number;
    recipients: { toId: string; amount: number }[];
    kind?: "purchase" | "sub" | "tip";
    refType?: string;
    refId?: string;
  },
) {
  const { fromId, amount, recipients, kind = "purchase", refType, refId } = args;
  if (amount <= 0) throw new Error("Monto inválido");
  const total = recipients.reduce((s, r) => s + r.amount, 0);
  if (total !== amount) throw new Error("El reparto no cuadra con el monto");

  const debit = await tx.user.updateMany({
    where: { id: fromId, balance: { gte: amount } },
    data: { balance: { decrement: amount } },
  });
  if (debit.count === 0) throw new InsufficientFunds();

  const outType = kind === "sub" ? "sub_out" : kind === "tip" ? "tip_out" : "purchase";
  const inType = kind === "sub" ? "sub_in" : kind === "tip" ? "tip_in" : "sale";
  await tx.walletTransaction.create({
    data: { userId: fromId, delta: -amount, type: outType, refType: refType ?? null, refId: refId ?? null, counterpartyId: recipients[0]?.toId ?? null },
  });
  for (const r of recipients) {
    if (r.amount <= 0) continue;
    await tx.user.update({ where: { id: r.toId }, data: { earnings: { increment: r.amount } } });
    await tx.walletTransaction.create({
      data: { userId: r.toId, delta: r.amount, type: inType, refType: refType ?? null, refId: refId ?? null, counterpartyId: fromId },
    });
  }
}

/** Reparte un monto entre un dueño (resto) y colaboradores (por %). El dueño absorbe el redondeo. */
export function splitRecipients(ownerId: string, amount: number, collaborators: { userId: string; percent: number }[]) {
  const collabAmts = collaborators.map((c) => ({ toId: c.userId, amount: Math.floor((amount * c.percent) / 100) }));
  const ownerAmt = amount - collabAmts.reduce((s, c) => s + c.amount, 0);
  return [{ toId: ownerId, amount: ownerAmt }, ...collabAmts].filter((r) => r.amount > 0);
}

/** Gasto (sumidero de tienda): debita balance atómico + devuelve al treasury + ledger. */
export async function spend(
  tx: Tx,
  args: { userId: string; amount: number; refType?: string; refId?: string },
) {
  const { userId, amount, refType, refId } = args;
  if (amount <= 0) throw new Error("Monto inválido");
  const debit = await tx.user.updateMany({
    where: { id: userId, balance: { gte: amount } },
    data: { balance: { decrement: amount } },
  });
  if (debit.count === 0) throw new InsufficientFunds();
  await burnToTreasury(tx, amount);
  await tx.walletTransaction.create({
    data: { userId, delta: -amount, type: "store_purchase", refType: refType ?? null, refId: refId ?? null },
  });
}

/** Recarga simulada (mintea del treasury a balance). */
export async function topup(userId: string, amount: number) {
  await getConfig();
  return prisma.$transaction(async (tx) => {
    await mint(tx, userId, amount);
    await tx.walletTransaction.create({ data: { userId, delta: amount, type: "topup" } });
  });
}
