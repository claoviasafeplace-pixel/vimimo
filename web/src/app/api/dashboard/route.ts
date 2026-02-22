import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getUserTransactions, getActiveSubscription } from "@/lib/store";

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;

    const userId = authResult.session.user.id;
    const [transactions, subscription] = await Promise.all([
      getUserTransactions(userId),
      getActiveSubscription(userId),
    ]);

    return NextResponse.json({ transactions, subscription });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
