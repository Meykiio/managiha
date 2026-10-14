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
  primary: "bg-primary-solid text-onPrimary hover:opacity-90 shadow-sm",
  secondary: "bg-surface text-body border border-line-hi hover:bg-surface-mid shadow-sm",
  ghost: "bg-transparent text-body-soft hover:bg-surface-high",
  danger: "bg-error text-onPrimary hover:opacity-90 shadow-sm",
  dangerGhost: "bg-transparent text-error-fg hover:bg-error-tint",
};

/* Touch targets: the system sets a 44px floor for buttons, which is also what
   iOS and Android ask for. `icon` is square at the same height so icon buttons
   are not the one control that misses it. */
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
          "inline-flex select-none items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-fast ease-snappy",
          // No per-variant focus ring. The global :focus-visible rule in
          // index.css supplies the system's "2px solid primary, 2px offset" for
          // every interactive element, and a local ring would fight it.
          "active:scale-[.98]",
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
