"use client";

import { CopyIcon, PencilIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useActionState,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useAction } from "@/components/competition/use-action";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  deleteEventAction,
  duplicateEventAction,
  type DuplicateState,
} from "@/lib/events/actions";

export type EventImpact = {
  registrations: number;
  matches: number;
  played: number;
};

const shiftYear = (iso: string) =>
  `${Number(iso.slice(0, 4)) + 1}${iso.slice(4)}`;

/** Edit, duplicate and delete an event. Deleting is for owners and asks for the event name. */
export function EventActions({
  eventId,
  eventName,
  startDate,
  endDate,
  isOwner,
  impact,
}: {
  eventId: string;
  eventName: string;
  startDate: string;
  endDate: string;
  isOwner: boolean;
  impact: EventImpact;
}) {
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Screens you leave keep their state: close the dialogs when leaving.
  const reset = useRef(() => {});
  useLayoutEffect(() => {
    reset.current = () => {
      setDuplicating(false);
      setDeleting(false);
    };
  });
  useLayoutEffect(() => () => reset.current(), []);

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/events/${eventId}/edit`}
        className={buttonVariants({ variant: "outline", size: "sm" }) + " h-9"}
      >
        <PencilIcon data-icon="inline-start" />
        Editar
      </Link>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9"
        onClick={() => setDuplicating(true)}
      >
        <CopyIcon data-icon="inline-start" />
        Duplicar
      </Button>
      {isOwner ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 text-destructive"
          onClick={() => setDeleting(true)}
        >
          <Trash2Icon data-icon="inline-start" />
          Excluir
        </Button>
      ) : null}

      <Dialog open={duplicating} onOpenChange={setDuplicating}>
        <DialogContent className="theme-dark sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicar evento</DialogTitle>
            <DialogDescription>
              Cria um novo evento com as mesmas categorias, regras e fases.
              Inscrições, sorteio, jogos e resultados não são copiados.
            </DialogDescription>
          </DialogHeader>
          {duplicating ? (
            <DuplicateForm
              eventId={eventId}
              eventName={eventName}
              startDate={startDate}
              endDate={endDate}
              onCancel={() => setDuplicating(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent className="theme-dark">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{eventName}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso não pode ser desfeito.{" "}
              {impact.registrations + impact.matches === 0
                ? "O evento ainda não tem inscrições nem jogos."
                : `Serão apagados ${impact.registrations} ${impact.registrations === 1 ? "inscrição" : "inscrições"} e ${impact.matches} ${impact.matches === 1 ? "jogo" : "jogos"}${impact.played > 0 ? ` (${impact.played} com resultado)` : ""}, além do sorteio, das estatísticas e da página pública.`}{" "}
              Atletas, times e árbitros continuam no cadastro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleting ? (
            <DeleteForm eventId={eventId} eventName={eventName} />
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Manter evento</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DuplicateForm({
  eventId,
  eventName,
  startDate,
  endDate,
  onCancel,
}: {
  eventId: string;
  eventName: string;
  startDate: string;
  endDate: string;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    duplicateEventAction.bind(null, eventId),
    {} as DuplicateState,
  );
  const errors = state.fieldErrors ?? {};
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  };
  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        {state.error ? (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}
        <Field data-invalid={errors.name ? true : undefined}>
          <FieldLabel htmlFor="dup-name">Nome do novo evento</FieldLabel>
          <Input
            id="dup-name"
            name="name"
            defaultValue={state.values?.name ?? `${eventName} (cópia)`}
            maxLength={120}
            className="h-10"
            aria-invalid={errors.name ? true : undefined}
          />
          <FieldError>{errors.name}</FieldError>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={errors.startDate ? true : undefined}>
            <FieldLabel htmlFor="dup-start">Início</FieldLabel>
            <Input
              id="dup-start"
              name="startDate"
              type="date"
              defaultValue={state.values?.startDate ?? shiftYear(startDate)}
              className="h-10"
              aria-invalid={errors.startDate ? true : undefined}
            />
            <FieldError>{errors.startDate}</FieldError>
          </Field>
          <Field data-invalid={errors.endDate ? true : undefined}>
            <FieldLabel htmlFor="dup-end">Fim</FieldLabel>
            <Input
              id="dup-end"
              name="endDate"
              type="date"
              defaultValue={state.values?.endDate ?? shiftYear(endDate)}
              className="h-10"
              aria-invalid={errors.endDate ? true : undefined}
            />
            <FieldError>{errors.endDate}</FieldError>
          </Field>
        </div>
      </FieldGroup>
      <DialogFooter className="mt-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <CopyIcon data-icon="inline-start" />
          )}
          Duplicar
        </Button>
      </DialogFooter>
    </form>
  );
}

function DeleteForm({
  eventId,
  eventName,
}: {
  eventId: string;
  eventName: string;
}) {
  const router = useRouter();
  const { pending, error, run } = useAction();
  const [typed, setTyped] = useState("");
  const matches = typed.trim() === eventName.trim();
  return (
    <div className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor="del-confirm">
          Para confirmar, digite o nome do evento
        </FieldLabel>
        <Input
          id="del-confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          placeholder={eventName}
          className="h-10"
        />
      </Field>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        type="button"
        variant="destructive"
        disabled={!matches || pending}
        onClick={() =>
          run(
            () => deleteEventAction(eventId, typed),
            () => router.push("/events"),
          )
        }
      >
        {pending ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <Trash2Icon data-icon="inline-start" />
        )}
        Excluir definitivamente
      </Button>
    </div>
  );
}
