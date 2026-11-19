/** How a head-to-head match was won, and the podium of a knockout. Pure: no database. */

export const WIN_METHODS = [
  "POINTS",
  "DECISION",
  "SUBMISSION",
  "KO",
  "TKO",
  "IPPON",
  "DISQUALIFICATION",
  "RETIREMENT",
] as const;
export type WinMethodKey = (typeof WIN_METHODS)[number];

export const WIN_METHOD_LABELS: Record<WinMethodKey, string> = {
  POINTS: "Por pontos",
  DECISION: "Decisão dos árbitros",
  SUBMISSION: "Finalização",
  KO: "Nocaute",
  TKO: "Nocaute técnico",
  IPPON: "Ippon",
  DISQUALIFICATION: "Desclassificação do adversário",
  RETIREMENT: "Abandono do adversário",
};

/** Combat sports record how each fight ended. */
export const isCombatSport = (categoryName: string | null | undefined) =>
  !!categoryName && /luta|marciais/i.test(categoryName);

export type PodiumMatch = {
  label: string;
  homeId: string | null;
  awayId: string | null;
  winnerId: string | null;
};
export type PodiumPlace = { place: 1 | 2 | 3; id: string; note: string | null };

const loserOf = (m: PodiumMatch): string | null =>
  m.winnerId && m.winnerId === m.homeId
    ? m.awayId
    : m.winnerId && m.winnerId === m.awayId
      ? m.homeId
      : null;

/**
 * Who finished first, second and third in a knockout, once the final is decided.
 * Single elimination: the third place game decides third; without it, a
 * combat sport shares the bronze between both semifinal losers.
 * Double elimination: third is whoever lost the losers bracket final.
 */
export function podiumOf(
  matches: readonly PodiumMatch[],
  options: { double: boolean; sharedBronze: boolean },
): PodiumPlace[] {
  const decisive = matches.find((m) => m.label === "Final decisiva");
  const final = decisive ?? matches.find((m) => m.label === "Final");
  if (!final?.winnerId) return [];
  const out: PodiumPlace[] = [{ place: 1, id: final.winnerId, note: null }];
  const second = loserOf(final);
  if (second) out.push({ place: 2, id: second, note: null });

  if (options.double) {
    const lb = matches.find((m) => m.label === "Final da chave inferior");
    const third = lb ? loserOf(lb) : null;
    if (third) out.push({ place: 3, id: third, note: null });
    return out;
  }
  const thirdGame = matches.find((m) => m.label === "Disputa de 3º lugar");
  if (thirdGame?.winnerId) {
    out.push({ place: 3, id: thirdGame.winnerId, note: null });
  } else if (!thirdGame && options.sharedBronze) {
    for (const m of matches.filter((x) => x.label === "Semifinal")) {
      const l = loserOf(m);
      if (l) out.push({ place: 3, id: l, note: "Bronze" });
    }
  }
  return out;
}
