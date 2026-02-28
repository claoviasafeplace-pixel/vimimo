/**
 * Email service — uses Resend REST API (no SDK dependency).
 * Same pattern as forgot-password route.
 */

export async function sendDeliveryNotification(to: string, projectId: string) {
  const resendKey = process.env.AUTH_RESEND_KEY;
  if (!resendKey) {
    console.warn("[Email] AUTH_RESEND_KEY not set, skipping delivery notification");
    return;
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://vimimo.fr";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: "VIMIMO <noreply@vimimo.fr>",
      to,
      subject: "Votre staging VIMIMO est prêt !",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #c8a45a;">Votre staging est prêt !</h1>
          <p>Votre commande de staging virtuel a été vérifiée par notre expert et est maintenant disponible.</p>
          <a href="${baseUrl}/project/${projectId}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #c8a45a, #e8d48b); color: #0a0a0a; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Voir mon staging
          </a>
          <p style="color: #666; font-size: 14px; margin-top: 24px;">Merci de votre confiance.</p>
          <p style="color: #666; font-size: 12px;">VIMIMO — Staging virtuel premium</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    console.error("[Email] Resend delivery notification failed:", data);
    throw new Error(`Email send failed: ${res.status}`);
  }
}
