import { prisma } from "./db";
import type { Prisma } from "@prisma/client";

export const WELCOME_CREDITS = 500;

export class InsufficientFunds extends Error {
  constructor() {
    super("Saldo insuficiente");
    this.name = "InsufficientFunds";
  }
}

type Tx = Prisma.TransactionClient;

/** Transferencia atómica entre dos usuarios. Debe correr dentro de un $transaction. */
export async function transfer(
  tx: Tx,
  args: { fromId: string; toId: string; amount: number; kind: "purchase" | "sub" | "tip"; refType?: string; refId?: string },
) {
  const { fromId, toId, amount, kind, refType, refId } = args;
  if (amount <= 0) throw new Error("Monto inválido");

  const from = await tx.user.findUnique({ where: { id: fromId }, select: { balance: true } });
  if (!from || from.balance < amount) throw new InsufficientFunds();

  await tx.user.update({ where: { id: fromId }, data: { balance: { decrement: amount } } });
  await tx.user.update({ where: { id: toId }, data: { balance: { increment: amount } } });

  const outType = kind === "purchase" ? "purchase" : kind === "sub" ? "sub_out" : "tip_out";
  const inType = kind === "purchase" ? "sale" : kind === "sub" ? "sub_in" : "tip_in";
  await tx.walletTransaction.create({
    data: { userId: fromId, delta: -amount, type: outType, refType: refType ?? null, refId: refId ?? null, counterpartyId: toId },
  });
  await tx.walletTransaction.create({
    data: { userId: toId, delta: amount, type: inType, refType: refType ?? null, refId: refId ?? null, counterpartyId: fromId },
  });
}

/** Recarga simulada (sin cobro real). */
export async function topup(userId: string, amount: number) {
  return prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { balance: { increment: amount } } });
    await tx.walletTransaction.create({ data: { userId, delta: amount, type: "topup" } });
  });
}
