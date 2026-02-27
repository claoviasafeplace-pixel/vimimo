import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSupabase } from "@/lib/supabase";
import { resetPasswordSchema } from "@/lib/validations";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Données invalides";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { token, password } = parsed.data;
  const db = getSupabase();

  // Find the token in verification_tokens
  const { data: record } = await db
    .from("verification_tokens")
    .select("identifier, expires")
    .eq("token", token)
    .single();

  if (!record || !record.identifier.startsWith("reset:")) {
    return NextResponse.json(
      { error: "Lien invalide ou expiré" },
      { status: 400 }
    );
  }

  // Check expiration
  if (new Date(record.expires) < new Date()) {
    // Clean up expired token
    await db.from("verification_tokens").delete().eq("token", token);
    return NextResponse.json(
      { error: "Ce lien a expiré. Demandez un nouveau lien." },
      { status: 400 }
    );
  }

  const email = record.identifier.replace("reset:", "");

  // Hash new password
  const passwordHash = await bcrypt.hash(password, 10);

  // Update user password
  const { error } = await db
    .from("users")
    .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
    .eq("email", email);

  if (error) {
    console.error("[reset-password] Update error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du mot de passe" },
      { status: 500 }
    );
  }

  // Delete used token
  await db.from("verification_tokens").delete().eq("token", token);

  return NextResponse.json({ success: true });
}
