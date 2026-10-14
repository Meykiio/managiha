import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  fake: undefined as any,
}));

vi.mock("../supabaseClient", async () => {
  const { createFakeSupabase } = await import("../../test/fakeSupabase");
  h.fake = createFakeSupabase();
  return { supabase: h.fake.supabase, isSupabaseConfigured: true };
});

import {
  callAdjustStock,
  callCheckoutSale,
  callRecordCarnetTransaction,
} from "../api";
import { newOperationId } from "../ids";

describe("write RPC contract", () => {
  beforeEach(() => {
    h.fake.reset();
  });

  describe("callCheckoutSale", () => {
    it("never sends a price: the server owns pricing", async () => {
      await callCheckoutSale(
        [{ product_id: "p1", quantity: 2 }],
        "cash",
        "op-123",
        undefined,
        500
      );

      const call = h.fake.rpcCalls[0];
      expect(call.fn).toBe("checkout_sale");
      expect(call.args.p_items).toEqual([{ product_id: "p1", quantity: 2 }]);

      // The exploitable shape: a tampered client must not be able to choose
      // what a product costs, so no price key may ever leave the browser.
      const keys = Object.keys((call.args.p_items as object[])[0]);
      expect(keys).not.toContain("unit_price");
      expect(JSON.stringify(call.args)).not.toMatch(/unit_price/);
    });

    it("always sends p_client_op_id so a retry cannot sell twice", async () => {
      await callCheckoutSale(
        [{ product_id: "p1", quantity: 1 }],
        "credit",
        "op-abc",
        "c1",
        undefined,
        "note"
      );

      expect(h.fake.rpcCalls[0].args.p_client_op_id).toBe("op-abc");
      expect(h.fake.rpcCalls[0].args.p_payment_mode).toBe("credit");
      expect(h.fake.rpcCalls[0].args.p_customer_id).toBe("c1");
    });
  });

  describe("callAdjustStock", () => {
    it("forwards a client op id when one is supplied", async () => {
      await callAdjustStock({
        productId: "p1",
        movementType: "receive",
        quantity: 5,
        clientOpId: "op-1",
      });
      expect(h.fake.rpcCalls[0].args.p_client_op_id).toBe("op-1");
    });

    it("passes null rather than omitting the key when no op id is given", async () => {
      await callAdjustStock({
        productId: "p1",
        movementType: "receive",
        quantity: 5,
      });
      expect(h.fake.rpcCalls[0].args).toHaveProperty("p_client_op_id", null);
    });
  });

  describe("callRecordCarnetTransaction", () => {
    it("forwards a client op id so a retry cannot charge twice", async () => {
      await callRecordCarnetTransaction({
        customerId: "c1",
        type: "credit",
        amount: 1500,
        clientOpId: "op-2",
      });
      expect(h.fake.rpcCalls[0].fn).toBe("record_carnet_transaction");
      expect(h.fake.rpcCalls[0].args.p_client_op_id).toBe("op-2");
    });
  });
});

describe("newOperationId", () => {
  const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  it("returns a valid v4 UUID", () => {
    expect(newOperationId()).toMatch(V4);
  });

  it("does not repeat across calls", () => {
    const ids = new Set(Array.from({ length: 500 }, () => newOperationId()));
    expect(ids.size).toBe(500);
  });

  it("still produces a v4 UUID when randomUUID is unavailable (plain http)", () => {
    const original = globalThis.crypto;
    // A self-hoster on a LAN address has no crypto.randomUUID.
    Object.defineProperty(globalThis, "crypto", {
      value: { getRandomValues: original.getRandomValues.bind(original) },
      configurable: true,
    });
    try {
      expect(newOperationId()).toMatch(V4);
    } finally {
      Object.defineProperty(globalThis, "crypto", {
        value: original,
        configurable: true,
      });
    }
  });
});