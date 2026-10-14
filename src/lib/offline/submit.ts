import { enqueue, isQueueAvailable, type QueuedKind } from "./queue";

export type SubmitOutcome = "saved" | "queued";

/**
 * A network-shaped failure, as opposed to the server refusing the write.
 *
 * The distinction is the whole design. `Failed to fetch` means the request never
 * arrived, so queueing it is safe and useful. A Postgres error means the server
 * considered the write and rejected it, so queueing it would be storing something
 * we already know is invalid.
 */
function isNetworkFailure(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("failed to fetch") ||
    m.includes("networkerror") ||
    m.includes("network request failed") ||
    m.includes("load failed") ||
    m.includes("timeout") ||
    m.includes("err_internet_disconnected")
  );
}

/**
 * Run a write, or queue it if the network is unreachable.
 *
 * Queueing is safe only because every write RPC is idempotent on `opId`: a request
 * whose response was lost is replayed as a no-op rather than applied twice. That
 * property is what turns a retry queue from a liability into a feature, and it is
 * why the opId is stored alongside the payload rather than regenerated on replay.
 *
 * Returns "queued" rather than throwing, because being offline is not an error —
 * it is a state the caller must reflect in the UI. A silent success here would
 * make a shopkeeper believe a delivery was recorded when it is only waiting.
 */
export async function submitOrQueue(
  kind: QueuedKind,
  opId: string,
  payload: Record<string, unknown>,
  send: () => Promise<unknown>
): Promise<SubmitOutcome> {
  try {
    await send();
    return "saved";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (!isNetworkFailure(message)) throw err;

    // IndexedDB is blocked in some private-browsing modes. Without a queue there
    // is nowhere to put the write, so the honest outcome is an error, not a
    // success that silently loses the work.
    if (!(await isQueueAvailable())) throw err;

    await enqueue({ opId, kind, payload });
    return "queued";
  }
}
