import type { ReactNode } from "react";

export type BadgeVariant = "neutral" | "info" | "success" | "warning" | "danger";

const VARIANTS: Record<BadgeVariant, string> = {
  neutral: "bg-slate-100 text-slate-700",
  info: "bg-accent-blue-soft text-accent-blue-active",
  success: "bg-emerald-50 text-emerald-800",
  warning: "bg-amber-50 text-amber-800",
  danger: "bg-red-50 text-red-700",
};

interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  children: ReactNode;
}

function Badge({ variant = "neutral", className = "", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export default Badge;
