"use client";

import { ArrowRightIcon, CircleAlertIcon, MailIcon } from "lucide-react";
import { useActionState, useId } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import {
  forgotPasswordAction,
  type ForgotPasswordState,
} from "@/lib/auth/actions";

const initialState: ForgotPasswordState = { email: "" };

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    forgotPasswordAction,
    initialState,
  );
  const emailId = useId();
  const errorId = `${emailId}-error`;

  return (
    <form action={formAction} noValidate>
      <FieldGroup>
        {state.error ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Não foi possível enviar o link</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        <Field data-invalid={state.fieldError ? true : undefined}>
          <FieldLabel htmlFor={emailId}>E-mail</FieldLabel>
          <InputGroup className="h-11">
            <InputGroupAddon>
              <MailIcon />
            </InputGroupAddon>
            <InputGroupInput
              id={emailId}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              defaultValue={state.email}
              placeholder="voce@exemplo.com"
              aria-invalid={state.fieldError ? true : undefined}
              aria-describedby={state.fieldError ? errorId : undefined}
            />
          </InputGroup>
          <FieldError id={errorId}>{state.fieldError}</FieldError>
        </Field>

        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="h-11 w-full text-base"
        >
          {pending ? "Enviando" : "Enviar link de recuperação"}
          {pending ? (
            <Spinner data-icon="inline-end" />
          ) : (
            <ArrowRightIcon data-icon="inline-end" />
          )}
        </Button>
      </FieldGroup>
    </form>
  );
}
