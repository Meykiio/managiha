import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CarnetEntryForm } from "../CarnetEntryForm";

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

async function pickCustomer(name: string) {
  await userEvent.click(screen.getByRole("button", { name: /rechercher un client/i }));
  await screen.findByText(name);
  await userEvent.click(screen.getByText(name));
}

describe("CarnetEntryForm", () => {
  beforeEach(() => {
    h.fake.reset();
    h.showToast = vi.fn();
  });

  it("records a credit through the record_carnet_transaction RPC — never a direct balance write", async () => {
    h.fake.setFromResult("carnet_customers", {
      data: [{ id: "cust-1", full_name: "Ahmed", balance: 0 }],
      error: null,
    });
    render(<CarnetEntryForm />);

    await pickCustomer("Ahmed");
    await userEvent.type(screen.getByLabelText("Montant"), "150");
    await userEvent.click(screen.getByRole("button", { name: /enregistrer l'entrée/i }));

    await waitFor(() => expect(h.fake.rpcCalls).toHaveLength(1));
    expect(h.fake.rpcCalls[0].fn).toBe("record_carnet_transaction");
    expect(h.fake.rpcCalls[0].args).toMatchObject({
      p_customer_id: "cust-1",
      p_type: "credit",
      p_amount: 150,
    });
    expect(h.showToast).toHaveBeenCalled();

    const balanceWrites = h.fake.fromCalls.filter(
      (c: any) => c.table === "carnet_customers" && (c.op === "update" || c.op === "delete")
    );
    expect(balanceWrites).toHaveLength(0);
  });

  it("records a payment with the payment type", async () => {
    render(<CarnetEntryForm presetCustomerId="cust-1" presetType="payment" />);

    await userEvent.type(screen.getByLabelText("Montant"), "200");
    await userEvent.click(screen.getByRole("button", { name: /enregistrer l'entrée/i }));

    await waitFor(() => expect(h.fake.rpcCalls).toHaveLength(1));
    expect(h.fake.rpcCalls[0].args).toMatchObject({
      p_customer_id: "cust-1",
      p_type: "payment",
      p_amount: 200,
    });
  });

  it("creates a new customer first, then records the entry against it", async () => {
    h.fake.setFromResult("carnet_customers", { data: { id: "cust-9" }, error: null });
    render(<CarnetEntryForm />);

    await userEvent.click(screen.getByRole("button", { name: /\+ nouveau client/i }));
    await userEvent.type(screen.getByPlaceholderText("Nom du client"), "Karim Benali");
    await userEvent.type(screen.getByPlaceholderText("Téléphone"), "0550112233");
    await userEvent.type(screen.getByLabelText("Montant"), "80");
    await userEvent.click(screen.getByRole("button", { name: /enregistrer l'entrée/i }));

    await waitFor(() => expect(h.fake.rpcCalls).toHaveLength(1));

    const inserts = h.fake.fromCalls.filter((c: any) => c.op === "insert");
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({
      table: "carnet_customers",
      payload: { store_id: "store-1", full_name: "Karim Benali", phone: "0550112233" },
    });
    expect(h.fake.rpcCalls[0].args).toMatchObject({
      p_customer_id: "cust-9",
      p_type: "credit",
      p_amount: 80,
    });
  });

  it("rejects a zero or empty amount without calling the RPC", async () => {
    render(<CarnetEntryForm presetCustomerId="cust-1" />);
    await userEvent.click(screen.getByRole("button", { name: /enregistrer l'entrée/i }));
    expect(h.fake.rpcCalls).toHaveLength(0);
    expect(screen.getByLabelText("Montant")).toBeInvalid();
  });

  it("parses decimal amounts (dot as decimal separator, like browser number inputs)", async () => {
    render(<CarnetEntryForm presetCustomerId="cust-1" />);
    await userEvent.type(screen.getByLabelText("Montant"), "75.50");
    await userEvent.click(screen.getByRole("button", { name: /enregistrer l'entrée/i }));
    await waitFor(() => expect(h.fake.rpcCalls).toHaveLength(1));
    expect(h.fake.rpcCalls[0].args.p_amount).toBeCloseTo(75.5);
  });
});
