import { useId } from "react";
import type { SelectHTMLAttributes } from "react";
import { fieldClasses } from "./Input";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

function Select({ label, id, className = "", children, ...rest }: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={selectId} className="block text-small font-medium text-text-primary mb-1">
          {label}
        </label>
      )}
      <select id={selectId} className={fieldClasses} {...rest}>
        {children}
      </select>
    </div>
  );
}

export default Select;
