import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  message: string;
  action?: ReactNode;
}

function EmptyState({ icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-border bg-surface px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-blue-soft text-accent-blue">
        {icon}
      </div>
      <p className="text-body text-muted">{message}</p>
      {action}
    </div>
  );
}

export default EmptyState;
