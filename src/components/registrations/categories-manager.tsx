"use client";

import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import {
  startTransition,
  useActionState,
  useId,
  useState,
  type FormEvent,
} from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteCategoryAction,
  saveCategoryAction,
  type CategoryFormState,
} from "@/lib/registrations/category-actions";
import { centsToInput, formatMoney } from "@/lib/payments/money";
import { CATEGORY_GENDER_LABELS } from "@/lib/registrations/constants";

export type CategoryRow = {
  id: string;
  name: string;
  gender: keyof typeof CATEGORY_GENDER_LABELS;
  minAge: number | null;
  maxAge: number | null;
  rosterMin: number;
  rosterMax: number | null;
  registrations: number;
  feeCents: number;
};

function ageText(c: CategoryRow): string {
  if (c.minAge != null && c.maxAge != null)
    return `${c.minAge} a ${c.maxAge} anos`;
  if (c.minAge != null) return `A partir de ${c.minAge} anos`;
  if (c.maxAge != null) return `Até ${c.maxAge} anos`;
  return "Sem limite";
}

function rosterText(c: CategoryRow): string {
  if (c.rosterMax != null)
    return c.rosterMin === c.rosterMax
      ? `${c.rosterMin}`
      : `${c.rosterMin} a ${c.rosterMax}`;
  return c.rosterMin > 1 ? `Mínimo ${c.rosterMin}` : "Sem limite";
}

