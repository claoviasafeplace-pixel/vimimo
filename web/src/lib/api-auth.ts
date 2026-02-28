import { auth } from "@/lib/auth";
import { getProject } from "@/lib/store";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import type { Project } from "@/lib/types";

export async function requireAuth(): Promise<
  { session: Session; error?: never } | { session?: never; error: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      error: NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      ),
    };
  }
  return { session };
}

export async function requireProjectOwner(
  projectId: string
): Promise<
  | { session: Session; project: Project; error?: never }
  | { session?: never; project?: never; error: NextResponse }
> {
  const result = await requireAuth();
  if (result.error) return result;

  const project = await getProject(projectId);
  if (!project) {
    return {
      error: NextResponse.json(
        { error: "Projet introuvable" },
        { status: 404 }
      ),
    };
  }

  // SEC-1.2: Block access to projects without userId (guest orders) unless admin
  if (!project.userId) {
    const isAdmin = (result.session.user as { isAdmin?: boolean }).isAdmin === true;
    if (!isAdmin) {
      return {
        error: NextResponse.json(
          { error: "Accès interdit" },
          { status: 403 }
        ),
      };
    }
  } else if (project.userId !== result.session.user.id) {
    return {
      error: NextResponse.json(
        { error: "Accès interdit" },
        { status: 403 }
      ),
    };
  }

  return { session: result.session, project };
}
