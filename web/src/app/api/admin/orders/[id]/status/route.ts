import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getProject, updateProjectStatus } from "@/lib/store";
import type { AdminKanbanStatus, OrderStatus } from "@/lib/types";

const KANBAN_TO_ORDER_STATUS: Record<AdminKanbanStatus, OrderStatus> = {
  a_traiter: "pending",
  en_generation: "processing",
  a_valider: "quality_check",
  livre: "delivered",
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin();
  if ("error" in result && result.error) return result.error;

  const { id } = await params;
  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  const body = await request.json();
  const kanbanStatus = body.kanbanStatus as AdminKanbanStatus;

  const validStatuses: AdminKanbanStatus[] = [
    "a_traiter",
    "en_generation",
    "a_valider",
    "livre",
  ];

  if (!kanbanStatus || !validStatuses.includes(kanbanStatus)) {
    return NextResponse.json(
      { error: "Statut kanban invalide" },
      { status: 400 }
    );
  }

  try {
    const orderStatus = KANBAN_TO_ORDER_STATUS[kanbanStatus];
    const extraUpdates = kanbanStatus === "livre" ? { deliveredAt: Date.now() } : {};

    const updated = await updateProjectStatus(id, orderStatus, kanbanStatus, extraUpdates);

    return NextResponse.json({
      success: true,
      project: {
        id: updated.id,
        orderStatus: updated.orderStatus,
        kanbanStatus: updated.kanbanStatus,
      },
    });
  } catch (error) {
    console.error("[Admin Status] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du statut" },
      { status: 500 }
    );
  }
}
