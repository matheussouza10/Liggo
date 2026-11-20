import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RulesEditor } from "@/components/rules/rules-editor";
import { Badge } from "@/components/ui/badge";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { PRESET_BY_KEY, suggestPresetKey } from "@/lib/rules/presets";
import { getEventForRules, storedRulesToInput } from "@/lib/rules/queries";

export const metadata: Metadata = {
  title: "Regras do evento | Liggo",
  robots: { index: false, follow: false },
};

// Reads the session on every request (see the note in the parent layout).
export const instant = false;

export default async function EventRulesPage({
  params,
}: PageProps<"/events/[id]/rules">) {
  const user = await requireOrganizationUser();
  const { id } = await params;
  // Scoped to the user's organization: another tenant's event is a 404.
  const event = user.organization
    ? await getEventForRules(user.organization.id, id)
    : null;
  if (!event) notFound();

  const suggestedKey = suggestPresetKey(
    event.sport.name,
    event.sport.category.name,
  );
  const stored = storedRulesToInput(event);
  const initial = stored ?? structuredClone(PRESET_BY_KEY[suggestedKey].rules);

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <Link
          href={`/events/${event.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-white"
        >
          <ArrowLeftIcon className="size-4" />
          {event.name}
        </Link>
        <h1 className="mt-3 font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          Regras do evento
        </h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary">{event.sport.name}</Badge>
          <Badge variant="secondary">{event.format.name}</Badge>
        </div>
      </div>

      <RulesEditor
        eventId={event.id}
        eventName={event.name}
        initial={initial}
        hasSaved={stored !== null}
        suggestedKey={suggestedKey}
        locked={event.rulesLockedAt !== null}
      />
    </div>
  );
}
