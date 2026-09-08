import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SellStockForm } from "../SellStockForm";

const h = vi.hoisted(() => ({
  fake: undefined as any,
  showToast: undefined as any,
}));

vi.mock("../../../lib/supabaseClient", async () => {
  const { createFakeSupabase } = await import("../../../test/fakeSupabase");
  h.fake = createFakeSupabase();
  return { supabase: h.fake.supabase, isSupabaseConfigured: true };
});

vi.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({
    store: { id: "store-1", name: "Magasin Test" },
    profile: null,
    user: { id: "u1", email: "t@t.t" },
    loading: false,
    storeMissing: false,
    userDataError: null,
    refreshStore: async () => {},
    refreshProfile: async () => {},
    signIn: async () => {},
    signUp: async () => ({ needsConfirmation: false }),
    signOut: async () => {},
    resetPassword: async () => {},
    updatePassword: async () => {},
  }),
}));

vi.mock("../../../contexts/ToastContext", () => ({
  useToast: () => ({ showToast: h.showToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const PRODUCTS = {
  data: [
    { id: "p1", name: "Coca 1L", unit: "piece", current_stock: 10, stock_status: "healthy" },
  ],
  error: null,
};

describe("SellStockForm", () => {
  beforeEach(() => {
    h.fake.reset();
    h.showToast = vi.fn();
    h.fake.setFromResult("products_overview", PRODUCTS);
  });

  it("records a sale through adjust_stock with a positive quantity", async () => {
    render(<SellStockForm />);

    await userEvent.click(
      screen.getByRole("button", { name: /produit/i })
    );
    await screen.findByText("Coca 1L");
    await userEvent.click(screen.getByText("Coca 1L"));
    await userEvent.type(screen.getByLabelText(/quantité vendue/i), "3");
    await userEvent.click(screen.getByRole("button", { name: /enregistrer la vente/i }));

    await waitFor(() => expect(h.fake.rpcCalls).toHaveLength(1));
    expect(h.fake.rpcCalls[0].fn).toBe("adjust_stock");
    expect(h.fake.rpcCalls[0].args).toMatchObject({
      p_product_id: "p1",
      p_movement_type: "sale",
      p_quantity: 3,
    });
    expect(h.showToast).toHaveBeenCalled();

    const stockWrites = h.fake.fromCalls.filter(
      (c: any) => c.table === "products" && (c.op === "update" || c.op === "insert")
    );
    expect(stockWrites).toHaveLength(0);
  });

  it("blocks submission without a product and without a quantity", async () => {
    render(<SellStockForm />);
    await userEvent.click(screen.getByRole("button", { name: /enregistrer la vente/i }));
    expect(h.fake.rpcCalls).toHaveLength(0);
  });
});
