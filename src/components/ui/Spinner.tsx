import { cn } from "../../lib/utils";
import { t } from "../../i18n";

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      /* role="status" so the label is actually announced; a bare aria-label on an
         unroled svg is inconsistently exposed across screen readers. */
      role="status"
      className={cn("h-5 w-5 animate-spin text-primary", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-label={t("common.loading")}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

/**
 * Shimmer placeholder, per the system's Skeleton Grid component.
 *
 * `.shimmer` rather than Tailwind's `animate-pulse`: the system specifies a
 * travelling highlight, and it is defined once in index.css where the
 * prefers-reduced-motion block can switch it off in the same place.
 *
 * Always aria-hidden. A placeholder is a visual stand-in, and announcing
 * "loading" per bar would flood a screen reader on a dashboard of them — the
 * container is what should carry that, via AsyncState below.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("shimmer rounded-lg", className)}
      aria-hidden="true"
      data-skeleton="true"
    />
  );
}

/** A grid of skeleton cards, sized to match what is about to replace it. */
export function SkeletonGrid({
  count = 4,
  className,
  itemClassName = "h-32",
}: {
  count?: number;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div className={cn("grid gap-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className={itemClassName} />
      ))}
    </div>
  );
}
