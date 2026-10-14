import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getLanguage, setLanguage, subscribeLanguage, t } from "../index";
import { LocaleProvider } from "../LocaleProvider";
import { unitLabel, unitShort, movementLabel, transactionLabel } from "../../lib/constants";
import { ProductFormFields, emptyProductForm } from "../../components/products/ProductFormFields";

vi.mock("../../lib/supabaseClient", async () => {
  const { createFakeSupabase } = await import("../../test/fakeSupabase");
  const fake = createFakeSupabase();
  return { supabase: fake.supabase, isSupabaseConfigured: true };
});

vi.mock("../../lib/api", async (orig) => {
  const actual = await orig<typeof import("../../lib/api")>();
  return { ...actual, fetchSuppliers: async () => [] };
});

/**
 * Reset here rather than in afterEach: the global cleanup hook is registered by
 * the setup file before this one, so an afterEach reset would fire setLanguage
 * while the previous test's LocaleProvider is still mounted.
 */
beforeEach(() => {
  act(() => setLanguage("fr"));
});

/**
 * The dictionary tests prove the strings exist. These prove they reach the DOM,
 * which is where the data-layer migration can still go wrong: a label carried on
 * a data structure can be translated and still render in the source language if
 * a call site reads `.label` instead of calling `t()`.
 */
describe("data-layer labels render in the active locale", () => {
  it("unit names follow the language", () => {
    setLanguage("fr");
    expect(unitLabel("box")).toBe("Boîte");
    expect(unitShort("box")).toBe("boîte");

    setLanguage("en");
    expect(unitLabel("box")).toBe("Box");
    expect(unitShort("box")).toBe("box");

    setLanguage("ar");
    expect(unitLabel("box")).toBe("علبة");
    expect(unitShort("box")).toBe("علبة");
  });

  it("unit symbols are identical across locales", () => {
    const symbols = ["kg", "g", "liter"];
    const seen = new Map<string, Set<string>>();
    for (const code of ["fr", "en", "ar"]) {
      setLanguage(code);
      seen.set(code, new Set(symbols.map((u) => unitShort(u))));
    }
    expect([...seen.get("fr")!]).toEqual([...seen.get("en")!]);
    expect([...seen.get("fr")!]).toEqual([...seen.get("ar")!]);
  });

  it("movement and transaction types follow the language", () => {
    setLanguage("fr");
    expect(movementLabel("theft")).toBe("Vol");
    expect(transactionLabel("payment")).toBe("Paiement");

    setLanguage("en");
    expect(movementLabel("theft")).toBe("Theft");
    expect(transactionLabel("payment")).toBe("Payment");

    setLanguage("ar");
    expect(movementLabel("theft")).toBe("سرقة");
    expect(transactionLabel("payment")).toBe("تسديد");
  });

  it("an unknown value falls through unchanged rather than vanishing", () => {
    setLanguage("ar");
    expect(movementLabel("not_a_type")).toBe("not_a_type");
  });
});

describe("rendering under a locale switch", () => {
  async function renderForm() {
    const result = render(
      <LocaleProvider>
        <ProductFormFields
          storeId="store-1"
          values={emptyProductForm}
          onChange={() => {}}
          errors={{}}
        />
      </LocaleProvider>
    );
    // ProductFormFields and CategoryCombo both fetch on mount; let those settle
    // so their state updates land inside the test rather than after it.
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByLabelText(/unité|الوحدة/i)).toBeInTheDocument();
    return result;
  }

  it("renders the unit dropdown in French by default", async () => {
    await renderForm();
    const unitSelect = screen.getByLabelText(/unité/i) as HTMLSelectElement;
    const options = [...unitSelect.options].map((o) => o.textContent);
    expect(options).toContain("Pièce");
    expect(options).toContain("Boîte");
  });

  it("re-renders the unit dropdown in Arabic after a switch", async () => {
    const first = await renderForm();
    act(() => setLanguage("ar"));
    // LocaleProvider keys on the locale, so the old tree is gone and the new one
    // must be rendered the way the router would after a navigation.
    first.unmount();
    await renderForm();
    const unitSelect = screen.getByLabelText(/الوحدة/) as HTMLSelectElement;
    const options = [...unitSelect.options].map((o) => o.textContent);
    expect(options).toContain("قطعة");
    expect(options).toContain("علبة");
    expect(options).not.toContain("Pièce");
  });

  it("flips the document direction to rtl for Arabic", async () => {
    await renderForm();
    expect(document.documentElement.dir).toBe("ltr");
    await userEvent.click(document.body);
    act(() => setLanguage("ar"));
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("ar");
  });
});

describe("checkout shortage message", () => {
  it("is localised and keeps its numbers", () => {
    setLanguage("fr");
    expect(
      t("scanner.payment.stockShortage", { name: "Lait", current: 2, needed: 5 })
    ).toBe("Lait : 2 en stock, 5 demandé(s)");

    setLanguage("en");
    expect(
      t("scanner.payment.stockShortage", { name: "Milk", current: 2, needed: 5 })
    ).toBe("Milk: 2 in stock, 5 requested");

    setLanguage("ar");
    const arabic = t("scanner.payment.stockShortage", {
      name: "حليب",
      current: 2,
      needed: 5,
    });
    expect(arabic).toContain("حليب");
    expect(arabic).toContain("2");
    expect(arabic).toContain("5");
  });
});

describe("locale switch callback", () => {
  it("notifies subscribers and persists the choice", () => {
    const seen: string[] = [];
    const stop = subscribeLanguage((code) => seen.push(code));
    setLanguage("en");
    stop();
    setLanguage("ar");
    expect(seen).toEqual(["en"]);
    expect(getLanguage()).toBe("ar");
  });
});