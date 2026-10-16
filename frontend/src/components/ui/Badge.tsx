import type { ReactNode } from "react";

export type BadgeVariant = "neutral" | "info" | "success" | "danger";

const VARIANTS: Record<BadgeVariant, string> = {
  neutral: "bg-slate-200 text-slate-800",
  info: "bg-accent-blue-soft text-accent-blue-active",
  success: "bg-emerald-50 text-success",
  danger: "bg-red-100 text-red-800",
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
