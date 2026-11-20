/** Money is kept in cents. Pure. */

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const formatMoney = (cents: number) => brl.format(cents / 100);

/** "R$ 1.234,56", "49,9", "49.90" or "50" become cents; null when it is not a valid non-negative amount. */
export function parseMoney(text: string): number | null {
  const t = text.replace(/[R$\s]/g, "");
  if (!t) return null;
  // Brazilian: dots are thousands, comma is the decimal; also accept 49.90.
  const normalized = /,/.test(t)
    ? t.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(\.\d{3})+$/.test(t)
      ? t.replace(/\./g, "")
      : t;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(cents) && cents <= 100_000_000 ? cents : null;
}

/** Cents as an editable string: 4990 -> "49,90". */
export const centsToInput = (cents: number) =>
  (cents / 100).toFixed(2).replace(".", ",");
