import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdjustStockForm } from "../AdjustStockForm";

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

async function pickProduct() {
  await userEvent.click(
    screen.getByRole("button", { name: /produit/i })
  );
  await screen.findByText("Coca 1L");
  await userEvent.click(screen.getByText("Coca 1L"));
}

async function chooseReason(label: string) {
  await userEvent.selectOptions(screen.getByLabelText(/motif de l'ajustement/i), label);
}

describe("AdjustStockForm", () => {
  beforeEach(() => {
    h.fake.reset();
    h.showToast = vi.fn();
    h.fake.setFromResult("products_overview", PRODUCTS);
  });

  it("sends the absolute counted quantity to adjust_stock (server computes the delta under lock)", async () => {
    render(<AdjustStockForm />);

    await pickProduct();
    await chooseReason("count_adjustment");
    await userEvent.type(screen.getByLabelText(/nouvelle quantité constatée/i), "7");
    await userEvent.click(screen.getByRole("button", { name: /valider l'ajustement/i }));

    await waitFor(() => expect(h.fake.rpcCalls).toHaveLength(1));
    expect(h.fake.rpcCalls[0].fn).toBe("adjust_stock");
    expect(h.fake.rpcCalls[0].args).toMatchObject({
      p_product_id: "p1",
      p_movement_type: "count_adjustment",
      p_quantity: 7,
    });
    expect(h.showToast).toHaveBeenCalled();

    const stockWrites = h.fake.fromCalls.filter(
      (c: any) => c.table === "products" && (c.op === "update" || c.op === "insert")
    );
    expect(stockWrites).toHaveLength(0);
  });

  it("sends the signed correction delta as-is (negative allowed)", async () => {
    render(<AdjustStockForm />);

    await pickProduct();
    await chooseReason("correction");
    await userEvent.type(screen.getByLabelText(/correction/i), "-2");
    await userEvent.click(screen.getByRole("button", { name: /valider l'ajustement/i }));

    await waitFor(() => expect(h.fake.rpcCalls).toHaveLength(1));
    expect(h.fake.rpcCalls[0].args).toMatchObject({
      p_movement_type: "correction",
      p_quantity: -2,
    });
  });

  it("sends a positive removal quantity for damage (never computes final stock)", async () => {
    render(<AdjustStockForm />);

    await pickProduct();
    await chooseReason("damage");
    await userEvent.type(screen.getByLabelText(/quantité à retirer/i), "2");
    await userEvent.click(screen.getByRole("button", { name: /valider l'ajustement/i }));

    await waitFor(() => expect(h.fake.rpcCalls).toHaveLength(1));
    expect(h.fake.rpcCalls[0].args).toMatchObject({
      p_movement_type: "damage",
      p_quantity: 2,
    });
  });

  it("sends theft removals with the theft movement type", async () => {
    render(<AdjustStockForm />);

    await pickProduct();
    await chooseReason("theft");
    await userEvent.type(screen.getByLabelText(/quantité à retirer/i), "1");
    await userEvent.click(screen.getByRole("button", { name: /valider l'ajustement/i }));

    await waitFor(() => expect(h.fake.rpcCalls).toHaveLength(1));
    expect(h.fake.rpcCalls[0].args).toMatchObject({
      p_movement_type: "theft",
      p_quantity: 1,
    });
  });

  it("blocks submission until a reason is chosen", async () => {
    render(<AdjustStockForm />);
    await pickProduct();
    await userEvent.click(screen.getByRole("button", { name: /valider l'ajustement/i }));
    expect(h.fake.rpcCalls).toHaveLength(0);
    expect(screen.getByLabelText(/motif de l'ajustement/i)).toBeInvalid();
  });
});
