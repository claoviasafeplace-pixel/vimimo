interface BadgeProps {
  children: React.ReactNode;
  variant?: "gold" | "blue" | "muted";
  className?: string;
}

export default function Badge({ children, variant = "gold", className = "" }: BadgeProps) {
  const variants = {
    gold: "bg-amber-900/30 text-amber-300 border-amber-700/30",
    blue: "bg-blue-900/30 text-blue-300 border-blue-700/30",
    muted: "bg-zinc-800 text-zinc-400 border-zinc-700",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
