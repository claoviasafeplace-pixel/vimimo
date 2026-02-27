import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { getSupabase } from "@/lib/supabase";
import { registerSchema } from "@/lib/validations";

export async function POST(request: Request) {
  let body: unknown;
  try {
    const text = await request.text();
    console.log("[register] raw body:", text);
    body = JSON.parse(text);
  } catch (err) {
    console.error("[register] JSON parse error:", err);
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    console.error("[register] Validation error:", JSON.stringify(parsed.error));
    const message = parsed.error.issues[0]?.message ?? "Données invalides";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { name, email, password } = parsed.data;
  const db = getSupabase();

  // Check if email already taken
  const { data: existing } = await db
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "Un compte existe déjà avec cet email" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = nanoid();

  const { error } = await db.from("users").insert({
    id,
    name,
    email,
    password_hash: passwordHash,
    emailVerified: new Date().toISOString(),
    credits: 0,
  });

  if (error) {
    console.error("[register] Insert error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du compte" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
