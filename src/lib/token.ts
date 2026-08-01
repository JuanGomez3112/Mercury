import { prisma } from "./db";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export class SupplyExhausted extends Error {
  constructor() {
    super("Sin supply disponible");
    this.name = "SupplyExhausted";
  }
}

/** Carga la config del token; la crea si no existe, con treasury = maxSupply − circulante actual. */
export async function getConfig() {
  const existing = await prisma.tokenConfig.findUnique({ where: { id: "singleton" } });
  if (existing) return existing;
  const agg = await prisma.user.aggregate({ _sum: { balance: true, earnings: true } });
  const circulating = BigInt(agg._sum.balance ?? 0) + BigInt(agg._sum.earnings ?? 0);
  const maxSupply = BigInt(1000000000);
  return prisma.tokenConfig.create({
    data: { id: "singleton", maxSupply, treasury: maxSupply - circulating },
  });
}

/** Emite `amount` ☾ del treasury al saldo del usuario (balance o earnings). Atómico. */
export async function mint(tx: Tx, userId: string, amount: number, toEarnings = false) {
  if (amount <= 0) throw new Error("Monto inválido");
  const dec = await tx.tokenConfig.updateMany({
    where: { id: "singleton", treasury: { gte: BigInt(amount) } },
    data: { treasury: { decrement: BigInt(amount) } },
  });
  if (dec.count === 0) throw new SupplyExhausted();
  await tx.user.update({
    where: { id: userId },
    data: toEarnings ? { earnings: { increment: amount } } : { balance: { increment: amount } },
  });
}

/** Devuelve `amount` ☾ al treasury (sumidero: compra tienda, retiro). Atómico. */
export async function burnToTreasury(tx: Tx, amount: number) {
  if (amount <= 0) return;
  await tx.tokenConfig.update({ where: { id: "singleton" }, data: { treasury: { increment: BigInt(amount) } } });
}
