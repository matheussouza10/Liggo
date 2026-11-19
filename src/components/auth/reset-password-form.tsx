"use client";

import {
  ArrowRightIcon,
  CircleAlertIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
} from "lucide-react";
import { useActionState, useId, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import {
  resetPasswordAction,
  type ResetPasswordState,
} from "@/lib/auth/actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-policy";

const initialState: ResetPasswordState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    resetPasswordAction,
    initialState,
  );
  const [show, setShow] = useState(false);
  const id = useId();
  const errors = state.fieldErrors;

  return (
    <form action={formAction} noValidate>
      <input type="hidden" name="token" value={token} />
      <FieldGroup>
        {state.error ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Não foi possível salvar</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        <Field data-invalid={errors?.password ? true : undefined}>
          <FieldLabel htmlFor={`${id}-password`}>Nova senha</FieldLabel>
          <InputGroup className="h-11">
            <InputGroupAddon>
              <LockIcon />
            </InputGroupAddon>
            <InputGroupInput
              id={`${id}-password`}
              name="password"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              aria-invalid={errors?.password ? true : undefined}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={show}
                onClick={() => setShow((v) => !v)}
              >
                {show ? <EyeOffIcon /> : <EyeIcon />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <FieldDescription>
            Pelo menos {MIN_PASSWORD_LENGTH} caracteres.
          </FieldDescription>
          <FieldError>{errors?.password}</FieldError>
        </Field>

        <Field data-invalid={errors?.confirmPassword ? true : undefined}>
          <FieldLabel htmlFor={`${id}-confirm`}>Repita a nova senha</FieldLabel>
          <InputGroup className="h-11">
            <InputGroupAddon>
              <LockIcon />
            </InputGroupAddon>
            <InputGroupInput
              id={`${id}-confirm`}
              name="confirmPassword"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              aria-invalid={errors?.confirmPassword ? true : undefined}
            />
          </InputGroup>
          <FieldError>{errors?.confirmPassword}</FieldError>
        </Field>

        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="h-11 w-full text-base"
        >
          {pending ? "Salvando" : "Salvar nova senha"}
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
