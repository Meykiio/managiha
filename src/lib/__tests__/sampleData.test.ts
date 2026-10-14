import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadSampleData } from "../sampleData";
import type { Store } from "../types";

const h = vi.hoisted(() => ({ fake: undefined as any }));

vi.mock("../supabaseClient", async () => {
  const { createFakeSupabase } = await import("../../test/fakeSupabase");
  h.fake = createFakeSupabase();
  return { supabase: h.fake.supabase, isSupabaseConfigured: true };
});

const store = { id: "store-1", name: "Magasin Test" } as Store;

describe("loadSampleData", () => {
  beforeEach(() => {
    h.fake.reset();
    h.fake.setFromResult("categories", { data: { id: "cat-1" }, error: null });
    h.fake.setFromResult("products", { data: { id: "prod-1" }, error: null });
    h.fake.setFromResult("carnet_customers", { data: { id: "cust-1" }, error: null });
  });

  it("creates products, records opening balances via RPC, and seeds carnet via RPC", async () => {
    await loadSampleData(store);

    const productCreates = h.fake.fromCalls.filter(
      (c: any) => c.table === "products" && c.op === "insert"
    );
    expect(productCreates).toHaveLength(5);

    const openingBalances = h.fake.rpcCalls.filter(
      (r: any) => r.fn === "adjust_stock" && r.args.p_movement_type === "opening_balance"
    );
    expect(openingBalances).toHaveLength(5);

    const carnetTx = h.fake.rpcCalls.filter((r: any) => r.fn === "record_carnet_transaction");
    expect(carnetTx).toHaveLength(2);
    expect(carnetTx[0].args).toMatchObject({ p_type: "credit", p_amount: 2500 });
    expect(carnetTx[1].args).toMatchObject({ p_type: "payment", p_amount: 1000 });

    const directStockWrites = h.fake.fromCalls.filter(
      (c: any) => c.table === "products" && c.op === "update"
    );
    expect(directStockWrites).toHaveLength(0);
  });
});
