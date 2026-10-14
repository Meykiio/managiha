/**
 * Durable queue for writes that could not reach the server.
 *
 * Why this is correct rather than a hopeful retry: every write RPC already takes
 * a `p_client_op_id` and is idempotent server-side. The queue stores that same id
 * with the operation, so replaying an operation that in fact succeeded (the
 * response was lost, not the request) is a no-op instead of a double sale. Without
 * that property a queue would be dangerous; with it, a queue is safe by
 * construction.
 *
 * Why not Dexie: this needs one object store and three operations. A dependency
 * that exists to save eighty lines is not worth the supply-chain surface.
 *
 * What this deliberately is NOT: a full local-first data layer. Reads are not
 * cached and there is no conflict resolution, because Managiha is a back office,
 * not a point of sale, and the product rule is that we do not build a caisse.
 * See docs/OFFLINE.md for the boundary and its consequences.
 */

const DB_NAME = "managiha-offline";
const DB_VERSION = 1;
const STORE = "pending-writes";

/**
 * Queueable write kinds.
 *
 * `checkout_sale` is deliberately absent, and the omission is the design. A sale
 * shows its receipt the moment the call succeeds, so a queued sale would display a
 * receipt for something that had not happened. Worse, `checkout_sale` validates
 * stock server-side, so a queued sale could be rejected hours later when the shelf
 * is empty — after the customer had walked out with the goods.
 *
 * Receipts and credit-book entries are different: they are back-office records
 * where a delay is harmless and losing the entry is not. Those queue.
 *
 * Leaving this as a convention would mean someone could add a third case later
 * without thinking about it. Excluding it from the type makes the wrong thing
 * impossible to express.
 */
export type QueuedKind = "adjust_stock" | "record_carnet_transaction";

export interface QueuedWrite<T = unknown> {
  /** The idempotency key. Replaying with this is safe. */
  opId: string;
  kind: QueuedKind;
  payload: T;
  queuedAt: string;
  attempts: number;
  lastError: string | null;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "opId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = fn(tx.objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
    });
  } finally {
    db.close();
  }
}

/**
 * Whether the queue can be used at all.
 *
 * IndexedDB is unavailable in some private-browsing modes. Callers must check
 * this rather than assume, because a queue that silently drops work is worse than
 * an honest "offline writes are not available here".
 */
export async function isQueueAvailable(): Promise<boolean> {
  try {
    await openDb();
    return true;
  } catch {
    return false;
  }
}

export async function enqueue<T>(item: Omit<QueuedWrite<T>, "queuedAt" | "attempts" | "lastError">) {
  const record: QueuedWrite<T> = {
    ...item,
    queuedAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
  };
  await withStore("readwrite", (store) => store.put(record));
  return record;
}

/** Oldest first: a delivery and its correction must replay in the order they happened. */
export async function listPending(): Promise<QueuedWrite[]> {
  const all = await withStore<QueuedWrite[]>("readonly", (store) => store.getAll());
  return all.sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
}

export async function removePending(opId: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(opId));
}

export async function markFailed(opId: string, error: string): Promise<void> {
  const existing = await withStore<QueuedWrite | undefined>("readonly", (store) =>
    store.get(opId)
  );
  if (!existing) return;
  await withStore("readwrite", (store) =>
    store.put({ ...existing, attempts: existing.attempts + 1, lastError: error })
  );
}

export async function countPending(): Promise<number> {
  return withStore<number>("readonly", (store) => store.count());
}

export async function clearPending(): Promise<void> {
  await withStore("readwrite", (store) => store.clear());
}
