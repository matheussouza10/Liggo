"use client";

import {
  ArrowRightIcon,
  Building2Icon,
  CircleAlertIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
  UserIcon,
} from "lucide-react";
import { useActionState, useId, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { signUpAction, type SignUpState } from "@/lib/auth/actions";

const initialState: SignUpState = {
  values: { organization: "", name: "", email: "" },
};

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(
    signUpAction,
    initialState,
  );
  const [showPassword, setShowPassword] = useState(false);
  const id = useId();
  const errors = state.fieldErrors;

  const ids = {
    organization: `${id}-organization`,
    name: `${id}-name`,
    email: `${id}-email`,
    password: `${id}-password`,
    confirmPassword: `${id}-confirm`,
    terms: `${id}-terms`,
  };

  return (
    <form action={formAction} noValidate>
      <FieldGroup>
        {state.error ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Não foi possível criar a conta</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={errors?.organization ? true : undefined}>
            <FieldLabel htmlFor={ids.organization}>
              Nome da organização
            </FieldLabel>
            <InputGroup className="h-11">
              <InputGroupAddon>
                <Building2Icon />
              </InputGroupAddon>
              <InputGroupInput
                id={ids.organization}
                name="organization"
                autoComplete="organization"
                defaultValue={state.values.organization}
                placeholder="Liga Municipal de Futsal"
                aria-invalid={errors?.organization ? true : undefined}
                aria-describedby={
                  errors?.organization ? `${ids.organization}-error` : undefined
                }
              />
            </InputGroup>
            <FieldError id={`${ids.organization}-error`}>
              {errors?.organization}
            </FieldError>
          </Field>

          <Field data-invalid={errors?.name ? true : undefined}>
            <FieldLabel htmlFor={ids.name}>Nome do responsável</FieldLabel>
            <InputGroup className="h-11">
              <InputGroupAddon>
                <UserIcon />
              </InputGroupAddon>
              <InputGroupInput
                id={ids.name}
                name="name"
                autoComplete="name"
                defaultValue={state.values.name}
                placeholder="Seu nome completo"
                aria-invalid={errors?.name ? true : undefined}
                aria-describedby={
                  errors?.name ? `${ids.name}-error` : undefined
                }
              />
            </InputGroup>
            <FieldError id={`${ids.name}-error`}>{errors?.name}</FieldError>
          </Field>
        </div>

        <Field data-invalid={errors?.email ? true : undefined}>
          <FieldLabel htmlFor={ids.email}>E-mail</FieldLabel>
          <InputGroup className="h-11">
            <InputGroupAddon>
              <MailIcon />
            </InputGroupAddon>
            <InputGroupInput
              id={ids.email}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              defaultValue={state.values.email}
              placeholder="voce@exemplo.com"
              aria-invalid={errors?.email ? true : undefined}
              aria-describedby={
                errors?.email ? `${ids.email}-error` : undefined
              }
            />
          </InputGroup>
          <FieldError id={`${ids.email}-error`}>{errors?.email}</FieldError>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={errors?.password ? true : undefined}>
            <FieldLabel htmlFor={ids.password}>Senha</FieldLabel>
            <InputGroup className="h-11">
              <InputGroupAddon>
                <LockIcon />
              </InputGroupAddon>
              <InputGroupInput
                id={ids.password}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                aria-invalid={errors?.password ? true : undefined}
                placeholder="Mínimo de 8 caracteres"
                aria-describedby={
                  errors?.password ? `${ids.password}-error` : undefined
                }
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  aria-label={
                    showPassword ? "Ocultar senhas" : "Mostrar senhas"
                  }
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            <FieldError id={`${ids.password}-error`}>
              {errors?.password}
            </FieldError>
          </Field>

          <Field data-invalid={errors?.confirmPassword ? true : undefined}>
            <FieldLabel htmlFor={ids.confirmPassword}>
              Confirmar senha
            </FieldLabel>
            <InputGroup className="h-11">
              <InputGroupAddon>
                <LockIcon />
              </InputGroupAddon>
              <InputGroupInput
                id={ids.confirmPassword}
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                aria-invalid={errors?.confirmPassword ? true : undefined}
                aria-describedby={
                  errors?.confirmPassword
                    ? `${ids.confirmPassword}-error`
                    : undefined
                }
              />
            </InputGroup>
            <FieldError id={`${ids.confirmPassword}-error`}>
              {errors?.confirmPassword}
            </FieldError>
          </Field>
        </div>

        <Field
          orientation="horizontal"
          data-invalid={errors?.terms ? true : undefined}
        >
          <Checkbox
            id={ids.terms}
            name="terms"
            aria-invalid={errors?.terms ? true : undefined}
            aria-describedby={errors?.terms ? `${ids.terms}-error` : undefined}
          />
          <FieldLabel htmlFor={ids.terms} className="font-normal">
            Li e aceito os termos de uso e a política de privacidade.
          </FieldLabel>
        </Field>
        <FieldError id={`${ids.terms}-error`}>{errors?.terms}</FieldError>

        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="h-11 w-full text-base"
        >
          {pending ? "Criando conta" : "Criar conta"}
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
