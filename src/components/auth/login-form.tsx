"use client";

import { CircleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { signInAction, type SignInState } from "@/lib/auth/actions";

type Variant = "organizer" | "admin";

const initialState: SignInState = { email: "" };

export function LoginForm({ variant }: { variant: Variant }) {
  const [state, formAction, pending] = useActionState(
    signInAction,
    initialState,
  );
  const [showPassword, setShowPassword] = useState(false);
  const emailId = useId();
  const passwordId = useId();
  const emailErrorId = `${emailId}-error`;
  const passwordErrorId = `${passwordId}-error`;
  const isAdmin = variant === "admin";

  const emailError = state.fieldErrors?.email;
  const passwordError = state.fieldErrors?.password;

  return (
    <form action={formAction} noValidate>
      <input type="hidden" name="role" value={variant} />
      <FieldGroup>
        {state.error ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Não foi possível entrar</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        <Field data-invalid={emailError ? true : undefined}>
          <FieldLabel htmlFor={emailId}>E-mail</FieldLabel>
          <Input
            id={emailId}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            defaultValue={state.email}
            placeholder={isAdmin ? "admin@empresa.com" : "voce@exemplo.com"}
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? emailErrorId : undefined}
            className="h-10"
          />
          <FieldError id={emailErrorId}>{emailError}</FieldError>
        </Field>

        <Field data-invalid={passwordError ? true : undefined}>
          <div className="flex items-center justify-between gap-3">
            <FieldLabel htmlFor={passwordId}>Senha</FieldLabel>
            {!isAdmin ? (
              <Link
                href="/recuperar-senha"
                className="text-sm font-medium underline"
              >
                Esqueci a senha
              </Link>
            ) : null}
          </div>
          <InputGroup className="h-10">
            <InputGroupInput
              id={passwordId}
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              aria-invalid={passwordError ? true : undefined}
              aria-describedby={passwordError ? passwordErrorId : undefined}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <FieldError id={passwordErrorId}>{passwordError}</FieldError>
        </Field>

        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="h-10 w-full text-base"
        >
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pending ? "Entrando" : "Entrar"}
        </Button>
      </FieldGroup>
    </form>
  );
}
