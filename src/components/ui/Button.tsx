import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dangerGhost";
type Size = "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500 shadow-sm",
  secondary:
    "bg-white text-neutral-800 border border-neutral-300 hover:bg-neutral-50 focus-visible:ring-neutral-400 shadow-sm",
  ghost:
    "bg-transparent text-neutral-700 hover:bg-neutral-100 focus-visible:ring-neutral-400",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-sm",
  dangerGhost:
    "bg-transparent text-red-600 hover:bg-red-50 focus-visible:ring-red-400",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-sm",
  icon: "h-11 w-11",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(
          "inline-flex select-none items-center justify-center gap-2 rounded-lg font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
          "disabled:pointer-events-none disabled:opacity-60",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
