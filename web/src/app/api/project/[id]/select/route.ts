import { NextResponse } from "next/server";
import { saveProject } from "@/lib/store";
import { requireProjectOwner } from "@/lib/api-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const ownerResult = await requireProjectOwner(id);
    if (ownerResult.error) return ownerResult.error;

    const project = ownerResult.project;

    if (project.phase !== "selecting") {
      return NextResponse.json(
        { error: "Le projet n'est pas en phase de sélection" },
        { status: 400 }
      );
    }

    const { roomIndex, optionIndex } = await request.json();

    if (
      roomIndex < 0 ||
      roomIndex >= project.rooms.length ||
      optionIndex < 0 ||
      optionIndex >= project.rooms[roomIndex].options.length
    ) {
      return NextResponse.json({ error: "Index invalide" }, { status: 400 });
    }

    project.rooms[roomIndex].selectedOptionIndex = optionIndex;
    await saveProject(project);

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Select error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la sélection" },
      { status: 500 }
    );
  }
}
