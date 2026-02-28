"use client";

import type { ProjectSummary } from "@/lib/store";
import type { AdminKanbanStatus } from "@/lib/types";
import KanbanCard from "./KanbanCard";
import { Inbox, Cpu, Eye, CheckCircle2 } from "lucide-react";

interface KanbanBoardProps {
  orders: Record<AdminKanbanStatus, ProjectSummary[]>;
  onCardClick: (order: ProjectSummary) => void;
}

const COLUMNS: {
  id: AdminKanbanStatus;
  label: string;
  headerClass: string;
  icon: typeof Inbox;
}[] = [
  {
    id: "a_traiter",
    label: "A traiter",
    headerClass: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    icon: Inbox,
  },
  {
    id: "en_generation",
    label: "En generation",
    headerClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: Cpu,
  },
  {
    id: "a_valider",
    label: "A valider",
    headerClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: Eye,
  },
  {
    id: "livre",
    label: "Livre",
    headerClass: "bg-green-500/10 text-green-400 border-green-500/20",
    icon: CheckCircle2,
  },
];

export default function KanbanBoard({ orders, onCardClick }: KanbanBoardProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((col) => {
        const items = orders[col.id] || [];
        return (
          <div key={col.id} className="flex flex-col">
            {/* Column header */}
            <div
              className={`mb-3 flex items-center gap-2 rounded-xl border px-4 py-2.5 ${col.headerClass}`}
            >
              <col.icon className="h-4 w-4" />
              <span className="text-sm font-semibold">{col.label}</span>
              <span className="ml-auto rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-muted">
                {items.length}
              </span>
            </div>

            {/* Column body */}
            <div className="flex flex-1 flex-col gap-2 rounded-2xl border border-border bg-surface/30 p-2 min-h-[200px]">
              {items.length === 0 ? (
                <div className="flex flex-1 items-center justify-center text-xs text-muted">
                  Aucune commande
                </div>
              ) : (
                items.map((order) => (
                  <KanbanCard
                    key={order.id}
                    order={order}
                    onClick={onCardClick}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
