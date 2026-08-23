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
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-neutral-700">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={!!error}
          className={cn(
            "h-11 w-full appearance-none rounded-lg border bg-white ps-3.5 pe-10 text-sm text-neutral-900",
            "focus:outline-none focus:ring-2 transition disabled:cursor-not-allowed disabled:bg-neutral-50",
            error
              ? "border-red-300 focus:border-red-500 focus:ring-red-100"
              : "border-neutral-300 focus:border-primary-500 focus:ring-primary-100",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute inset-y-0 end-3 my-auto h-4 w-4 text-neutral-400" />
      </div>
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-neutral-500">{hint}</p>
      ) : null}
    </div>
  );
}
