import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import type { BadgeTone } from "./Badge";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: BadgeTone;
  loading?: boolean;
}

const iconTones: Record<BadgeTone, string> = {
  success: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-600",
  danger: "bg-red-50 text-red-600",
  info: "bg-primary-50 text-primary-600",
  neutral: "bg-neutral-100 text-neutral-500",
};

export function StatCard({ icon: Icon, label, value, tone = "info", loading }: StatCardProps) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-card">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            iconTones[tone]
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <p className="text-sm font-medium text-neutral-500">{label}</p>
      </div>
      {loading ? (
        <div className="mt-4 h-9 w-32 animate-pulse rounded-lg bg-neutral-200/70" />
      ) : (
        <p className="tnum mt-3 truncate text-3xl font-semibold tracking-tight text-neutral-900">
          {value}
        </p>
      )}
    </div>
  );
}
