interface BadgeProps {
  children: React.ReactNode;
  variant?: "gold" | "blue" | "muted";
  className?: string;
}

export default function Badge({ children, variant = "gold", className = "" }: BadgeProps) {
  const variants = {
    gold: "bg-badge-gold-bg text-badge-gold-text border-badge-gold-border",
    blue: "bg-badge-blue-bg text-badge-blue-text border-badge-blue-border",
    muted: "bg-badge-muted-bg text-badge-muted-text border-badge-muted-border",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
