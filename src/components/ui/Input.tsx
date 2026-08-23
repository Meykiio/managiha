import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  prefixIcon?: ReactNode;
  suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, prefixIcon, suffix, className, id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-neutral-700"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {prefixIcon && (
            <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-neutral-400">
              {prefixIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            className={cn(
              "h-11 w-full rounded-lg border bg-white px-3.5 text-sm text-neutral-900 placeholder:text-neutral-400",
              "focus:outline-none focus:ring-2 transition disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500",
              error
                ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                : "border-neutral-300 focus:border-primary-500 focus:ring-primary-100",
              prefixIcon && "ps-10",
              suffix && "pe-14",
              className
            )}
            {...props}
          />
          {suffix && (
            <span className="pointer-events-none absolute inset-y-0 end-3.5 flex items-center text-sm font-medium text-neutral-500">
              {suffix}
            </span>
          )}
        </div>
        {error ? (
          <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
        ) : hint ? (
          <p className="mt-1.5 text-xs text-neutral-500">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
