import { timingSafeEqual } from "node:crypto";

export type PaymentStatusKey =
  "PENDING" | "CONFIRMED" | "RECEIVED" | "OVERDUE" | "REFUNDED" | "CANCELED";

/** What an Asaas payment event means for a charge; null for events we do not track. */
export function statusFromEvent(event: string): PaymentStatusKey | null {
  switch (event) {
    case "PAYMENT_CREATED":
      return "PENDING";
    case "PAYMENT_CONFIRMED":
      return "CONFIRMED";
    case "PAYMENT_RECEIVED":
      return "RECEIVED";
    case "PAYMENT_OVERDUE":
      return "OVERDUE";
    case "PAYMENT_REFUNDED":
      return "REFUNDED";
    case "PAYMENT_DELETED":
      return "CANCELED";
    default:
      return null;
  }
}

export const isPaid = (s: PaymentStatusKey) =>
  s === "CONFIRMED" || s === "RECEIVED";

/** Constant-time comparison of the webhook token. */
export function tokenMatches(
  received: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!received || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** A plan paid for a due date is good until the same day of the next month. */
export function renewalAfter(due: Date): Date {
  const d = new Date(
    Date.UTC(due.getUTCFullYear(), due.getUTCMonth() + 1, due.getUTCDate()),
  );
  // 31 January + 1 month would roll into March: clamp to the last day of February.
  if (d.getUTCMonth() !== (due.getUTCMonth() + 1) % 12) d.setUTCDate(0);
  return d;
}

/** The organization status after a plan payment event. */
export function subscriptionAfter(
  current: "NONE" | "PENDING" | "ACTIVE" | "OVERDUE" | "CANCELED",
  status: PaymentStatusKey,
): "NONE" | "PENDING" | "ACTIVE" | "OVERDUE" | "CANCELED" {
  if (current === "CANCELED" || current === "NONE") return current;
  if (isPaid(status)) return "ACTIVE";
  if (status === "OVERDUE") return "OVERDUE";
  return current;
}
