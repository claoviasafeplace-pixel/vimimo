import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getSupabase } from "@/lib/supabase";
import { forgotPasswordSchema } from "@/lib/validations";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }

  const { email } = parsed.data;
  const db = getSupabase();

  // Check if user exists with a password (credentials account)
  const { data: user } = await db
    .from("users")
    .select("id, password_hash")
    .eq("email", email)
    .single();

  // Always return success to avoid email enumeration
  if (!user?.password_hash) {
    return NextResponse.json({ success: true });
  }

  // Generate token and store in verification_tokens (reuse existing table)
  const token = nanoid(48);
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Delete any existing reset tokens for this email
  await db
    .from("verification_tokens")
    .delete()
    .eq("identifier", `reset:${email}`);

  await db.from("verification_tokens").insert({
    identifier: `reset:${email}`,
    token,
    expires: expires.toISOString(),
  });

  // Send email via Resend API
  const resendKey = process.env.AUTH_RESEND_KEY;
  if (!resendKey) {
    console.error("[forgot-password] AUTH_RESEND_KEY not configured");
    return NextResponse.json({ success: true });
  }

  const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "https://vimimo.fr";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "VIMIMO <onboarding@resend.dev>",
      to: [email],
      subject: "Réinitialisation de votre mot de passe VIMIMO",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #1a1a1a; margin-bottom: 16px;">Réinitialiser votre mot de passe</h2>
          <p style="color: #555; line-height: 1.6;">
            Vous avez demandé la réinitialisation de votre mot de passe VIMIMO.
            Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
          </p>
          <a href="${resetUrl}" style="display: inline-block; margin: 24px 0; padding: 14px 28px; background: linear-gradient(135deg, #c9a84c, #e2c06d); color: #1a1a1a; text-decoration: none; border-radius: 12px; font-weight: 600;">
            Réinitialiser mon mot de passe
          </a>
          <p style="color: #888; font-size: 13px; line-height: 1.5;">
            Ce lien expire dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
          </p>
        </div>
      `,
    }),
  });

  const resendData = await resendRes.json();
  if (!resendRes.ok) {
    console.error("[forgot-password] Resend error:", resendData);
  }

  return NextResponse.json({ success: true });
}
