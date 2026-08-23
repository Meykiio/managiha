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
            className="mb-1.5 block text-sm font-medium text-neutral-700"
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
            "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400",
            "focus:outline-none focus:ring-2 transition",
            error
              ? "border-red-300 focus:border-red-500 focus:ring-red-100"
              : "border-neutral-300 focus:border-primary-500 focus:ring-primary-100",
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
