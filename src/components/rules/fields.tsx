"use client";

import { useId, type ReactNode } from "react";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { RulesInput } from "@/lib/rules/schema";
import { cn } from "@/lib/utils";

/** Shared props of every section of the editor. */
export type SectionProps = {
  rules: RulesInput;
  patch: (changes: Partial<RulesInput>) => void;
  errors: Record<string, string>;
};

type NumberFieldProps = {
  label: string;
  hint?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  nullable?: boolean;
  min?: number;
  max?: number;
  step?: number;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

/**
 * Numeric input that is uncontrolled (so typing "0," or "-" never fights the
 * state) and reports a number, or null/NaN when the box is empty. The editor
 * remounts it with a new key whenever the values are replaced from outside.
 */
export function NumberField({
  label,
  hint,
  value,
  onChange,
  nullable = false,
  min,
  max,
  step = 1,
  error,
  disabled,
  placeholder,
  className,
}: NumberFieldProps) {
  const id = useId();
  return (
    <Field data-invalid={error ? true : undefined} className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        defaultValue={value == null || Number.isNaN(value) ? "" : String(value)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          error ? `${id}-error` : hint ? `${id}-hint` : undefined
        }
        onChange={(event) => {
          const raw = event.target.value.trim();
          if (raw === "") onChange(nullable ? null : Number.NaN);
          else onChange(Number(raw.replace(",", ".")));
        }}
        className="h-10 tabular-nums"
      />
      {hint && !error ? (
        <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>
      ) : null}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </Field>
  );
}

type SwitchFieldProps = {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function SwitchField({
  label,
  description,
  checked,
  onChange,
  disabled,
}: SwitchFieldProps) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border bg-muted/30 p-4">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

/** Titled block inside a tab. */
export function Block({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <header>
        <h3 className="font-display text-xl leading-none font-bold tracking-wide uppercase">
          {title}
        </h3>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
