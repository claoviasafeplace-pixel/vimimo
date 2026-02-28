"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Download, Loader2, Play, Clock, CheckCircle2, AlertCircle, Eye } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface OrderCardProps {
  project: {
    id: string;
    phase: string;
    mode: string;
    styleLabel: string;
    roomCount: number;
    thumbnailUrl: string | null;
    finalVideoUrl: string | null;
    studioMontageUrl: string | null;
    createdAt: number;
    error: string | null;
    orderStatus?: string | null;
    kanbanStatus?: string | null;
    deliveredAt?: number | null;
  };
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; badgeColor: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Commande recue",
    color: "text-amber-400",
    badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  processing: {
    label: "En cours de creation",
    color: "text-blue-400",
    badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  },
  quality_check: {
    label: "Controle qualite",
    color: "text-purple-400",
    badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    icon: <Eye className="h-3.5 w-3.5" />,
  },
  delivered: {
    label: "Pret !",
    color: "text-green-400",
    badgeColor: "bg-green-500/20 text-green-400 border-green-500/30",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  error: {
    label: "Erreur",
    color: "text-red-400",
    badgeColor: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
};

export default function OrderCard({ project }: OrderCardProps) {
  const status = project.orderStatus || "pending";
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const isDelivered = status === "delivered";

  return (
    <Link href={`/project/${project.id}`} className="block group">
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="rounded-2xl border border-border bg-surface overflow-hidden transition-all duration-200 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-900/5"
      >
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-surface-hover to-surface">
          {project.thumbnailUrl ? (
            <Image
              src={project.thumbnailUrl}
              alt={project.styleLabel || "Commande"}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center">
                <Play className="h-5 w-5 text-amber-400" />
              </div>
            </div>
          )}

          {/* Processing overlay */}
          {status === "processing" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                <span className="text-xs font-medium text-white">
                  En cours de creation...
                </span>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {status === "error" && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-red-900/80 to-transparent px-3 py-2">
              <p className="text-xs text-red-300 truncate">
                {project.error || "Erreur"}
              </p>
            </div>
          )}

          {/* Mode badge */}
          <div className="absolute left-2 top-2 flex gap-1.5">
            <Badge variant={project.mode === "video_visite" ? "gold" : "muted"}>
              {project.mode === "video_visite" ? "Video" : "Staging"}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {project.styleLabel || "Commande"}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {project.roomCount}{" "}
                {project.roomCount > 1 ? "pieces" : "piece"} &middot;{" "}
                {new Date(project.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            {/* Status badge */}
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.badgeColor}`}
            >
              {config.icon}
              {config.label}
            </span>
          </div>

          {/* Download buttons when delivered */}
          {isDelivered &&
            (project.finalVideoUrl || project.studioMontageUrl) && (
              <div className="mt-3 flex gap-2">
                {project.finalVideoUrl && (
                  <a
                    href={project.finalVideoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="primary" size="sm" className="text-xs">
                      <Download className="mr-1 h-3 w-3" />
                      Video
                    </Button>
                  </a>
                )}
                {project.studioMontageUrl && (
                  <a
                    href={project.studioMontageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="secondary" size="sm" className="text-xs">
                      <Download className="mr-1 h-3 w-3" />
                      Montage
                    </Button>
                  </a>
                )}
              </div>
            )}
        </div>
      </motion.div>
    </Link>
  );
}
