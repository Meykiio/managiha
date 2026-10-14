import { describe, expect, it } from "vitest";
import { buildCsv } from "../csv";

describe("buildCsv", () => {
  it("starts with a UTF-8 BOM for Excel accent support", () => {
    expect(buildCsv(["a"], [["b"]]).charCodeAt(0)).toBe(0xfeff);
  });

  it("joins cells with semicolons and rows with CRLF (French Excel)", () => {
    const csv = buildCsv(["Nom", "Solde"], [["Ahmed", 1500], ["Sara", 200]]);
    expect(csv).toBe("\ufeffNom;Solde\r\nAhmed;1500\r\nSara;200");
  });

  it("quotes values containing the separator", () => {
    const csv = buildCsv(["Note"], [["crédit; à confirmer"]]);
    expect(csv).toBe('\ufeffNote\r\n"crédit; à confirmer"');
  });

  it("escapes double quotes inside quoted values", () => {
    const csv = buildCsv(["Note"], [['un "special" cas']]);
    expect(csv).toBe('\ufeffNote\r\n"un ""special"" cas"');
  });

  it("quotes values containing newlines", () => {
    const csv = buildCsv(["Note"], [["ligne1\nligne2"]]);
    expect(csv).toBe('\ufeffNote\r\n"ligne1\nligne2"');
  });

  it("renders null and undefined as empty cells", () => {
    const csv = buildCsv(["A", "B"], [[null, undefined]]);
    expect(csv).toBe("\ufeffA;B\r\n;");
  });

  it("keeps accents intact", () => {
    const csv = buildCsv(["Catégorie"], [["Épicerie"]]);
    expect(csv).toContain("Catégorie;Épicerie".replace(";", ";").split(";")[0]);
    expect(csv).toContain("Épicerie");
  });
});
