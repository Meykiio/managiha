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
            className="mb-1.5 block text-sm font-medium text-body-soft"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {prefixIcon && (
            <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-body-muted">
              {prefixIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            className={cn(
              "h-11 w-full rounded-lg border bg-surface px-3.5 text-sm text-body placeholder:text-body-muted",
              "focus:outline-none focus:ring-2 transition disabled:cursor-not-allowed disabled:bg-bg disabled:text-body-muted",
              error
                ? "border-error focus:border-error focus:ring-error-tint"
                : "border-line-hi focus:border-primary focus:ring-primary-tint",
              prefixIcon && "ps-10",
              suffix && "pe-14",
              className
            )}
            {...props}
          />
          {suffix && (
            <span className="pointer-events-none absolute inset-y-0 end-3.5 flex items-center text-sm font-medium text-body-muted">
              {suffix}
            </span>
          )}
        </div>
        {error ? (
          <p className="mt-1.5 text-xs font-medium text-error-fg">{error}</p>
        ) : hint ? (
          <p className="mt-1.5 text-xs text-body-muted">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
