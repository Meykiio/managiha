import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, rows = 3, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="mb-1.5 block text-sm font-medium text-body-soft"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          aria-invalid={!!error}
          className={cn(
            "w-full rounded-lg border bg-surface px-3.5 py-2.5 text-sm text-body placeholder:text-body-muted",
            "focus:outline-none focus:ring-2 transition",
            error
              ? "border-error focus:border-error focus:ring-error-tint"
              : "border-line-hi focus:border-primary focus:ring-primary-tint",
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs font-medium text-error-fg">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
