import { cn } from "../../lib/utils";
import type { StockStatus } from "../../lib/types";

const tones = {
  success: "bg-positive-tint text-positive-fg border-positive",
  warning: "bg-warning-tint text-warning-fg border-warning",
  danger: "bg-error-tint text-error-fg border-error",
  info: "bg-primary-tint text-primary border-primary-tint",
  neutral: "bg-surface-high text-body-soft border-line",
} as const;

export type BadgeTone = keyof typeof tones;

const dotColors = {
  success: "bg-positive",
  warning: "bg-warning",
  danger: "bg-error",
  info: "bg-primary",
  neutral: "bg-line-hi",
} as const;

interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Badge({ tone = "neutral", dot, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        tones[tone],
        className
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotColors[tone])} />}
      {children}
    </span>
  );
}

export function stockStatusTone(status: StockStatus): BadgeTone {
  if (status === "out") return "danger";
  if (status === "low") return "warning";
  return "success";
}
