import { cn } from "../../lib/utils";

interface SparklineProps {
  values: number[];
  /** Accessible description. A sparkline is a chart, so it needs a text alternative. */
  label: string;
  tone?: "primary" | "positive" | "error" | "muted";
  className?: string;
}

const toneClass = {
  primary: "fill-primary",
  positive: "fill-positive",
  error: "fill-error",
  muted: "fill-line-hi",
} as const;

/**
 * Sparkline bars — the design system's signature Metric Card companion.
 *
 * Bars rather than a line: at 8-16 samples and 32px of height a line is mostly
 * interpolation the reader has to undo, while bars read as discrete days, which
 * is what the values actually are.
 *
 * Decorative for assistive technology by default (aria-hidden) because the metric
 * card always renders the same trend in text. Rendering it as a labelled image
 * instead would make a screen reader announce the shape twice.
 */
export function Sparkline({
  values,
  label,
  tone = "primary",
  className,
}: SparklineProps) {
  const points = values.slice(-16);

  if (points.length === 0) {
    return <div className={cn("h-8", className)} aria-hidden="true" />;
  }

  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min;

  return (
    <svg
      viewBox={`0 0 ${points.length * 4} 32`}
      preserveAspectRatio="none"
      className={cn("h-8 w-full", toneClass[tone], className)}
      aria-hidden="true"
      focusable="false"
      data-sparkline={label}
    >
      {points.map((value, index) => {
        // A flat series would divide by zero. Render it as a level mid-height band
        // rather than as nothing, because "no change" is itself information.
        const ratio = span === 0 ? 0.5 : (value - min) / span;
        // Floor of 2px so a near-zero day is still visible as a day.
        const height = 2 + ratio * 30;
        return (
          <rect
            key={index}
            x={index * 4 + 0.5}
            y={32 - height}
            width={2.5}
            height={height}
            rx={0.5}
          />
        );
      })}
    </svg>
  );
}
