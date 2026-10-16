import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "cta" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent-blue text-white hover:bg-accent-blue-hover active:bg-accent-blue-active",
  cta: "bg-cta text-cta-text font-semibold hover:bg-cta-hover active:bg-cta-active",
  ghost: "bg-transparent text-accent-blue hover:bg-accent-blue-soft",
  danger: "bg-danger text-white hover:bg-red-700 active:bg-red-800",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-small",
  md: "px-4 py-2.5 text-small",
};

// Se exporta para reutilizar el estilo en enlaces (<Link>) con apariencia de botón.
export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  return `inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  disabled,
  className = "",
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${buttonClasses(variant, size)} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}

export default Button;
