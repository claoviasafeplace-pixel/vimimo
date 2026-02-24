import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getUserProjects } from "@/lib/store";

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;

    const userId = authResult.session.user.id;
    const projects = await getUserProjects(userId);

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Dashboard projects error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
