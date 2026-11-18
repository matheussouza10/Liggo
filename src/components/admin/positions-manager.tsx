"use client";

import { PencilIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useActionState,
  useId,
  useState,
  useTransition,
  type FormEvent,
} from "react";
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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  savePositionAction,
  setPositionActiveAction,
} from "@/lib/catalog/position-actions";
import type { CatalogFormState } from "@/lib/catalog/types";

type SportGroup = {
  category: string;
  options: { id: string; name: string; positions: number }[];
};
type Position = {
  id: string;
  name: string;
  abbreviation: string | null;
  active: boolean;
};

export function PositionsManager({
  groups,
  sportId,
  positions,
}: {
  groups: SportGroup[];
  sportId: string;
  positions: Position[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Position | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startToggle] = useTransition();

  const toggle = (p: Position, active: boolean) =>
    startToggle(async () => {
      await setPositionActiveAction(p.id, active);
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <NativeSelect
          aria-label="Modalidade"
          className="w-full sm:w-80"
          value={sportId}
          onChange={(e) =>
            router.push(
              e.target.value
                ? `/admin/positions?sport=${e.target.value}`
                : "/admin/positions",
            )
          }
        >
          <NativeSelectOption value="">Escolha a modalidade</NativeSelectOption>
          {groups.map((g) => (
            <NativeSelectOptGroup key={g.category} label={g.category}>
              {g.options.map((o) => (
                <NativeSelectOption key={o.id} value={o.id}>
                  {o.name}
                  {o.positions ? ` (${o.positions})` : ""}
                </NativeSelectOption>
              ))}
            </NativeSelectOptGroup>
          ))}
        </NativeSelect>
        {sportId ? (
          <Button
            className="h-10"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <PlusIcon data-icon="inline-start" />
            Nova posição
          </Button>
        ) : null}
      </div>

      {!sportId ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Escolha uma modalidade</EmptyTitle>
            <EmptyDescription>
              As posições aparecem no elenco da inscrição. O número entre
              parênteses é quantas já estão cadastradas.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="liquid-card overflow-hidden rounded-xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Posição</TableHead>
                <TableHead className="w-28">Sigla</TableHead>
                <TableHead className="w-24">Ativa</TableHead>
                <TableHead className="w-16 text-right">
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Nenhuma posição nesta modalidade ainda.
                  </TableCell>
                </TableRow>
              ) : (
                positions.map((p) => (
                  <TableRow
                    key={p.id}
                    className={p.active ? undefined : "opacity-60"}
                  >
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      {p.abbreviation ? (
                        <Badge variant="secondary">{p.abbreviation}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={p.active}
                        disabled={pending}
                        onCheckedChange={(v) => toggle(p, v)}
                        aria-label={`${p.active ? "Desativar" : "Ativar"} ${p.name}`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Editar ${p.name}`}
                        onClick={() => {
                          setEditing(p);
                          setOpen(true);
                        }}
                      >
                        <PencilIcon />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="theme-dark sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar posição" : "Nova posição"}
            </DialogTitle>
            <DialogDescription>
              Aparece na escolha de posição do elenco dos eventos desta
              modalidade.
            </DialogDescription>
          </DialogHeader>
          <PositionForm
            key={editing?.id ?? "new"}
            sportId={sportId}
            position={editing}
            onDone={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PositionForm({
  sportId,
  position,
  onDone,
}: {
  sportId: string;
  position: Position | null;
  onDone: () => void;
}) {
  const id = useId();
  const [state, formAction, pending] = useActionState(
    async (prev: CatalogFormState, formData: FormData) => {
      const result = await savePositionAction(prev, formData);
      if (result.ok) onDone();
      return result;
    },
    {} as CatalogFormState,
  );
  const errors = state.fieldErrors ?? {};
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  };

  return (
    <form onSubmit={submit} noValidate>
      <input type="hidden" name="sportId" value={sportId} />
      {position ? <input type="hidden" name="id" value={position.id} /> : null}
      <FieldGroup>
        {state.error ? <FieldError>{state.error}</FieldError> : null}
        <Field data-invalid={errors.name ? true : undefined}>
          <FieldLabel htmlFor={`${id}-name`}>Nome</FieldLabel>
          <Input
            id={`${id}-name`}
            name="name"
            defaultValue={state.values?.name ?? position?.name ?? ""}
            maxLength={40}
            className="h-10"
            aria-invalid={errors.name ? true : undefined}
          />
          <FieldError>{errors.name}</FieldError>
        </Field>
        <Field data-invalid={errors.abbreviation ? true : undefined}>
          <FieldLabel htmlFor={`${id}-abbr`}>Sigla (opcional)</FieldLabel>
          <Input
            id={`${id}-abbr`}
            name="abbreviation"
            defaultValue={
              state.values?.abbreviation ?? position?.abbreviation ?? ""
            }
            maxLength={6}
            className="h-10 uppercase"
            aria-invalid={errors.abbreviation ? true : undefined}
          />
          <FieldError>{errors.abbreviation}</FieldError>
        </Field>
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
