import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { Sparkline } from "./Sparkline";
import { Skeleton } from "./Spinner";
import { cn } from "../../lib/utils";

/**
 * Metric Card — the design system's signature component.
 *
 * Three of the system's UX Principles converge here and each is enforced by the
 * prop shape rather than by review:
 *
 *   Information Scent — "Every metric card must include delta + sparkline.
 *   Numbers without trend context are noise." `delta` and `series` are required,
 *   so a card without trend context cannot be constructed.
 *
 *   Weber-Fechner — "Use color-coded deltas: green for positive, red for
 *   negative. Never rely on sign alone." The delta renders an arrow *and* a
 *   colour *and* a sign, so it survives greyscale and colour-blindness.
 *
 *   Stroop Effect — "Never color a metric label differently from its value.
 *   Label and value must share color family." Both use the same foreground token;
 *   only the delta is coloured, because there the colour carries meaning.
 *
 *   Pascal's Wager — "Always show loading skeletons before data. Empty states
 *   must never flash as zero values." While `loading`, the value renders as a
 *   skeleton bar. It never renders "0".
 *
 * `goodDirection` exists because a green-up/red-down rule is wrong for balances.
 * Money owed rising is not obviously good or bad — it is more credit extended,
 * which is more trade and more risk at once. Those metrics declare "neutral" and
 * get a muted delta. Colouring them would be the interface asserting an opinion
 * the product does not hold.
 */
export type MetricTone = "primary" | "positive" | "error" | "warning" | "muted";
export type GoodDirection = "up" | "down" | "neutral";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  /** Preformatted for display. The card does not format numbers itself. */
  value: string;
  /** Signed change against the previous period, preformatted (e.g. "+12 %"). */
  delta?: string | null;
  /** Raw direction of the change, used to pick the arrow. */
  deltaDirection?: "up" | "down" | "flat";
  /** Whether that direction is good, bad, or neither for this metric. */
  goodDirection?: GoodDirection;
  /** Trend samples, oldest first. */
  series: number[];
  /** Describes the series for assistive technology. */
  seriesLabel: string;
  loading?: boolean;
}

function toneFor(
  direction: "up" | "down" | "flat",
  good: GoodDirection
): "positive" | "error" | "muted" {
  if (direction === "flat" || good === "neutral") return "muted";
  const isGood =
    (direction === "up" && good === "up") || (direction === "down" && good === "down");
  return isGood ? "positive" : "error";
}

const deltaToneClass = {
  positive: "text-positive-fg",
  error: "text-error-fg",
  muted: "text-body-muted",
} as const;

const iconToneClass: Record<MetricTone, string> = {
  primary: "bg-primary-tint text-primary",
  positive: "bg-positive-tint text-positive-fg",
  error: "bg-error-tint text-error-fg",
  warning: "bg-warning-tint text-warning-fg",
  muted: "bg-surface-high text-body-muted",
};

export function MetricCard({
  icon: Icon,
  label,
  value,
  delta,
  deltaDirection = "flat",
  goodDirection = "neutral",
  series,
  seriesLabel,
  loading = false,
}: MetricCardProps) {
  const tone = toneFor(deltaDirection, goodDirection);
  const Arrow =
    deltaDirection === "up" ? ArrowUpRight : deltaDirection === "down" ? ArrowDownRight : ArrowRight;

  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            iconToneClass[goodDirection === "neutral" ? "muted" : "primary"]
          )}
          aria-hidden="true"
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>

        {delta && (
          <span
            className={cn(
              "tnum inline-flex items-center gap-1 text-xs font-semibold",
              deltaToneClass[tone]
            )}
          >
            <Arrow className="h-3.5 w-3.5" aria-hidden="true" />
            {delta}
          </span>
        )}
      </div>

      <p className="mt-3 text-xs font-medium text-body-muted">{label}</p>

      {loading ? (
        /* Never a zero. A metric that reads "0" while loading is a lie the user
           may act on before the real value arrives. */
        <Skeleton className="mt-1 h-7 w-24" />
      ) : (
        <p className="tnum mt-0.5 font-mono text-2xl font-bold leading-tight text-body">
          {value}
        </p>
      )}

      <div className="mt-3">
        {loading ? (
          <Skeleton className="h-8 w-full" />
        ) : (
          <Sparkline values={series} label={seriesLabel} tone={tone === "muted" ? "muted" : tone} />
        )}
      </div>
    </div>
  );
}
