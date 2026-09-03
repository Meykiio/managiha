import { cn } from "../../lib/utils";
import { t } from "../../i18n";

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-5 w-5 animate-spin text-primary-600", className)}
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
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-neutral-200/70", className)} />;
}
