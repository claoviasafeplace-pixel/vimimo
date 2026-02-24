import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getPredictionStatus } from "@/lib/services/replicate";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;

    const { id } = await params;
    const status = await getPredictionStatus(id);
    return NextResponse.json(status);
  } catch (error) {
    console.error("Replicate status error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la vérification" },
      { status: 500 }
    );
  }
}
