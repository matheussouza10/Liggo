"use client";

import { CheckIcon, Trash2Icon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAction } from "@/components/competition/use-action";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  approveRequestAction,
  changeRequestCategoryAction,
  rejectRequestAction,
  removeRequestMemberAction,
} from "@/lib/requests/actions";

/** The organizer's controls over a pending request. */
export function RequestReview({
  requestId,
  eventId,
  categoryId,
  categories,
  members,
  canApprove,
}: {
  requestId: string;
  eventId: string;
  categoryId: string;
  categories: { id: string; name: string }[];
  members: { id: string; name: string }[];
  canApprove: boolean;
}) {
  const router = useRouter();
  const { pending, error, run } = useAction();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <section aria-label="Decisão" className="flex flex-col gap-5 border-t pt-6">
      <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
        Decisão
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="rv-category">Categoria do pedido</FieldLabel>
          <NativeSelect
            id="rv-category"
            className="w-full"
            value={categoryId}
            disabled={pending}
            onChange={(e) =>
              run(
                () => changeRequestCategoryAction(requestId, e.target.value),
                () => router.refresh(),
              )
            }
          >
            {categories.map((c) => (
              <NativeSelectOption key={c.id} value={c.id}>
                {c.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        {members.length > 1 ? (
          <Field>
            <FieldLabel htmlFor="rv-remove">
              Tirar um atleta do pedido
            </FieldLabel>
            <NativeSelect
              id="rv-remove"
              className="w-full"
              value=""
              disabled={pending}
              onChange={(e) =>
                e.target.value &&
                run(
                  () => removeRequestMemberAction(requestId, e.target.value),
                  () => router.refresh(),
                )
              }
            >
              <NativeSelectOption value="">Escolha quem sai</NativeSelectOption>
              {members.map((m) => (
                <NativeSelectOption key={m.id} value={m.id}>
                  {m.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
      </div>

      {/* While the dialog is open the error is shown inside it, never twice. */}
      {error && !rejecting ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="lg"
          className="h-11 px-5"
          disabled={!canApprove || pending}
          onClick={() =>
            run(
              () => approveRequestAction(requestId),
              () => router.refresh(),
            )
          }
        >
          {pending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <CheckIcon data-icon="inline-start" />
          )}
          Aprovar e inscrever
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-11 px-5"
          disabled={pending}
          onClick={() => setRejecting(true)}
        >
          <XIcon data-icon="inline-start" />
          Recusar
        </Button>
        {!canApprove ? (
          <span className="text-sm text-muted-foreground">
            Resolva os avisos acima para aprovar.
          </span>
        ) : null}
      </div>

      <Dialog open={rejecting} onOpenChange={setRejecting}>
        <DialogContent className="theme-dark sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recusar pedido</DialogTitle>
            <DialogDescription>
              O solicitante recebe o motivo por e-mail. Os documentos e contatos
              informados são apagados.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="rv-reason">Motivo</FieldLabel>
            <Textarea
              id="rv-reason"
              rows={3}
              maxLength={300}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejecting(false)}
            >
              Voltar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() =>
                run(
                  () => rejectRequestAction(requestId, reason),
                  () => {
                    setRejecting(false);
                    router.push(`/events/${eventId}/requests`);
                  },
                )
              }
            >
              {pending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Trash2Icon data-icon="inline-start" />
              )}
              Recusar pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
