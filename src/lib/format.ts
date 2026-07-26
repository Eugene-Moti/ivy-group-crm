import { format, formatDistanceToNow } from "date-fns";

export function formatKES(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return `KES ${Math.round(amount).toLocaleString("en-US")}`;
}

export function formatBudgetRange(
  min: number | null | undefined,
  max: number | null | undefined
): string {
  if (min == null && max == null) return "—";
  if (min != null && max != null) {
    if (min === max) return formatKES(min);
    return `${formatKES(min)} – ${formatKES(max)}`;
  }
  return formatKES(min ?? max);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return format(new Date(value), "d MMM yyyy");
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return format(new Date(value), "d MMM yyyy, HH:mm");
}

export function formatRelative(value: string | null | undefined): string {
  if (!value) return "—";
  return formatDistanceToNow(new Date(value), { addSuffix: true });
}

export function fullName(person: {
  first_name?: string | null;
  last_name?: string | null;
}): string {
  return [person.first_name, person.last_name].filter(Boolean).join(" ");
}

/** Formats a Kenyan phone number for a wa.me link (expects "+254..." or "07...") */
export function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  if (phone.trim().startsWith("+")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  return digits;
}
