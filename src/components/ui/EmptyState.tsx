import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, body, action, compact }: EmptyStateProps) {
  return (
    <div
      className={
        compact
          ? "flex flex-col items-center gap-2 py-8 text-center"
          : "flex flex-col items-center gap-3 px-6 py-14 text-center"
      }
    >
      <span
        className={
          compact
            ? "flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100"
            : "flex h-12 w-12 items-center justify-center rounded-full bg-primary-50"
        }
      >
        <Icon
          className={compact ? "h-5 w-5 text-neutral-400" : "h-6 w-6 text-primary-600"}
        />
      </span>
      <div>
        <p className="text-sm font-semibold text-neutral-800">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">{body}</p>
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
