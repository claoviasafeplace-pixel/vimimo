import { NextResponse } from "next/server";
import { requireProjectOwner } from "@/lib/api-auth";
import { generateDescription } from "@/lib/services/openai";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await requireProjectOwner(id);
    if (result.error) return result.error;

    const { project } = result;

    if (project.phase !== "done") {
      return NextResponse.json(
        { error: "Le projet doit être terminé" },
        { status: 400 }
      );
    }

    const description = await generateDescription(project);

    return NextResponse.json(description);
  } catch (error) {
    console.error("Description generation error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération de la description" },
      { status: 500 }
    );
  }
}
