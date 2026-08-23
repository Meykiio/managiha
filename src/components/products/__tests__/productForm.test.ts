import { describe, expect, it } from "vitest";
import { productFormErrors, emptyProductForm } from "../ProductFormFields";

const valid = {
  ...emptyProductForm,
  name: "Lait 1L",
  costPrice: "120",
  sellPrice: "150",
};

describe("productFormErrors", () => {
  it("accepts a complete valid form", () => {
    expect(productFormErrors(valid)).toEqual({});
  });

  it("requires a product name", () => {
    const errors = productFormErrors({ ...valid, name: "   " });
    expect(errors.name).toBeTruthy();
  });

  it("rejects a negative cost price", () => {
    const errors = productFormErrors({ ...valid, costPrice: "-5" });
    expect(errors.costPrice).toBeTruthy();
  });

  it("rejects a non-numeric sell price", () => {
    const errors = productFormErrors({ ...valid, sellPrice: "abc" });
    expect(errors.sellPrice).toBeTruthy();
  });

  it("allows empty prices (defaults to 0 at submit)", () => {
    const errors = productFormErrors({ ...valid, costPrice: "", sellPrice: "" });
    expect(errors.costPrice).toBeUndefined();
    expect(errors.sellPrice).toBeUndefined();
  });

  it("does not require optional fields (barcode, sku, threshold, expiry, supplier)", () => {
    const errors = productFormErrors(valid);
    expect(errors.barcode).toBeUndefined();
    expect(errors.sku).toBeUndefined();
    expect(errors.threshold).toBeUndefined();
    expect(errors.expiryDate).toBeUndefined();
    expect(errors.supplierId).toBeUndefined();
  });
});
