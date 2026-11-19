"use client";

import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { setPublicVisibleAction } from "@/lib/competition/live-actions";
import { useAction } from "./use-action";

/** Shows or hides the event on the public pages. */
export function PublicToggle({
  eventId,
  initial,
}: {
  eventId: string;
  initial: boolean;
}) {
  const [on, setOn] = useState(initial);
  const { pending, error, run } = useAction();

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-3 text-sm font-medium">
        <Switch
          checked={on}
          disabled={pending}
          aria-label="Divulgar este evento na página pública"
          onCheckedChange={(v) => {
            setOn(v);
            run(async () => {
              const r = await setPublicVisibleAction(eventId, v);
              if (!r.ok) setOn(!v);
              return r;
            });
          }}
        />
        Divulgar este evento na página pública
      </label>
      <p className="text-sm text-muted-foreground">
        {on
          ? "Qualquer pessoa pode ver jogos, resultados, classificação e chaveamento, sem entrar. Aparecem nomes de equipes e dos atletas nos lances."
          : "O evento não aparece na página pública."}
      </p>
      {on ? (
        <Link
          href={`/watch/events/${eventId}`}
          target="_blank"
          className="inline-flex w-fit items-center gap-1.5 text-sm"
        >
          <ExternalLinkIcon className="size-4" aria-hidden />
          Abrir página pública do evento
        </Link>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
