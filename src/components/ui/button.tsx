import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: "primary" | "secondary" | "success" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
}

export function Button({ tone = "primary", size = "md", icon, className, children, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "touch-target inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-55",
        tone === "primary" && "bg-wine text-white shadow-soft hover:bg-wine/90",
        tone === "secondary" && "border border-wine/20 bg-white text-wine hover:bg-linen",
        tone === "success" && "bg-moss text-white hover:bg-moss/90",
        tone === "danger" && "bg-coral text-white hover:bg-coral/90",
        tone === "ghost" && "text-ink hover:bg-linen",
        size === "sm" && "px-3 py-2 text-sm",
        size === "md" && "px-4 py-3 text-sm",
        size === "lg" && "px-5 py-4 text-base",
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
