import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface ChipProps {
  selected?: boolean;
  onClick?: () => void;
  children: ReactNode;
  /** Optional trailing count, rendered in tabular figures. */
  count?: number;
  className?: string;
}

/**
 * Filter chip, from the design system's Chips component.
 *
 * A chip rather than a select when the options are few and mutually exclusive:
 * the whole set is visible at once, so choosing costs one glance and one click
 * instead of two clicks and a reopened dropdown. That is Hick's Law working in
 * the interface's favour rather than against it — fewer decisions, all of them
 * visible.
 *
 * 44px minimum height, per the system's touch-target rule, which is why this
 * looks generous for a "chip". A 28px chip is what the system's own reference
 * uses, and it is below the floor it also sets; the taller control wins because
 * this is used on a phone.
 */
export function Chip({ selected = false, onClick, children, count, className }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-11 select-none items-center gap-2 rounded-full border px-4 text-sm font-medium",
        "transition-colors duration-fast ease-snappy",
        selected
          ? "border-primary bg-primary-tint text-primary"
          : "border-line bg-surface text-body-soft hover:border-line-hi hover:text-body",
        className
      )}
    >
      {children}
      {count !== undefined && (
        // Selected state must not be carried by colour alone, so the pressed
        // state is also announced via aria-pressed above.
        <span className={cn("tnum text-xs", selected ? "text-primary" : "text-body-muted")}>
          {count}
        </span>
      )}
    </button>
  );
}

interface ChipGroupProps {
  label: string;
  children: ReactNode;
  className?: string;
}

/**
 * A labelled, horizontally scrollable chip row.
 *
 * `role="group"` with a label rather than a `radiogroup`: these are independent
 * toggles and filters, not one exclusive choice, and claiming the stricter role
 * would promise keyboard semantics the component does not implement.
 */
export function ChipGroup({ label, children, className }: ChipGroupProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {children}
    </div>
  );
}
