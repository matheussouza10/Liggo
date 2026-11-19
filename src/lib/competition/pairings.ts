/** Who plays whom in a knockout stage. Pure and client-safe. */

export type Origin = {
  originGroup: number | null;
  originRank: number | null;
  originMatch: number | null;
};

const letter = (n: number) => String.fromCharCode(64 + n);

/** "1º do Grupo A", "2º colocado", "Vencedor do jogo 3 (Quartas de final)"; null when unknown. */
export function originLabel(
  o: Origin,
  previousStageName?: string | null,
): string | null {
  if (o.originMatch != null) {
    return `Vencedor do jogo ${o.originMatch}${previousStageName ? ` (${previousStageName})` : ""}`;
  }
  if (o.originRank != null && o.originGroup != null)
    return `${o.originRank}º do Grupo ${letter(o.originGroup)}`;
  if (o.originRank != null) return `${o.originRank}º colocado`;
  return null;
}

/**
 * The matchups are the consecutive pairs of `order` (slot 0 plays slot 1,
 * slot 2 plays slot 3...). Choosing a participant for a slot puts them
 * there and sends whoever was there to the place they left, so nobody is
 * ever left out or repeated.
 */
export function assignSlot(
  order: readonly string[],
  slot: number,
  entryId: string,
): string[] {
  const out = [...order];
  const from = out.indexOf(entryId);
  if (slot < 0 || slot >= out.length || from === -1 || from === slot)
    return out;
  [out[slot], out[from]] = [out[from], out[slot]];
  return out;
}

export function pairsOf(order: readonly string[]): [string, string][] {
  const pairs: [string, string][] = [];
  for (let i = 0; i + 1 < order.length; i += 2)
    pairs.push([order[i], order[i + 1]]);
  return pairs;
}

/** True when `order` holds exactly the given ids, once each, in an even count. */
export function isValidOrder(
  order: readonly string[],
  ids: readonly string[],
): boolean {
  if (order.length !== ids.length || order.length < 2 || order.length % 2 !== 0)
    return false;
  const want = new Set(ids);
  const got = new Set(order);
  return (
    got.size === order.length &&
    want.size === ids.length &&
    order.every((x) => want.has(x))
  );
}

/** True when two slots hold teams that came from the same group (a rematch of the group stage). */
export function sameGroupPair(a: Origin, b: Origin): boolean {
  return a.originGroup != null && a.originGroup === b.originGroup;
}
