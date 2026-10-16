import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

function Card({ hoverable = false, className = "", ...rest }: CardProps) {
  return (
    <div
      className={`bg-surface border border-border rounded-card shadow-card ${
        hoverable ? "transition-shadow hover:shadow-card-hover" : ""
      } ${className}`}
      {...rest}
    />
  );
}

export default Card;
