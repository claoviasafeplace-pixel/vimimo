import { NextResponse } from "next/server";
import { requireProjectOwner } from "@/lib/api-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const ownerResult = await requireProjectOwner(id);
    if (ownerResult.error) return ownerResult.error;

    return NextResponse.json({ project: ownerResult.project });
  } catch (error) {
    console.error("Project GET error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
