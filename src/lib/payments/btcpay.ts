import crypto from "crypto";
import type { PaymentProvider, NormalizedEvent } from "./types";

// BTCPay Server (autohospedado, cero comisión). Greenfield API + webhook HMAC.
// Env: BTCPAY_URL, BTCPAY_STORE_ID, BTCPAY_API_KEY, BTCPAY_WEBHOOK_SECRET, APP_URL.

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} no configurado`);
  return v;
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export const btcpayProvider: PaymentProvider = {
  name: "btcpay",

  async createCharge({ amountCents, currency, ref, metadata }) {
    const url = env("BTCPAY_URL").replace(/\/$/, "");
    const storeId = env("BTCPAY_STORE_ID");
    const apiKey = env("BTCPAY_API_KEY");
    const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");

    const res = await fetch(`${url}/api/v1/stores/${storeId}/invoices`, {
      method: "POST",
      headers: { Authorization: `token ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: (amountCents / 100).toFixed(2),
        currency,
        metadata: { paymentRef: ref, ...(metadata ?? {}) },
        checkout: appUrl ? { redirectURL: `${appUrl}/cartera?bought=1` } : undefined,
      }),
    });
    if (!res.ok) {
      throw new Error(`BTCPay createInvoice ${res.status}: ${await res.text().catch(() => "")}`);
    }
    const inv = (await res.json()) as { id: string; checkoutLink: string };
    return { redirectUrl: inv.checkoutLink, providerRef: inv.id };
  },

  async verifyWebhook(rawBody, headers): Promise<NormalizedEvent | null> {
    const secret = process.env.BTCPAY_WEBHOOK_SECRET;
    const sig = headers.get("btcpay-sig");
    if (!secret || !sig) return null;

    const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
    if (!safeEqual(sig, expected)) return null;

    let evt: { type?: string; invoiceId?: string };
    try {
      evt = JSON.parse(rawBody);
    } catch {
      return null;
    }
    if (!evt.invoiceId) return null;

    let status: NormalizedEvent["status"];
    switch (evt.type) {
      case "InvoiceSettled":
        status = "paid";
        break;
      case "InvoiceExpired":
      case "InvoiceInvalid":
        status = "failed";
        break;
      default:
        return null; // eventos intermedios (Processing, PaidInFull, Created…) se ignoran
    }
    return { providerRef: evt.invoiceId, status, amountCents: 0 };
  },
};
