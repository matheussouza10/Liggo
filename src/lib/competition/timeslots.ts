export type SlotOptions = {
  /** First day, YYYY-MM-DD. */
  startDate: string;
  /** First and last kickoff of each day, HH:MM. */
  firstTime: string;
  lastTime: string;
  slotMinutes: number;
  venues: string[];
};

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** Brazil has no daylight saving time since 2019, so -03:00 is fixed. */
export const TIME_ZONE = "America/Sao_Paulo";
export function localDateTime(date: string, minutes: number): Date {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return new Date(`${date}T${hh}:${mm}:00-03:00`);
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Fills time slots round by round. Matches of a round run in parallel (one
 * per venue); a new round always starts in a fresh slot, so a team never has
 * two matches at the same time.
 */
export function autoSchedule(
  rounds: readonly (readonly string[])[],
  o: SlotOptions,
): { matchId: string; at: Date; venue: string }[] {
  const first = toMinutes(o.firstTime);
  const last = toMinutes(o.lastTime);
  const starts: number[] = [];
  for (let t = first; t <= last; t += o.slotMinutes) starts.push(t);
  if (starts.length === 0 || o.venues.length === 0) return [];

  let day = 0;
  let slot = 0;
  const advance = () => {
    slot++;
    if (slot >= starts.length) {
      slot = 0;
      day++;
    }
  };

  const out: { matchId: string; at: Date; venue: string }[] = [];
  for (const round of rounds) {
    round.forEach((matchId, k) => {
      if (k > 0 && k % o.venues.length === 0) advance();
      out.push({
        matchId,
        at: localDateTime(addDays(o.startDate, day), starts[slot]),
        venue: o.venues[k % o.venues.length],
      });
    });
    if (round.length > 0) advance();
  }
  return out;
}
