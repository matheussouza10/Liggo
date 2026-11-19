"use client";

import {
  ArrowRightIcon,
  CircleAlertIcon,
  LockIcon,
  UserRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { acceptInviteAction, type AcceptInviteState } from "@/lib/auth/actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-policy";

export function InviteForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    acceptInviteAction,
    {} as AcceptInviteState,
  );
  const [terms, setTerms] = useState(false);
  const id = useId();
  const errors = state.fieldErrors;

  return (
    <form action={formAction} noValidate>
      <input type="hidden" name="token" value={token} />
      <FieldGroup>
        {state.error ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Não foi possível criar a conta</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}
        <Field data-invalid={errors?.name ? true : undefined}>
          <FieldLabel htmlFor={`${id}-name`}>Seu nome</FieldLabel>
          <InputGroup className="h-11">
            <InputGroupAddon>
              <UserRoundIcon />
            </InputGroupAddon>
            <InputGroupInput
              id={`${id}-name`}
              name="name"
              autoComplete="name"
              defaultValue={state.values?.name}
              aria-invalid={errors?.name ? true : undefined}
            />
          </InputGroup>
          <FieldError>{errors?.name}</FieldError>
        </Field>
        <Field data-invalid={errors?.password ? true : undefined}>
          <FieldLabel htmlFor={`${id}-password`}>Senha</FieldLabel>
          <InputGroup className="h-11">
            <InputGroupAddon>
              <LockIcon />
            </InputGroupAddon>
            <InputGroupInput
              id={`${id}-password`}
              name="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={errors?.password ? true : undefined}
            />
          </InputGroup>
          <FieldDescription>
            Pelo menos {MIN_PASSWORD_LENGTH} caracteres.
          </FieldDescription>
          <FieldError>{errors?.password}</FieldError>
        </Field>
        <Field data-invalid={errors?.confirmPassword ? true : undefined}>
          <FieldLabel htmlFor={`${id}-confirm`}>Repita a senha</FieldLabel>
          <InputGroup className="h-11">
            <InputGroupAddon>
              <LockIcon />
            </InputGroupAddon>
            <InputGroupInput
              id={`${id}-confirm`}
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={errors?.confirmPassword ? true : undefined}
            />
          </InputGroup>
          <FieldError>{errors?.confirmPassword}</FieldError>
        </Field>
        <Field
          orientation="horizontal"
          data-invalid={errors?.terms ? true : undefined}
        >
          {/* The form is reset after a failed submit; this field keeps the answer the checkbox shows. */}
          <input type="hidden" name="terms" value={terms ? "on" : ""} />
          <Checkbox
            id={`${id}-terms`}
            checked={terms}
            onCheckedChange={setTerms}
            aria-invalid={errors?.terms ? true : undefined}
          />
          <FieldLabel htmlFor={`${id}-terms`} className="font-normal">
            Li e aceito os{" "}
            <Link href="/terms" target="_blank" className="underline">
              termos de uso
            </Link>{" "}
            e a{" "}
            <Link href="/privacy" target="_blank" className="underline">
              política de privacidade
            </Link>
            .
          </FieldLabel>
        </Field>
        <FieldError>{errors?.terms}</FieldError>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="h-11 w-full text-base"
        >
          {pending ? "Criando conta" : "Criar conta e entrar"}
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
