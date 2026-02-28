"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", disabled, children, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center font-medium rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]";

    const variants = {
      primary:
        "gradient-gold text-zinc-900 shadow-lg shadow-amber-900/20 hover:shadow-[0_0_30px_rgba(200,164,90,0.3)] hover:scale-[1.02]",
      secondary: "bg-surface border border-border text-foreground hover:bg-surface-hover",
      ghost: "text-muted hover:text-foreground hover:bg-surface-hover",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-5 py-2.5 text-sm",
      lg: "px-8 py-3.5 text-base",
    };

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
