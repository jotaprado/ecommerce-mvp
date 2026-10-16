import { useId } from "react";
import type { InputHTMLAttributes } from "react";

// Clase compartida para campos de texto (también la usan los <textarea> del panel).
export const fieldClasses =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-small text-text-primary placeholder:text-muted disabled:opacity-60";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

function Input({ label, error, id, className = "", ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-small font-medium text-text-primary mb-1">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={`${fieldClasses} ${error ? "border-danger" : ""}`}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export default Input;
