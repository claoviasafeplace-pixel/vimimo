import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  const checks: Record<string, string> = {};

  // Supabase connection
  try {
    const db = getSupabase();
    const { count, error } = await db
      .from("users")
      .select("*", { count: "exact", head: true });
    checks.supabase = error ? `ERROR: ${error.message}` : `OK (${count} users)`;
  } catch (e) {
    checks.supabase = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Supabase Storage
  try {
    const db = getSupabase();
    const { data, error } = await db.storage.from("photos").list("uploads", { limit: 1 });
    checks.storage = error ? `ERROR: ${error.message}` : `OK (bucket accessible)`;
  } catch (e) {
    checks.storage = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Env vars
  checks.SUPABASE_URL = process.env.SUPABASE_URL ? "SET" : "MISSING";
  checks.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "MISSING";
  checks.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ? "SET" : "MISSING";
  checks.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ? "SET" : "MISSING";
  checks.AUTH_RESEND_KEY = process.env.AUTH_RESEND_KEY ? "SET" : "MISSING";
  checks.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ? "SET" : "MISSING";
  checks.AUTH_URL = process.env.AUTH_URL || "NOT SET";

  return NextResponse.json(checks);
}
