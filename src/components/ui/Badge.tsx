import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import type { StockStatus } from "../../lib/types";

const tones = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  info: "bg-primary-50 text-primary-700 border-primary-100",
  neutral: "bg-neutral-100 text-neutral-600 border-neutral-200",
} as const;

export type BadgeTone = keyof typeof tones;

const dotColors = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-primary-500",
  neutral: "bg-neutral-400",
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
