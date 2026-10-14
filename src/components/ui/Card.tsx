import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface CardProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

export function Card({
  title,
  description,
  action,
  className,
  bodyClassName,
  children,
}: CardProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-line bg-surface shadow-card",
        className
      )}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-5 pb-1 pt-5">
          <div>
            {title && (
              <h2 className="text-base font-semibold text-body">{title}</h2>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-body-muted">{description}</p>
            )}
          </div>
          {action}
        </header>
      )}
      <div className={cn("px-5 pb-5 pt-3", bodyClassName)}>{children}</div>
    </section>
  );
}
