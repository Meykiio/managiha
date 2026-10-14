import { Card } from "./Card";
import { cn } from "../../lib/utils";

type StatTone = "neutral" | "positive" | "warning" | "danger";

const TONE_CLASS: Record<StatTone, string> = {
  neutral: "text-body",
  positive: "text-positive-fg",
  warning: "text-warning-fg",
  danger: "text-error-fg",
};

interface StatProps {
  label: string;
  value: string;
  /** Optional second line, smaller — a count under a total, or the reverse. */
  detail?: string;
  tone?: StatTone;
}

/**
 * A single figure with a label.
 *
 * Deliberately not MetricCard: that one requires a series and a delta because the
 * design system wants every dashboard metric to carry trend context. A stat has
 * no history to show — "3 lots already expired" is a fact about right now, and
 * inventing a sparkline for it would be decoration.
 */
export function Stat({ label, value, detail, tone = "neutral" }: StatProps) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-body-muted">{label}</p>
      <p className={cn("tnum mt-1 text-2xl font-semibold", TONE_CLASS[tone])}>{value}</p>
      {detail && <p className="mt-0.5 text-xs text-body-muted">{detail}</p>}
    </Card>
  );
}
