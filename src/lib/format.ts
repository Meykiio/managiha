import { getLocale, t } from "../i18n";

function currency(): string {
  return t("currency.dzd");
}

function fmtNumber(value: number, options: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(getLocale(), options).format(value);
}

export function fmtMoney(value: number | null | undefined, decimals = 2): string {
  const n = Number(value ?? 0);
  const formatted = fmtNumber(n, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${formatted} ${currency()}`;
}

export function fmtMoneyShort(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  const decimals = Number.isInteger(n) ? 0 : 2;
  return fmtMoney(n, decimals);
}

export function signedAmount(value: number): string {
  const n = Number(value ?? 0);
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  const formatted = fmtNumber(Math.abs(n), {
    minimumFractionDigits: Math.abs(n % 1) > 0 ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `${sign}${formatted} ${currency()}`;
}

export function signedQty(value: number): string {
  const n = Number(value ?? 0);
  const sign = n > 0 ? "+" : "";
  const formatted = fmtNumber(n, { maximumFractionDigits: 3 });
  return `${sign}${formatted}`;
}

export function fmtQty(value: number): string {
  const n = Number(value ?? 0);
  return fmtNumber(n, { maximumFractionDigits: 3 });
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(getLocale(), { dateStyle: "short" }).format(d);
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(getLocale(), {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function normalizePhoneForWa(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `213${digits.slice(1)}`;
  return digits;
}

export function waLink(phone: string | null | undefined, message: string): string | null {
  const normalized = normalizePhoneForWa(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
