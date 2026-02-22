interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-2xl bg-surface border border-border p-6 ${className}`}
    >
      {children}
    </div>
  );
}
