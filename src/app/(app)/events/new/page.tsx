import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EventForm } from "@/components/events/event-form";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { getEventFormOptions } from "@/lib/catalog/queries";

export const metadata: Metadata = {
  title: "Novo evento | Liggo",
  robots: { index: false, follow: false },
};

// Reads the session on every request (see the note in the parent layout).
export const instant = false;

export default async function NewEventPage() {
  await requireOrganizationUser();
  const options = await getEventFormOptions();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-white"
        >
          <ArrowLeftIcon className="size-4" />
          Eventos
        </Link>
        <h1 className="mt-3 font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          Novo evento
        </h1>
        <p className="mt-3 text-muted-foreground">
          As regras da competição serão definidas depois de criar o evento.
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
        <div className="liquid-card rounded-xl p-6">
          <EventForm options={options} />
        </div>
        <aside
          aria-label="O que acontece depois"
          className="liquid-card flex flex-col gap-4 rounded-xl p-5"
        >
          <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
            Depois de criar
          </h2>
          <p className="text-sm text-muted-foreground">
            O evento nasce com uma categoria geral. A Jornada do evento guia
            cada passo e avisa o que falta.
          </p>
          <ol className="flex flex-col gap-3">
            {[
              [
                "Regras e fases",
                "Pontuação, desempate e formato da competição, já sugeridos pela modalidade.",
              ],
              ["Categorias", "Sexo, idade e tamanho do elenco."],
              [
                "Inscrições",
                "Você inscreve ou abre um link para os times pedirem.",
              ],
              [
                "Sorteio e jogos",
                "Sorteio animado, tabela, resultados ao vivo e página pública.",
              ],
            ].map(([title, text], i) => (
              <li key={title} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary tabular-nums">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block font-medium">{title}</span>
                  <span className="block text-sm text-muted-foreground">
                    {text}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
