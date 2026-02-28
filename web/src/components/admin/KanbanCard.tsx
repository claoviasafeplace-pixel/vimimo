"use client";

import type { ProjectSummary } from "@/lib/store";
import Badge from "@/components/ui/Badge";
import { Clock, Home, User } from "lucide-react";

interface KanbanCardProps {
  order: ProjectSummary;
  onClick: (order: ProjectSummary) => void;
}

const statusBorderColors: Record<string, string> = {
  a_traiter: "border-l-zinc-400",
  en_generation: "border-l-blue-500",
  a_valider: "border-l-amber-500",
  livre: "border-l-green-500",
};

export default function KanbanCard({ order, onClick }: KanbanCardProps) {
  const borderColor =
    statusBorderColors[order.kanbanStatus || "a_traiter"] || "border-l-zinc-400";

  return (
    <div
      onClick={() => onClick(order)}
      className={`cursor-pointer rounded-xl border border-border border-l-4 ${borderColor} bg-surface p-3 transition-all hover:bg-surface-hover hover:shadow-md`}
    >
      {/* Thumbnail */}
      {order.thumbnailUrl && (
        <div className="mb-2 aspect-video overflow-hidden rounded-lg bg-surface-hover">
          <img
            src={order.thumbnailUrl}
            alt="Apercu"
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Project ID + email */}
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-mono text-xs text-muted">
          {order.id.slice(0, 8)}...
        </span>
        <Badge variant={order.ambiance === "nuit" ? "blue" : "muted"}>
          {order.styleLabel || "Style"}
        </Badge>
      </div>

      {/* Client email */}
      {order.clientEmail && (
        <div className="mb-1.5 flex items-center gap-1 text-xs text-muted truncate">
          <User className="h-3 w-3 shrink-0" />
          <span className="truncate">{order.clientEmail}</span>
        </div>
      )}

      {/* Room count + date */}
      <div className="flex items-center justify-between text-xs text-muted">
        <span className="flex items-center gap-1">
          <Home className="h-3 w-3" />
          {order.roomCount} piece{order.roomCount > 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {new Date(order.createdAt).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
          })}
        </span>
      </div>
    </div>
  );
}
