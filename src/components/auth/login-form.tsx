"use client";

import {
  ArrowRightIcon,
  CircleAlertIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Field,
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
import { signInAction, type SignInState } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

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
              placeholder={isAdmin ? "admin@empresa.com" : "voce@exemplo.com"}
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? emailErrorId : undefined}
            />
          </InputGroup>
          <FieldError id={emailErrorId}>{emailError}</FieldError>
        </Field>

        <Field data-invalid={passwordError ? true : undefined}>
          <FieldLabel htmlFor={passwordId}>Senha</FieldLabel>
          <InputGroup className="h-11">
            <InputGroupAddon>
              <LockIcon />
            </InputGroupAddon>
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
                size="icon-xs"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <FieldError id={passwordErrorId}>{passwordError}</FieldError>
          {!isAdmin ? (
            <Link
              href="/forgot-password"
              className={cn(
                buttonVariants({ variant: "link", size: "xs" }),
                "justify-end",
              )}
            >
              Esqueceu a senha?
            </Link>
          ) : null}
        </Field>

        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="h-11 w-full text-base"
        >
          {pending ? "Entrando" : "Entrar"}
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
