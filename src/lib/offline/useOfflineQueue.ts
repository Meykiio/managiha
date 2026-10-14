import { useCallback, useEffect, useState } from "react";
import {
  countPending,
  isQueueAvailable,
  listPending,
  markFailed,
  removePending,
  type QueuedWrite,
} from "./queue";
import { callAdjustStock, callRecordCarnetTransaction } from "../rpc";
import { supabase } from "../supabaseClient";

/**
 * Replays queued writes when the connection returns.
 *
 * Runs oldest first and stops at the first failure that is not a network error.
 * That ordering matters: if a receipt and its correction are both queued, replaying
 * them out of order would leave the wrong stock. Stopping on a real server
 * rejection matters too — a validation error will not fix itself by retrying, and
 * hammering the server with a write it has already refused is worse than leaving
 * it visibly pending for a human.
 */

async function dispatch(item: QueuedWrite): Promise<void> {
  switch (item.kind) {
    case "adjust_stock": {
      const p = item.payload as Parameters<typeof callAdjustStock>[0];
      await callAdjustStock(p);
      return;
    }
    case "record_carnet_transaction": {
      const p = item.payload as Parameters<typeof callRecordCarnetTransaction>[0];
      await callRecordCarnetTransaction(p);
      return;
    }
  }
}

/** A network-shaped failure is worth retrying; anything else is a real rejection. */
function isRetryable(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("failed to fetch") ||
    m.includes("networkerror") ||
    m.includes("network request failed") ||
    m.includes("load failed") ||
    m.includes("timeout")
  );
}

export interface OfflineState {
  online: boolean;
  /** False in private-browsing modes where IndexedDB is blocked. */
  queueAvailable: boolean;
  pendingCount: number;
  /** Last replay failure that a human needs to look at. */
  blockedReason: string | null;
  replayNow: () => Promise<void>;
}

export function useOfflineQueue(): OfflineState {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [queueAvailable, setQueueAvailable] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  const refreshCount = useCallback(async () => {
    try {
      setPendingCount(await countPending());
    } catch {
      // IndexedDB unavailable. The banner falls back to the online/offline state.
    }
  }, []);

  const replayNow = useCallback(async () => {
    if (!navigator.onLine) return;

    let pending: QueuedWrite[];
    try {
      pending = await listPending();
    } catch {
      return;
    }

    for (const item of pending) {
      try {
        await dispatch(item);
        await removePending(item.opId);
        setBlockedReason(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (isRetryable(message)) {
          // Still offline in practice. Leave it and try again later.
          setBlockedReason(null);
          break;
        }
        // A real rejection. Keep it visible rather than retrying forever.
        await markFailed(item.opId, message);
        setBlockedReason(message);
        break;
      }
    }

    await refreshCount();
  }, [refreshCount]);

  useEffect(() => {
    isQueueAvailable().then(setQueueAvailable);
    refreshCount();
  }, [refreshCount]);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      void replayNow();
    };
    const goOffline = () => setOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    // A session can be restored without an online event firing, so attempt a
    // replay once when the queue hook first mounts.
    if (navigator.onLine) void replayNow();

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [replayNow]);

  // A failed auth token looks like an offline failure and is not. Checking the
  // session before retrying avoids a loop where every queued write fails with 401.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") void replayNow();
    });
    return () => data.subscription.unsubscribe();
  }, [replayNow]);

  return { online, queueAvailable, pendingCount, blockedReason, replayNow };
}
