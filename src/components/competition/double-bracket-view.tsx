import type { MatchView } from "@/lib/competition/view";
import { BracketView } from "./bracket-view";

const isWinners = (m: MatchView) => /chave superior/i.test(m.label);
const isLosers = (m: MatchView) => /chave inferior/i.test(m.label);

/** Double elimination: the winners bracket, the losers bracket and the final(s), each as columns by round. */
export function DoubleBracketView({
  matches,
  onOpen,
}: {
  matches: MatchView[];
  onOpen?: (m: MatchView) => void;
}) {
  const winners = matches.filter(isWinners);
  const losers = matches.filter(isLosers);
  const finals = matches.filter((m) => !isWinners(m) && !isLosers(m));
  const sections = [
    { title: "Chave superior", list: winners },
    { title: "Chave inferior", list: losers },
    { title: "Final", list: finals },
  ].filter((s) => s.list.length > 0);
  return (
    <div className="flex flex-col gap-8">
      {sections.map((s) => (
        <section
          key={s.title}
          aria-label={s.title}
          className="flex flex-col gap-3"
        >
          <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
            {s.title}
          </h2>
          <BracketView matches={s.list} onOpen={onOpen} />
        </section>
      ))}
    </div>
  );
}
