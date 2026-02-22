import { NextResponse } from "next/server";
import { saveProject } from "@/lib/store";
import { startRender } from "@/lib/services/remotion";
import { requireProjectOwner } from "@/lib/api-auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const ownerResult = await requireProjectOwner(id);
    if (ownerResult.error) return ownerResult.error;

    const project = ownerResult.project;

    const renderId = await startRender(project);
    project.remotionRenderId = renderId;
    project.phase = "rendering";
    await saveProject(project);

    return NextResponse.json({ renderId });
  } catch (error) {
    console.error("Render error:", error);
    return NextResponse.json(
      { error: "Erreur lors du lancement du rendu" },
      { status: 500 }
    );
  }
}
