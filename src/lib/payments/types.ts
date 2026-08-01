// Interfaz agnóstica de proveedor de pago. Una implementación por proveedor (btcpay, ...).

export type NormalizedEvent = {
  providerRef: string;
  status: "paid" | "failed" | "refunded";
  amountCents: number;
};

export interface PaymentProvider {
  readonly name: string;

  /**
   * Inicia un cobro. Devuelve a dónde mandar al usuario (checkout hospedado del proveedor)
   * y el `providerRef` para idempotencia/reconciliación.
   */
  createCharge(input: {
    amountCents: number;
    currency: string;
    ref: string; // id del Payment nuestro (metadata)
    metadata?: Record<string, string>;
  }): Promise<{ redirectUrl?: string; providerRef: string }>;

  /** Verifica la firma del webhook y devuelve el evento normalizado, o null si inválido/ignorable. */
  verifyWebhook(rawBody: string, headers: Headers): Promise<NormalizedEvent | null>;
}
