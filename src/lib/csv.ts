type CsvValue = string | number | boolean | null | undefined;

// Neutralize CSV formula injection: prefix dangerous leading chars with '
const FORMULA_CHARS = /^[=+\-@\t\r]/;

export function buildCsv(headers: string[], rows: CsvValue[][]): string {
  const esc = (v: CsvValue): string => {
    const s = v == null ? "" : String(v);
    const safe = FORMULA_CHARS.test(s) ? `'${s}` : s;
    return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const lines = [headers, ...rows].map((row) => row.map(esc).join(";"));
  return "\ufeff" + lines.join("\r\n");
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: CsvValue[][]
): void {
  const content = buildCsv(headers, rows);
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function firstDayOfMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export function endOfDayIso(dateIso: string): string {
  return `${dateIso}T23:59:59`;
}

export function startOfDayIso(dateIso: string): string {
  return `${dateIso}T00:00:00`;
}
