"use client";

import { CheckIcon, CopyIcon, ExternalLinkIcon, SaveIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAction } from "@/components/competition/use-action";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { saveRegistrationSettingsAction } from "@/lib/requests/actions";

/** Opens the public registration form of an event and sets its deadline and instructions. */
export function RegistrationSettings({
  eventId,
  link,
  initial,
}: {
  eventId: string;
  /** Full address of the public form, ready to share. */
  link: string;
  initial: { open: boolean; deadline: string; notes: string };
}) {
  const [open, setOpen] = useState(initial.open);
  const [deadline, setDeadline] = useState(initial.deadline);
  const [notes, setNotes] = useState(initial.notes);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const { pending, error, run } = useAction();
  // What the server has right now, so the button turns off after saving.
  const [base, setBase] = useState(initial);
  const changed =
    open !== base.open || deadline !== base.deadline || notes !== base.notes;

  const save = () =>
    run(
      () => saveRegistrationSettingsAction(eventId, { open, deadline, notes }),
      () => {
        setBase({ open, deadline, notes });
        setSaved(true);
      },
    );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the address stays visible to copy by hand.
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <label className="flex items-center gap-3 text-sm font-medium">
        <Switch
          checked={open}
          disabled={pending}
          aria-label="Receber pedidos de inscrição pela página pública"
          onCheckedChange={(v) => {
            setOpen(v);
            setSaved(false);
          }}
        />
        Receber pedidos de inscrição pela página pública
      </label>

      <div className="grid gap-4 grid-cols-1">
        <Field>
          <FieldLabel htmlFor="reg-deadline">Prazo (opcional)</FieldLabel>
          <Input
            id="reg-deadline"
            type="date"
            value={deadline}
            onChange={(e) => {
              setDeadline(e.target.value);
              setSaved(false);
            }}
            className="h-10"
          />
          <FieldDescription>Vale até o fim desse dia.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="reg-notes">
            Instruções para quem vai se inscrever (opcional)
          </FieldLabel>
          <Textarea
            id="reg-notes"
            rows={3}
            maxLength={1500}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setSaved(false);
            }}
            placeholder="Ex.: taxa, documentos que o time deve levar, regras de conduta."
          />
        </Field>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" disabled={!changed || pending} onClick={save}>
          {pending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <SaveIcon data-icon="inline-start" />
          )}
          Salvar
        </Button>
        {saved && !changed ? (
          <span className="text-sm text-muted-foreground">
            Configuração salva.
          </span>
        ) : null}
      </div>

      {base.open ? (
        <div className="liquid-card flex flex-col gap-2 rounded-xl p-4">
          <p className="text-sm font-medium">Link para divulgar</p>
          <div className="flex flex-wrap items-center gap-2">
            <code
              className="min-w-0 flex-1 truncate rounded-md border border-white/15 px-3 py-2 text-sm"
              aria-label="Link do formulário de inscrição"
            >
              {link}
            </code>
            <Button type="button" variant="outline" onClick={copy}>
              {copied ? (
                <CheckIcon data-icon="inline-start" />
              ) : (
                <CopyIcon data-icon="inline-start" />
              )}
              {copied ? "Copiado" : "Copiar"}
            </Button>
            <Link
              href={`/register/${eventId}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-sm"
            >
              <ExternalLinkIcon className="size-4" aria-hidden />
              Abrir
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
