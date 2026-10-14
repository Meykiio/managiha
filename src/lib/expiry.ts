import type { BadgeTone } from "../components/ui/Badge";

export const EXPIRY_SOON_DAYS = 30;

export function expiryStatus(date: string | null | undefined): {
  days: number | null;
  tone: BadgeTone | null;
} {
  if (!date) return { days: null, tone: null };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${date}T00:00:00`);
  const days = Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return { days, tone: "danger" };
  if (days <= EXPIRY_SOON_DAYS) return { days, tone: "warning" };
  return { days, tone: null };
}