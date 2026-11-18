"use client";

import { CircleAlertIcon, InfoIcon, SaveIcon } from "lucide-react";
import Link from "next/link";
import { startTransition, useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { saveEventRulesAction } from "@/lib/rules/actions";
import { CONFIDENCE_LABELS, PRESETS, PRESET_BY_KEY } from "@/lib/rules/presets";
import type { RulesInput } from "@/lib/rules/schema";
import { cn } from "@/lib/utils";
import { MatchesSection } from "./matches-section";
import { ScoringSection } from "./scoring-section";
import { StagesSection } from "./stages-section";
import { TiebreakersSection } from "./tiebreakers-section";
import { WalkoverSection } from "./walkover-section";

type TabKey = "scoring" | "tiebreakers" | "walkover" | "matches" | "stages";

const TABS: { key: TabKey; label: string }[] = [
  { key: "scoring", label: "Pontuação" },
  { key: "tiebreakers", label: "Desempate" },
  { key: "walkover", label: "W.O." },
  { key: "matches", label: "Confrontos" },
  { key: "stages", label: "Fases" },
];

function tabOf(field: string): TabKey {
  if (field.startsWith("tiebreakers")) return "tiebreakers";
  if (field.startsWith("wo")) return "walkover";
  if (
    ["matchFormat", "bestOf", "extraTime", "penalties", "awayGoals"].includes(
      field,
    )
  )
    return "matches";
  if (field.startsWith("stages")) return "stages";
  return "scoring";
}

const confidenceVariant = {
  OFFICIAL: "default",
  PARTIAL: "secondary",
  CONVENTION: "outline",
} as const;

type Props = {
  eventId: string;
  eventName: string;
  initial: RulesInput;
  /** False when the form starts from a suggested preset that was never saved. */
  hasSaved: boolean;
  suggestedKey: string;
  locked: boolean;
};

export function RulesEditor({
  eventId,
  eventName,
  initial,
  hasSaved,
  suggestedKey,
  locked,
}: Props) {
  const [draft, setDraft] = useState<RulesInput>(initial);
  // Bumped whenever values are replaced from outside, so uncontrolled inputs remount.
  const [version, setVersion] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("scoring");
  const [pending, setPending] = useState(false);
  const [presetChoice, setPresetChoice] = useState(
    initial.presetKey ?? suggestedKey,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  const initialJson = useMemo(() => JSON.stringify(initial), [initial]);
  const dirty = useMemo(
    () => JSON.stringify(draft) !== initialJson,
    [draft, initialJson],
  );
  const preset =
    PRESET_BY_KEY[draft.presetKey ?? presetChoice] ?? PRESET_BY_KEY.generic;
  const chosen = PRESET_BY_KEY[presetChoice] ?? PRESET_BY_KEY.generic;

  const patch = (changes: Partial<RulesInput>) =>
    setDraft((d) => ({ ...d, ...changes }));

  const applyPreset = () => {
    setDraft(structuredClone(chosen.rules));
    setVersion((v) => v + 1);
    setErrors({});
    setFormError(null);
    setConfirmOpen(false);
  };

  const errorTabs = new Set(Object.keys(errors).map(tabOf));

  const save = () => {
    setPending(true);
    setFormError(null);
    startTransition(async () => {
      const result = await saveEventRulesAction(eventId, draft);
      // A successful save redirects, so reaching this point means it failed.
      setPending(false);
      const fieldErrors = result?.fieldErrors ?? {};
      setErrors(fieldErrors);
      setFormError(result?.error ?? "Não foi possível salvar.");
      const first = Object.keys(fieldErrors)[0];
      if (first) setTab(tabOf(first));
    });
  };

  const section = { rules: draft, patch, errors };

  return (
    <div className="flex flex-col gap-6">
      {locked ? (
        <Alert>
          <InfoIcon />
          <AlertTitle>Regras travadas</AlertTitle>
          <AlertDescription>
            Este evento já teve partidas e as regras não podem mais mudar.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ponto de partida</CardTitle>
          <CardDescription>
            Escolha uma predefinição para preencher as regras. Depois você
            ajusta o que quiser; mudanças futuras nas predefinições não alteram
            este evento.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <NativeSelect
              aria-label="Predefinição"
              className="w-full sm:w-96"
              value={presetChoice}
              onChange={(e) => setPresetChoice(e.target.value)}
              disabled={locked}
            >
              {PRESETS.map((p) => (
                <NativeSelectOption key={p.key} value={p.key}>
                  {p.name}
                  {p.key === suggestedKey ? " (sugerida)" : ""}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Button
              type="button"
              variant="outline"
              disabled={locked}
              onClick={() =>
                dirty || hasSaved ? setConfirmOpen(true) : applyPreset()
              }
            >
              Aplicar predefinição
            </Button>
            {!hasSaved && !dirty ? (
              <Badge variant="secondary">Ainda não salvo</Badge>
            ) : null}
          </div>
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">{chosen.name}</p>
              <Badge variant={confidenceVariant[chosen.confidence]}>
                {CONFIDENCE_LABELS[chosen.confidence]}
              </Badge>
              {draft.presetKey && draft.presetKey !== chosen.key ? (
                <span className="text-xs text-muted-foreground">
                  Regras atuais baseadas em “{preset.name}”.
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {chosen.description}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Fonte: {chosen.source}
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(value) => setTab(value as TabKey)}>
        <TabsList className="h-auto w-full flex-wrap justify-start">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="gap-2 px-4 py-2">
              {t.label}
              {errorTabs.has(t.key) ? (
                <span
                  className="size-2 rounded-full bg-destructive"
                  aria-label="Há erros nesta aba"
                />
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>

        <fieldset disabled={locked} className="mt-6 min-w-0">
          <div key={version}>
            <TabsContent value="scoring">
              <ScoringSection {...section} />
            </TabsContent>
            <TabsContent value="tiebreakers">
              <TiebreakersSection {...section} />
            </TabsContent>
            <TabsContent value="walkover">
              <WalkoverSection {...section} />
            </TabsContent>
            <TabsContent value="matches">
              <MatchesSection {...section} />
            </TabsContent>
            <TabsContent value="stages">
              <StagesSection {...section} />
            </TabsContent>
          </div>
        </fieldset>
      </Tabs>

      {formError ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Não foi possível salvar</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center gap-3 border-t bg-background/85 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 xl:-mx-9 xl:px-9">
        <Button
          type="button"
          size="lg"
          disabled={pending || locked}
          onClick={save}
          className="h-11 px-5 text-base"
        >
          {pending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <SaveIcon data-icon="inline-start" />
          )}
          {pending ? "Salvando" : "Salvar regras"}
        </Button>
        <Link
          href={`/events/${eventId}`}
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "h-11 px-5 text-base",
          )}
        >
          Cancelar
        </Link>
        <span className="text-sm text-muted-foreground" aria-live="polite">
          {locked
            ? "Somente leitura"
            : dirty
              ? `Alterações não salvas em ${eventName}`
              : hasSaved
                ? "Tudo salvo"
                : "Nada salvo ainda"}
        </span>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="theme-dark">
          <AlertDialogHeader>
            <AlertDialogTitle>Substituir as regras atuais?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os campos serão trocados pelos da predefinição “
              {chosen.name}”. O que você editou e ainda não salvou será perdido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter as atuais</AlertDialogCancel>
            <AlertDialogAction onClick={applyPreset}>
              Substituir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
