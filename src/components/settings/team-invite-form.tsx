"use client";

import { CircleAlertIcon, CircleCheckIcon, SendIcon } from "lucide-react";
import { useActionState, useId } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import type { FormState } from "@/lib/settings/actions";
import { inviteAction } from "@/lib/team/actions";

export function TeamInviteForm() {
  const [state, formAction, pending] = useActionState(
    inviteAction,
    {} as FormState,
  );
  const id = useId();
  return (
    <form
      key={state.done ?? 0}
      action={formAction}
      noValidate
      className="flex flex-col gap-4"
    >
      {state.message ? (
        <Alert>
          <CircleCheckIcon />
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      {state.error ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem_auto] sm:items-start">
        <Field data-invalid={state.fieldErrors?.email ? true : undefined}>
          <FieldLabel htmlFor={`${id}-email`}>E-mail da pessoa</FieldLabel>
          <Input
            id={`${id}-email`}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="off"
            defaultValue={state.values?.email}
            placeholder="pessoa@exemplo.com"
            className="h-10"
            aria-invalid={state.fieldErrors?.email ? true : undefined}
          />
          <FieldError>{state.fieldErrors?.email}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-role`}>Papel</FieldLabel>
          <NativeSelect
            id={`${id}-role`}
            name="role"
            defaultValue={state.values?.role ?? "MEMBER"}
            className="w-full"
          >
            <NativeSelectOption value="MEMBER">Membro</NativeSelectOption>
            <NativeSelectOption value="OWNER">Proprietário</NativeSelectOption>
          </NativeSelect>
        </Field>
        <div className="sm:pt-[1.625rem]">
          <Button type="submit" className="h-10" disabled={pending}>
            {pending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <SendIcon data-icon="inline-start" />
            )}
            Enviar convite
          </Button>
        </div>
      </div>
    </form>
  );
}
