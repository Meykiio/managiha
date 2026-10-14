# Offline behaviour (Phase 3)

## What is built

A **durable write queue** for two operations:

| Operation | Queued? | Why |
|---|---|---|
| `adjust_stock` (receive, damage, theft, count, correction) | **Yes** | Back-room work. A delay is harmless; losing the entry is not. |
| `record_carnet_transaction` (credit, payment) | **Yes** | Same. |
| `checkout_sale` | **No, deliberately** | See below. |

Queued work lives in IndexedDB, survives a reload or a closed tab, and replays
oldest-first when the connection returns. The banner shows how many entries are
waiting, because "offline" and "offline with 3 entries pending" call for different
behaviour from the shopkeeper.

## Why a queue is safe here

Every write RPC already takes a `p_client_op_id` and is idempotent server-side.
The queue stores that same id with the payload, so a request whose **response** was
lost — rather than the request itself — replays as a no-op instead of applying
twice.

This is the property that turns a retry queue from a liability into a feature. It
was built in Phase 1a for a different reason (double-tap protection) and it pays
for itself again here.

## Why sales are not queued

`checkout_sale` is excluded from `QueuedKind`, so the type system will not let
anyone add it by accident. Two reasons:

1. **A receipt implies completion.** The sale screen shows a receipt the moment
   the call succeeds. A queued sale would display a receipt for something that had
   not happened yet.
2. **The server validates stock at replay time.** A sale queued at 09:00 could be
   rejected at 14:00 when the shelf is empty — after the customer had walked out
   with the goods.

Both point the same way: a sale must either succeed now or fail loudly now. Offline
sales are what a *point of sale* has to solve, and this product is explicitly not
one.

## The boundary, stated plainly

This is **not** a local-first data layer.

| | Status |
|---|---|
| Queued writes | Built |
| Read caching (see data offline) | **Not built** |
| Conflict resolution | **Not built** — not needed: one owner per store |
| Background sync API | **Not built** |
| Optimistic UI | **Not built** for writes; the queued state is shown honestly instead |

Offline, the app shows the last data it fetched **if the page is still open**, and
nothing if you reload. A shopkeeper with no signal cannot browse their catalogue.

That is a real limitation and it is preferable to the alternative of pretending
otherwise. Closing it properly means a local-first read layer — TanStack DB +
Dexie with a server-authoritative sync protocol — which is a rewrite of the data
layer rather than a feature, and should be scheduled as such rather than bolted on.

## Failure behaviour

| Failure | What happens |
|---|---|
| Network unreachable | Entry queued, toast says so, banner shows the count |
| Server rejects the write | **Not queued.** The error surfaces immediately; retrying a validation error cannot succeed |
| Queued entry rejected later | Kept in the queue, surfaced in the banner with the reason, retry is manual |
| Queue replay hits a dead session | Replay is retried on `SIGNED_IN` and `TOKEN_REFRESHED`, so a 401 does not loop |
| IndexedDB blocked (private mode) | No queue. The write fails loudly rather than reporting a success that lost the work |

The rule throughout: **never report success for something that did not happen.** A
shopkeeper who believes a delivery is recorded when it is not will find out at the
worst possible moment — when the shelf is empty and the record says otherwise.

## Testing

`src/lib/offline/__tests__/submit.test.ts` covers the decision that makes the queue
safe: network-shaped failures queue, server rejections do not, and a browser
without a queue fails loudly instead of silently dropping the write.

Not covered by tests: actual IndexedDB behaviour and real offline transitions. Both
need a browser and a device; `e2e/` runs against a preview server and cannot take
the network away meaningfully. Worth a manual pass on a phone with aeroplane mode
before launch.
