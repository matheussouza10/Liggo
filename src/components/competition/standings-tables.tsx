import { TriangleAlertIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TIEBREAKER_BY_KEY } from "@/lib/rules/catalog";
import type { TableView } from "@/lib/competition/run-standings";

export function StandingsTables({
  tables,
  ignored,
  qualify,
}: {
  tables: TableView[];
  ignored: string[];
  qualify: number | null;
}) {
  return (
    <div className="flex flex-col gap-5">
      {ignored.length ? (
        <p className="flex items-start gap-2 rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <span>
            Estes critérios de desempate ainda não são calculados e foram
            ignorados:{" "}
            {ignored
              .map(
                (k) =>
                  TIEBREAKER_BY_KEY[k as keyof typeof TIEBREAKER_BY_KEY]
                    ?.label ?? k,
              )
              .join(", ")}
            .
          </span>
        </p>
      ) : null}
      <div className="grid gap-5 xl:grid-cols-2">
        {tables.map((t) => (
          <section
            key={t.groupId ?? "all"}
            className="liquid-card overflow-hidden rounded-xl"
            aria-label={t.name}
          >
            <h3 className="px-4 pt-4 font-display text-xl leading-none font-bold tracking-wide uppercase">
              {t.name}
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Participante</TableHead>
                  <TableHead className="w-12 text-right" title="Pontos">
                    Pts
                  </TableHead>
                  <TableHead className="w-10 text-right" title="Jogos">
                    J
                  </TableHead>
                  <TableHead className="w-10 text-right" title="Vitórias">
                    V
                  </TableHead>
                  <TableHead className="w-10 text-right" title="Empates">
                    E
                  </TableHead>
                  <TableHead className="w-10 text-right" title="Derrotas">
                    D
                  </TableHead>
                  <TableHead className="w-14 text-right" title="Saldo">
                    SG
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {t.rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="tabular-nums">{r.position}</TableCell>
                    <TableCell className="font-medium">
                      <span className="flex flex-wrap items-center gap-2">
                        {r.name}
                        {qualify != null && r.position <= qualify ? (
                          <Badge variant="secondary">Classifica</Badge>
                        ) : null}
                        {r.tied ? (
                          <Badge variant="outline">Empate</Badge>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {r.points}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.played}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.wins}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.draws}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.losses}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.diff > 0 ? `+${r.diff}` : r.diff}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        ))}
      </div>
    </div>
  );
}
