import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getOrdersByKanbanStatus } from "@/lib/store";

export async function GET(_request: NextRequest) {
  const result = await requireAdmin();
  if ("error" in result && result.error) return result.error;

  try {
    const orders = await getOrdersByKanbanStatus();
    return NextResponse.json({ orders });
  } catch (error) {
    console.error("[Admin Orders] Error fetching orders:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des commandes" },
      { status: 500 }
    );
  }
}
