import type { PaymentProvider } from "./types";
import { btcpayProvider } from "./btcpay";

export type { PaymentProvider, NormalizedEvent } from "./types";

const REGISTRY: Record<string, PaymentProvider> = {
  btcpay: btcpayProvider,
};

/** Proveedor activo (por env PAYMENT_PROVIDER, default btcpay). null si no registrado. */
export function activeProvider(): PaymentProvider | null {
  const name = process.env.PAYMENT_PROVIDER ?? "btcpay";
  return REGISTRY[name] ?? null;
}

export function getProvider(name: string): PaymentProvider | null {
  return REGISTRY[name] ?? null;
}
