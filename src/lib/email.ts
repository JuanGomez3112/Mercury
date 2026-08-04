// Envío de email transaccional vía Brevo (API HTTP). Enchufable: cambiar de proveedor = cambiar este archivo.
// Env: BREVO_API_KEY, EMAIL_FROM (remitente verificado en Brevo), EMAIL_FROM_NAME (opcional).
// Sin BREVO_API_KEY/EMAIL_FROM → dev-log (no rompe el flujo; útil en local/sin proveedor).

type SendArgs = { to: string; subject: string; html: string; text?: string };

export async function sendEmail({ to, subject, html, text }: SendArgs): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.EMAIL_FROM;
  const fromName = process.env.EMAIL_FROM_NAME ?? "Mercury";

  if (!apiKey || !fromEmail) {
    // Proveedor no configurado: registrar en consola para poder probar el flujo sin enviar.
    console.log(`[email dev-log] to=${to} subject="${subject}"\n${text ?? html}`);
    return { ok: true };
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: fromEmail, name: fromName },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text ?? html.replace(/<[^>]+>/g, " "),
      }),
    });
    if (!res.ok) {
      return { ok: false, error: `Brevo ${res.status}: ${await res.text().catch(() => "")}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "error de red" };
  }
}
