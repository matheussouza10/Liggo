"use client";

import { CircleAlertIcon, CircleCheckIcon } from "lucide-react";
import { useActionState, useId, type ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { FormState } from "@/lib/settings/actions";

type FieldDef = {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
  defaultValue?: string;
  maxLength?: number;
  disabled?: boolean;
};

/** A small settings form: fields, a submit button, an error or success message. */
export function SimpleForm({
  action,
  fields,
  submit,
  disabled,
  children,
}: {
  action: (prev: FormState, data: FormData) => Promise<FormState>;
  fields: FieldDef[];
  submit: string;
  disabled?: boolean;
  children?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  const id = useId();
  return (
    // A new key after each success clears the fields (password forms).
    <form
      key={state.done ?? 0}
      action={formAction}
      noValidate
      className="max-w-md"
    >
      <FieldGroup>
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
        {fields.map((f) => (
          <Field
            key={f.name}
            data-invalid={state.fieldErrors?.[f.name] ? true : undefined}
          >
            <FieldLabel htmlFor={`${id}-${f.name}`}>{f.label}</FieldLabel>
            <Input
              id={`${id}-${f.name}`}
              name={f.name}
              type={f.type ?? "text"}
              autoComplete={f.autoComplete}
              defaultValue={state.values?.[f.name] ?? f.defaultValue}
              maxLength={f.maxLength}
              disabled={f.disabled || disabled}
              className="h-10"
              aria-invalid={state.fieldErrors?.[f.name] ? true : undefined}
            />
            {f.hint ? <FieldDescription>{f.hint}</FieldDescription> : null}
            <FieldError>{state.fieldErrors?.[f.name]}</FieldError>
          </Field>
        ))}
        {children}
        <div>
          <Button type="submit" disabled={pending || disabled}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {submit}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
