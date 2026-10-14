import { AlertTriangle, CloudUpload, WifiOff } from "lucide-react";
import { useOfflineQueue } from "../../lib/offline/useOfflineQueue";
import { Button } from "../ui/Button";
import { t } from "../../i18n";

/**
 * Connection and pending-write banner.
 *
 * Distinguishing "offline" from "offline with N writes waiting" is the whole
 * point. A plain offline banner implies nothing is happening; a shopkeeper who
 * recorded a delivery needs to know whether it is saved or waiting, because those
 * call for different behaviour. So the count is shown explicitly, and a write the
 * server actually rejected is surfaced rather than retried forever in silence.
 */
export function OfflineBanner() {
  const { online, queueAvailable, pendingCount, blockedReason, replayNow } = useOfflineQueue();

  if (online && pendingCount === 0 && !blockedReason) return null;

  // A rejection is not a connectivity problem and must not be dressed as one.
  if (blockedReason) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 bg-error px-4 py-2 text-sm font-medium text-onPrimary"
      >
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{t("offline.writeRejected", { message: blockedReason })}</span>
        <Button
          variant="secondary"
          onClick={() => void replayNow()}
          className="h-8 px-3 text-xs"
        >
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 bg-warning px-4 py-2 text-sm font-medium text-onPrimary"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{t("offline.banner")}</span>

      {pendingCount > 0 && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface/20 px-2.5 py-0.5 text-xs font-semibold">
          <CloudUpload className="h-3.5 w-3.5" aria-hidden="true" />
          {t("offline.pendingWrites", { count: pendingCount })}
        </span>
      )}

      {!queueAvailable && (
        <span className="text-xs font-normal opacity-90">{t("offline.noQueue")}</span>
      )}
    </div>
  );
}
