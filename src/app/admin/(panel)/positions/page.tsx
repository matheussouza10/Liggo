import type { Metadata } from "next";
import { PositionsManager } from "@/components/admin/positions-manager";
import { requireSystemAdmin } from "@/lib/auth/guards";
import {
  getPositions,
  getSportsWithPositionCount,
} from "@/lib/catalog/queries";

export const metadata: Metadata = {
  title: "Posições | Administração | Liggo",
  robots: { index: false, follow: false },
};

// Reads the session on every request (see the note in the parent layout).
export const instant = false;

export default async function PositionsPage({
  searchParams,
}: PageProps<"/admin/positions">) {
  await requireSystemAdmin();
  const { sport } = await searchParams;
  const sportId = typeof sport === "string" ? sport : "";
  const groups = await getSportsWithPositionCount();
  const known = groups.some((g) => g.options.some((o) => o.id === sportId));
  const positions = known ? await getPositions(sportId) : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          Posições
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Posições de jogo de cada modalidade (goleiro, levantador...). Usadas
          no elenco das inscrições.
        </p>
      </div>
      <PositionsManager
        groups={groups}
        sportId={known ? sportId : ""}
        positions={positions.map((p) => ({
          id: p.id,
          name: p.name,
          abbreviation: p.abbreviation,
          active: p.active,
        }))}
      />
    </div>
  );
}