export function CategoriesManager({
  eventId,
  rows,
}: {
  eventId: string;
  rows: CategoryRow[];
}) {
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState<CategoryRow | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removePending, setRemovePending] = useState(false);

  const confirmRemove = () => {
    if (!removing) return;
    setRemovePending(true);
    setRemoveError(null);
    startTransition(async () => {
      const result = await deleteCategoryAction(eventId, removing.id);
      setRemovePending(false);
      if (result.ok) setRemoving(null);
      else setRemoveError(result.error ?? "Não foi possível excluir.");
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          className="h-10"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <PlusIcon data-icon="inline-start" />
          Nova categoria
        </Button>
      </div>

      <div className="liquid-card overflow-hidden rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead>Sexo</TableHead>
              <TableHead className="hidden md:table-cell">Idade</TableHead>
              <TableHead className="hidden lg:table-cell">Elenco</TableHead>
              <TableHead className="hidden w-28 md:table-cell">Taxa</TableHead>
              <TableHead className="w-28">Inscrições</TableHead>
              <TableHead className="w-28 text-right">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {CATEGORY_GENDER_LABELS[c.gender]}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {ageText(c)}
                </TableCell>
                <TableCell className="hidden tabular-nums lg:table-cell">
                  {rosterText(c)}
                </TableCell>
                <TableCell className="hidden tabular-nums md:table-cell">
                  {c.feeCents > 0 ? formatMoney(c.feeCents) : "Grátis"}
                </TableCell>
                <TableCell className="tabular-nums">
                  {c.registrations}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Editar ${c.name}`}
                    onClick={() => {
                      setEditing(c);
                      setOpen(true);
                    }}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Excluir ${c.name}`}
                    onClick={() => {
                      setRemoveError(null);
                      setRemoving(c);
                    }}
                  >
                    <Trash2Icon />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="theme-dark max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar categoria" : "Nova categoria"}
            </DialogTitle>
            <DialogDescription>
              Define quem pode se inscrever. A idade é medida na data de início
              do evento.
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            key={editing?.id ?? "new"}
            eventId={eventId}
            category={editing}
            onDone={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={removing !== null}
        onOpenChange={(v) => !v && setRemoving(null)}
      >
        <AlertDialogContent className="theme-dark">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir a categoria “{removing?.name}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Só é possível excluir categorias sem inscrições.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {removeError ? (
            <p className="text-sm text-destructive">{removeError}</p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmRemove();
              }}
              disabled={removePending}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CategoryForm({
  eventId,
  category,
  onDone,
}: {
  eventId: string;
  category: CategoryRow | null;
  onDone: () => void;
}) {
  const id = useId();
  const [state, formAction, pending] = useActionState(
    async (prev: CategoryFormState, formData: FormData) => {
      const result = await saveCategoryAction(
        eventId,
        category?.id ?? null,
        prev,
        formData,
      );
      if (result.ok) onDone();
      return result;
    },
    {} as CategoryFormState,
  );
  const v = state.values;
  const errors = state.fieldErrors ?? {};
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  };
  const field = (key: string) => ({
    "aria-invalid": errors[key] ? (true as const) : undefined,
  });

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        {state.error ? <FieldError>{state.error}</FieldError> : null}
        <Field data-invalid={errors.name ? true : undefined}>
          <FieldLabel htmlFor={`${id}-name`}>Nome</FieldLabel>
          <Input
            id={`${id}-name`}
            name="name"
            defaultValue={v?.name ?? category?.name ?? ""}
            maxLength={60}
            placeholder="Sub-15 Masculino"
            className="h-10"
            {...field("name")}
          />
          <FieldError>{errors.name}</FieldError>
        </Field>
        <Field data-invalid={errors.gender ? true : undefined}>
          <FieldLabel htmlFor={`${id}-gender`}>Sexo</FieldLabel>
          <NativeSelect
            id={`${id}-gender`}
            name="gender"
            defaultValue={v?.gender ?? category?.gender ?? "MIXED"}
            className="w-full"
            {...field("gender")}
          >
            {(
              Object.keys(
                CATEGORY_GENDER_LABELS,
              ) as (keyof typeof CATEGORY_GENDER_LABELS)[]
            ).map((g) => (
              <NativeSelectOption key={g} value={g}>
                {CATEGORY_GENDER_LABELS[g]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError>{errors.gender}</FieldError>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={errors.minAge ? true : undefined}>
            <FieldLabel htmlFor={`${id}-min`}>Idade mínima</FieldLabel>
            <Input
              id={`${id}-min`}
              name="minAge"
              type="number"
              inputMode="numeric"
              min={0}
              max={120}
              defaultValue={v?.minAge ?? category?.minAge ?? ""}
              placeholder="Sem limite"
              className="h-10 tabular-nums"
              {...field("minAge")}
            />
            <FieldError>{errors.minAge}</FieldError>
          </Field>
          <Field data-invalid={errors.maxAge ? true : undefined}>
            <FieldLabel htmlFor={`${id}-max`}>Idade máxima</FieldLabel>
            <Input
              id={`${id}-max`}
              name="maxAge"
              type="number"
              inputMode="numeric"
              min={0}
              max={120}
              defaultValue={v?.maxAge ?? category?.maxAge ?? ""}
              placeholder="Sem limite"
              className="h-10 tabular-nums"
              {...field("maxAge")}
            />
            <FieldError>{errors.maxAge}</FieldError>
          </Field>
          <Field data-invalid={errors.rosterMin ? true : undefined}>
            <FieldLabel htmlFor={`${id}-rmin`}>Elenco mínimo</FieldLabel>
            <Input
              id={`${id}-rmin`}
              name="rosterMin"
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              defaultValue={v?.rosterMin ?? category?.rosterMin ?? 1}
              className="h-10 tabular-nums"
              {...field("rosterMin")}
            />
            <FieldError>{errors.rosterMin}</FieldError>
          </Field>
          <Field data-invalid={errors.rosterMax ? true : undefined}>
            <FieldLabel htmlFor={`${id}-rmax`}>Elenco máximo</FieldLabel>
            <Input
              id={`${id}-rmax`}
              name="rosterMax"
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              defaultValue={v?.rosterMax ?? category?.rosterMax ?? ""}
              placeholder="Sem limite"
              className="h-10 tabular-nums"
              {...field("rosterMax")}
            />
            <FieldError>{errors.rosterMax}</FieldError>
          </Field>
        </div>
        <Field data-invalid={errors.fee ? true : undefined}>
          <FieldLabel htmlFor={`${id}-fee`}>Taxa de inscrição (R$)</FieldLabel>
          <Input
            id={`${id}-fee`}
            name="fee"
            inputMode="decimal"
            defaultValue={
              v?.fee ??
              (category?.feeCents ? centsToInput(category.feeCents) : "")
            }
            placeholder="Grátis"
            className="h-10 tabular-nums"
            {...field("fee")}
          />
          <FieldError>{errors.fee}</FieldError>
          <FieldDescription>
            Cobrada na conta de recebimento da organização quando a inscrição é
            aprovada.
          </FieldDescription>
        </Field>
        <FieldDescription>
          O tamanho do elenco vale para eventos por equipe.
        </FieldDescription>
      </FieldGroup>
      <DialogFooter className="mt-6">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          Salvar
        </Button>
      </DialogFooter>
    </form>
  );
}
