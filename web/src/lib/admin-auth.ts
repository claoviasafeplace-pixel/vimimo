import { auth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };
  }

  const db = getSupabase();
  const { data } = await db
    .from("users")
    .select("is_admin")
    .eq("id", session.user.id)
    .single();

  if (!data?.is_admin) {
    return { error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }) };
  }

  return { session };
}
