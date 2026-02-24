import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  accent?: "gold" | "green" | "red" | "blue";
}

const accentStyles = {
  gold: "border-amber-500/20 from-amber-500/5 to-transparent",
  green: "border-green-500/20 from-green-500/5 to-transparent",
  red: "border-red-500/20 from-red-500/5 to-transparent",
  blue: "border-blue-500/20 from-blue-500/5 to-transparent",
};

const iconAccentStyles = {
  gold: "text-amber-400 bg-amber-500/10",
  green: "text-green-400 bg-green-500/10",
  red: "text-red-400 bg-red-500/10",
  blue: "text-blue-400 bg-blue-500/10",
};

export default function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  accent = "gold",
}: StatCardProps) {
  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br bg-surface p-5 ${accentStyles[accent]}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-1 text-3xl font-bold">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`rounded-xl p-2.5 ${iconAccentStyles[accent]}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
