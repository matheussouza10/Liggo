import type { Overview } from "@/lib/competition/stats";
import { CardsBars } from "./cards-bars";
import { RankBars } from "./rank-bars";

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="liquid-card rounded-xl p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl leading-none font-extrabold tabular-nums">
        {value}
      </p>
    </div>
  );
}

function Panel({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="liquid-card flex flex-col gap-4 rounded-xl p-5"
    >
      <div>
        <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
          {title}
        </h2>
        {note ? (
          <p className="mt-1 text-sm text-muted-foreground">{note}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

const jogos = (n: number) => `${n} ${n === 1 ? "jogo" : "jogos"}`;

/** Rankings and totals of an event. Shared by the organizer and the public page. */
export function EventStatsView({ data }: { data: Overview }) {
  return (
    <div className="flex flex-col gap-6">
      <section
        aria-label="Resumo"
        className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6"
      >
        <Tile label="Jogos disputados" value={data.matches} />
        <Tile label="Gols / pontos" value={data.goals} />
        <Tile
          label="Média por jogo"
          value={
            data.goalsPerMatch == null
              ? "–"
              : data.goalsPerMatch.toLocaleString("pt-BR")
          }
        />
        <Tile label="Cartões amarelos" value={data.yellow} />
        <Tile label="Cartões vermelhos" value={data.red} />
        <Tile label="Faltas" value={data.fouls} />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="Artilharia"
          note={
            data.goalsUntaggedCount
              ? `${data.goalsUntaggedCount} ${data.goalsUntaggedCount === 1 ? "gol sem autor informado não entra" : "gols sem autor informado não entram"} no ranking.`
              : undefined
          }
        >
          <RankBars
            unit="gols"
            empty="Nenhum gol com autor registrado ainda."
            rows={data.scorers.slice(0, 10).map((r) => ({
              key: r.id,
              label: r.name,
              sub: `${r.team} · ${jogos(r.matches)}`,
              value: r.count,
            }))}
          />
        </Panel>
        <Panel title="Assistências">
          <RankBars
            unit="assistências"
            empty="Nenhuma assistência registrada ainda."
            rows={data.assists.slice(0, 10).map((r) => ({
              key: r.id,
              label: r.name,
              sub: `${r.team} · ${jogos(r.matches)}`,
              value: r.count,
            }))}
          />
        </Panel>
        <Panel title="Cartões por time">
          <CardsBars
            rows={data.cardsByTeam}
            empty="Nenhum cartão registrado ainda."
          />
        </Panel>
        <Panel title="Faltas por time">
          <RankBars
            unit="faltas"
            empty="Nenhuma falta registrada ainda."
            rows={data.foulsByTeam.map((r) => ({
              key: r.team,
              label: r.team,
              value: r.value,
            }))}
          />
        </Panel>
        <Panel
          title="Posse de bola média"
          note="Média dos jogos em que a posse foi informada."
        >
          <RankBars
            unit="de posse"
            empty="A posse de bola ainda não foi informada em nenhum jogo."
            rows={data.possessionByTeam.map((r) => ({
              key: r.team,
              label: r.team,
              sub: jogos(r.matches),
              value: r.value,
              valueLabel: `${r.value}%`,
            }))}
          />
        </Panel>
        <Panel title="Atletas com cartões">
          {data.carded.length === 0 ? (
            <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
              Nenhum atleta com cartão registrado ainda.
            </p>
          ) : (
            <table className="w-full text-sm">
              <caption className="sr-only">Atletas com cartões</caption>
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th scope="col" className="pb-2 font-normal">
                    Atleta
                  </th>
                  <th scope="col" className="pb-2 text-right font-normal">
                    Amarelos
                  </th>
                  <th scope="col" className="pb-2 text-right font-normal">
                    Vermelhos
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.carded.slice(0, 10).map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-2">
                      <span className="block font-medium">{r.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {r.team}
                      </span>
                    </td>
                    <td className="py-2 text-right tabular-nums">{r.yellow}</td>
                    <td className="py-2 text-right tabular-nums">{r.red}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </div>
  );
}
