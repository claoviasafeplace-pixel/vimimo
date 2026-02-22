"use client";

import { motion } from "framer-motion";

interface ProgressBarProps {
  progress: number;
  className?: string;
}

export default function ProgressBar({ progress, className = "" }: ProgressBarProps) {
  return (
    <div className={`h-2 w-full rounded-full bg-zinc-800 overflow-hidden ${className}`}>
      <motion.div
        className="h-full rounded-full gradient-gold"
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  );
}
