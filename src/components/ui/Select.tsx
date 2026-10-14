import type { SelectHTMLAttributes } from "react";
import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Select({
  label,
  error,
  hint,
  className,
  children,
  id,
  ...props
}: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-body-soft">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={!!error}
          className={cn(
            "h-11 w-full appearance-none rounded-lg border bg-surface ps-3.5 pe-10 text-sm text-body",
            "focus:outline-none focus:ring-2 transition disabled:cursor-not-allowed disabled:bg-bg",
            error
              ? "border-error focus:border-error focus:ring-error-tint"
              : "border-line-hi focus:border-primary focus:ring-primary-tint",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute inset-y-0 end-3 my-auto h-4 w-4 text-body-muted" />
      </div>
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-error-fg">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-body-muted">{hint}</p>
      ) : null}
    </div>
  );
}
