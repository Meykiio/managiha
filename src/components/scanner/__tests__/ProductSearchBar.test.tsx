import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductSearchBar } from "../ProductSearchBar";

const h = vi.hoisted(() => ({
  searchProducts: vi.fn(),
}));

vi.mock("../../../lib/api", async (orig) => {
  const actual = await orig<typeof import("../../../lib/api")>();
  return { ...actual, searchProducts: h.searchProducts };
});

vi.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({ store: { id: "store-1" } }),
}));

const COCA = {
  id: "p1",
  name: "Coca 1L",
  unit: "piece",
  sell_price: 120,
  current_stock: 10,
};

function renderBar() {
  const onPick = vi.fn();
  const onCreate = vi.fn();
  render(<ProductSearchBar onPick={onPick} onCreate={onCreate} />);
  return { onPick, onCreate };
}

async function typeInSearch(text: string) {
  await userEvent.type(screen.getByPlaceholderText(/nom du produit ou code-barres/i), text);
}

describe("ProductSearchBar", () => {
  beforeEach(() => {
    h.searchProducts.mockReset();
    h.searchProducts.mockResolvedValue([COCA]);
  });

  it("stays quiet until two characters, rather than listing the whole shelf", async () => {
    renderBar();
    await typeInSearch("c");
    // One letter matches most of the shelf, so the query is not worth making.
    expect(h.searchProducts).not.toHaveBeenCalled();
    expect(screen.getByText(/continuez à taper/i)).toBeInTheDocument();
  });

  it("searches names, so a product with no barcode can still be sold", async () => {
    renderBar();
    await typeInSearch("coca");
    await waitFor(() => expect(h.searchProducts).toHaveBeenCalled());
    expect(h.searchProducts.mock.calls[0][1]).toBe("coca");
    expect(await screen.findByText("Coca 1L")).toBeInTheDocument();
  });

  it("adds the product that was tapped", async () => {
    const { onPick } = renderBar();
    await typeInSearch("coca");
    await userEvent.click(await screen.findByText("Coca 1L"));
    expect(onPick).toHaveBeenCalledWith(COCA);
  });

  it("picks the first match on Enter once results have arrived", async () => {
    const { onPick } = renderBar();
    await typeInSearch("coca");
    await screen.findByText("Coca 1L");
    await userEvent.type(
      screen.getByPlaceholderText(/nom du produit ou code-barres/i),
      "{Enter}"
    );
    await waitFor(() => expect(onPick).toHaveBeenCalledWith(COCA));
  });

  it("does not offer to create while a search is still in flight", async () => {
    // Enter pressed faster than the query returns must not offer a duplicate of
    // a product that exists; it should simply do nothing yet.
    let resolveSearch: (rows: unknown[]) => void = () => {};
    h.searchProducts.mockReturnValue(
      new Promise((resolve) => {
        resolveSearch = resolve;
      })
    );
    const { onCreate } = renderBar();
    await typeInSearch("coca{Enter}");
    expect(onCreate).not.toHaveBeenCalled();
    resolveSearch([]);
  });

  it("offers to create the product when nothing matches, carrying the typed name", async () => {
    h.searchProducts.mockResolvedValue([]);
    const { onCreate } = renderBar();
    await typeInSearch("chapati");
    const create = await screen.findByRole("button", { name: /chapati/i });
    await userEvent.click(create);
    expect(onCreate).toHaveBeenCalledWith("chapati");
  });

  it("clears the query after a pick so the next item starts clean", async () => {
    renderBar();
    await typeInSearch("coca");
    await userEvent.click(await screen.findByText("Coca 1L"));
    const input = screen.getByPlaceholderText(/nom du produit ou code-barres/i) as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("survives a failed search without breaking the counter", async () => {
    h.searchProducts.mockRejectedValue(new Error("réseau"));
    renderBar();
    await typeInSearch("coca");
    await waitFor(() => expect(h.searchProducts).toHaveBeenCalled());
    // No results, and no crash: the create affordance is still offered.
    expect(await screen.findByRole("button", { name: /créer/i })).toBeInTheDocument();
  });
});
