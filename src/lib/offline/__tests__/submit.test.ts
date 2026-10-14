import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  enqueue: vi.fn(),
  available: true,
}));

vi.mock("../queue", () => ({
  enqueue: h.enqueue,
  isQueueAvailable: async () => h.available,
}));

import { submitOrQueue } from "../submit";

/**
 * These cover the decision that makes the queue safe rather than dangerous:
 * distinguishing "the request never arrived" from "the server refused it".
 * Queueing the second kind would store something already known to be invalid and
 * replay it forever.
 */
describe("submitOrQueue", () => {
  beforeEach(() => {
    h.enqueue.mockReset();
    h.available = true;
  });

  it("returns saved when the write succeeds", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    await expect(submitOrQueue("adjust_stock", "op-1", { a: 1 }, send)).resolves.toBe("saved");
    expect(h.enqueue).not.toHaveBeenCalled();
  });

  it("queues when the network is unreachable", async () => {
    const send = vi.fn().mockRejectedValue(new Error("Failed to fetch"));
    await expect(submitOrQueue("adjust_stock", "op-2", { a: 1 }, send)).resolves.toBe("queued");
    expect(h.enqueue).toHaveBeenCalledWith({
      opId: "op-2",
      kind: "adjust_stock",
      payload: { a: 1 },
    });
  });

  it.each([
    "Failed to fetch",
    "NetworkError when attempting to fetch resource.",
    "Network request failed",
    "Load failed",
    "timeout",
  ])("treats %s as a network failure", async (message) => {
    const send = vi.fn().mockRejectedValue(new Error(message));
    await expect(submitOrQueue("adjust_stock", "op-3", {}, send)).resolves.toBe("queued");
    expect(h.enqueue).toHaveBeenCalledTimes(1);
  });

  it("rethrows a server rejection instead of queueing it", async () => {
    // A real Postgres rejection. Retrying cannot fix it, and storing it would
    // mean replaying a write the server has already considered and refused.
    const send = vi.fn().mockRejectedValue(new Error("Stock insuffisant"));
    await expect(submitOrQueue("adjust_stock", "op-4", {}, send)).rejects.toThrow(
      "Stock insuffisant"
    );
    expect(h.enqueue).not.toHaveBeenCalled();
  });

  it("rethrows a validation rejection", async () => {
    const send = vi.fn().mockRejectedValue(new Error("La quantité doit être supérieure à 0"));
    await expect(submitOrQueue("adjust_stock", "op-5", {}, send)).rejects.toThrow();
    expect(h.enqueue).not.toHaveBeenCalled();
  });

  it("rethrows when the browser has no queue to put the write in", async () => {
    h.available = false;
    const send = vi.fn().mockRejectedValue(new Error("Failed to fetch"));
    // Private browsing. Reporting success would silently lose the work, so the
    // honest outcome is an error.
    await expect(submitOrQueue("adjust_stock", "op-6", {}, send)).rejects.toThrow(
      "Failed to fetch"
    );
    expect(h.enqueue).not.toHaveBeenCalled();
  });

  it("keeps the opId the caller supplied, so replay is idempotent", async () => {
    const send = vi.fn().mockRejectedValue(new Error("Failed to fetch"));
    await submitOrQueue("record_carnet_transaction", "stable-op-id", { x: 1 }, send);
    expect(h.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ opId: "stable-op-id" })
    );
  });
});
