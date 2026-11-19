"use client";

import {
  CircleAlertIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import {
  deleteRegistrationAction,
  saveRegistrationAction,
} from "@/lib/registrations/actions";
import {
  CATEGORY_GENDER_LABELS,
  REGISTRATION_LIMITS,
  STAFF_ROLE_LABELS,
} from "@/lib/registrations/constants";
import { ineligibleReason } from "@/lib/registrations/eligibility";
import { cn } from "@/lib/utils";

type Category = {
  id: string;
  name: string;
  gender: "MALE" | "FEMALE" | "MIXED";
  minAge: number | null;
  maxAge: number | null;
  rosterMin: number;
  rosterMax: number | null;
};
type AthleteOption = {
  id: string;
  name: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  birthDate: string;
};
type Member = {
  athleteId: string;
  shirt: string;
  positionId: string;
  isCaptain: boolean;
};
type Staff = {
  name: string;
  role: keyof typeof STAFF_ROLE_LABELS;
  contact: string;
};

type Props = {
  eventId: string;
  eventStart: string;
  participationType: "INDIVIDUAL" | "PAIR" | "TEAM";
  categories: Category[];
  athletes: AthleteOption[];
  teams: { id: string; name: string }[];
  positions: { id: string; name: string; abbreviation: string | null }[];
  takenAthletes: { athleteId: string; categoryId: string }[];
  takenTeams: { teamId: string; categoryId: string }[];
  initial?: {
    registrationId: string;
    categoryId: string;
    teamId: string | null;
    members: Member[];
    staff: Staff[];
  };
};

const LIMIT_TEXT = {
  INDIVIDUAL: "1 atleta",
  PAIR: "2 atletas",
  TEAM: "elenco",
} as const;

export function RegistrationBuilder({
  eventId,
  eventStart,
  participationType,
  categories,
  athletes,
  teams,
  positions,
  takenAthletes,
  takenTeams,
  initial,
}: Props) {
  const editing = Boolean(initial);
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? categories[0]?.id ?? "",
  );
  const [teamId, setTeamId] = useState(initial?.teamId ?? "");
  const [members, setMembers] = useState<Member[]>(initial?.members ?? []);
  const [staff, setStaff] = useState<Staff[]>(initial?.staff ?? []);
  const [choice, setChoice] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const category = categories.find((c) => c.id === categoryId);
  const start = useMemo(
    () => new Date(`${eventStart}T00:00:00.000Z`),
    [eventStart],
  );
  const byId = useMemo(
    () => new Map(athletes.map((a) => [a.id, a])),
    [athletes],
  );

  const reasonFor = (a: AthleteOption): string | null =>
    category
      ? ineligibleReason(
          category,
          {
            gender: a.gender,
            birthDate: new Date(`${a.birthDate}T00:00:00.000Z`),
          },
          start,
        )
      : null;
  const takenIn = (athleteId: string) =>
    takenAthletes.some(
      (t) => t.athleteId === athleteId && t.categoryId === categoryId,
    );
  const teamTaken = (id: string) =>
    takenTeams.some((t) => t.teamId === id && t.categoryId === categoryId);

  const max =
    participationType === "INDIVIDUAL"
      ? 1
      : participationType === "PAIR"
        ? 2
        : (category?.rosterMax ?? REGISTRATION_LIMITS.maxMembers);
  const min =
    participationType === "INDIVIDUAL"
      ? 1
      : participationType === "PAIR"
        ? 2
        : (category?.rosterMin ?? 1);
  const full = members.length >= max;

  const available = athletes.filter(
    (a) => !members.some((m) => m.athleteId === a.id),
  );
  const optionLabel = (a: AthleteOption) => {
    const reason = reasonFor(a);
    if (takenIn(a.id))
      return {
        text: `${a.name} (já inscrito nesta categoria)`,
        disabled: true,
      };
    if (reason)
      return {
        text: `${a.name} (fora da categoria: ${reason})`,
        disabled: true,
      };
    return { text: a.name, disabled: false };
  };

  const addMember = () => {
    if (!choice || full) return;
    setMembers([
      ...members,
      { athleteId: choice, shirt: "", positionId: "", isCaptain: false },
    ]);
    setChoice("");
  };
  const updateMember = (id: string, changes: Partial<Member>) =>
    setMembers(
      members.map((m) => (m.athleteId === id ? { ...m, ...changes } : m)),
    );
  const setCaptain = (id: string) =>
    setMembers(members.map((m) => ({ ...m, isCaptain: m.athleteId === id })));

  const payload = () => ({
    categoryId,
    teamId: participationType === "TEAM" ? teamId || null : null,
    members: members.map((m) => ({
      athleteId: m.athleteId,
      shirtNumber: m.shirt.trim() === "" ? null : Number(m.shirt),
      positionId: m.positionId || null,
      isCaptain: participationType === "TEAM" && m.isCaptain,
    })),
    staff: staff.map((s) => ({
      name: s.name,
      role: s.role,
      contact: s.contact,
    })),
  });

  const router = useRouter();
  const listUrl = `/events/${eventId}/registrations`;

  // Back to the state of a fresh visit. The router keeps the state of screens
  // you leave, so without this the next visit would show the last selection and
  // a button still stuck on "Salvando".
  const reset = () => {
    setCategoryId(initial?.categoryId ?? categories[0]?.id ?? "");
    setTeamId(initial?.teamId ?? "");
    setMembers(initial?.members ?? []);
    setStaff(initial?.staff ?? []);
    setChoice("");
    setErrors({});
    setFormError(null);
    setPending(false);
    setConfirmDelete(false);
  };
  const resetRef = useRef(reset);
  useEffect(() => {
    resetRef.current = reset;
  });
  // Leaving the screen (by any route) clears it. Hidden screens only drop their
  // layout effects, so this is one.
  useLayoutEffect(() => () => resetRef.current(), []);

  const save = () => {
    setPending(true);
    setFormError(null);
    startTransition(async () => {
      const result = await saveRegistrationAction(
        eventId,
        initial?.registrationId ?? null,
        payload(),
      );
      if (result?.ok) {
        reset();
        router.push(listUrl);
        return;
      }
      setPending(false);
      setErrors(result?.fieldErrors ?? {});
      setFormError(result?.error ?? "Não foi possível salvar.");
    });
  };

  const remove = () => {
    if (!initial) return;
    startTransition(async () => {
      const result = await deleteRegistrationAction(
        eventId,
        initial.registrationId,
      );
      if ("error" in result && result.error) {
        setConfirmDelete(false);
        setFormError(result.error);
        return;
      }
      reset();
      router.push(listUrl);
    });
  };

  const memberError = (id: string) => errors[`member.${id}`];

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      {formError ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Não foi possível salvar</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-5 sm:grid-cols-2">
        <Field data-invalid={errors.categoryId ? true : undefined}>
          <FieldLabel htmlFor="reg-category">Categoria</FieldLabel>
          <NativeSelect
            id="reg-category"
            className="w-full"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {categories.map((c) => (
              <NativeSelectOption key={c.id} value={c.id}>
                {c.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {category ? (
            <FieldDescription>
              {CATEGORY_GENDER_LABELS[category.gender]}
              {category.minAge != null || category.maxAge != null
                ? `, idade ${category.minAge ?? 0} a ${category.maxAge ?? "sem limite"}`
                : ""}
            </FieldDescription>
          ) : null}
          <FieldError>{errors.categoryId}</FieldError>
        </Field>

        {participationType === "TEAM" ? (
          <Field data-invalid={errors.teamId ? true : undefined}>
            <FieldLabel htmlFor="reg-team">Time</FieldLabel>
            <NativeSelect
              id="reg-team"
              className="w-full"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
            >
              <NativeSelectOption value="">Selecione o time</NativeSelectOption>
              {teams.map((t) => (
                <NativeSelectOption
                  key={t.id}
                  value={t.id}
                  disabled={teamTaken(t.id)}
                >
                  {t.name}
                  {teamTaken(t.id) ? " (já inscrito nesta categoria)" : ""}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {teams.length === 0 ? (
              <FieldDescription>
                Nenhum time ativo.{" "}
                <Link href="/teams/new">Cadastre um time</Link> primeiro.
              </FieldDescription>
            ) : null}
            <FieldError>{errors.teamId}</FieldError>
          </Field>
        ) : null}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="roster-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="roster-heading"
            className="font-display text-2xl leading-none font-bold tracking-wide uppercase"
          >
            {participationType === "TEAM"
              ? "Elenco deste evento"
              : participationType === "PAIR"
                ? "Dupla"
                : "Atleta"}
          </h2>
          <span className="text-sm text-muted-foreground tabular-nums">
            {members.length} de{" "}
            {participationType === "TEAM"
              ? category?.rosterMax != null
                ? `${min} a ${max}`
                : `mín. ${min}`
              : max}{" "}
            ({LIMIT_TEXT[participationType]})
          </span>
        </div>
        <FieldError>{errors.members}</FieldError>

        <div className="flex flex-wrap items-center gap-3">
          <NativeSelect
            aria-label="Atleta para adicionar"
            className="w-full sm:w-96"
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
            disabled={full}
          >
            <NativeSelectOption value="">
              {full ? "Elenco completo" : "Escolha um atleta"}
            </NativeSelectOption>
            {available.map((a) => {
              const o = optionLabel(a);
              return (
                <NativeSelectOption
                  key={a.id}
                  value={a.id}
                  disabled={o.disabled}
                >
                  {o.text}
                </NativeSelectOption>
              );
            })}
          </NativeSelect>
          <Button
            type="button"
            variant="outline"
            onClick={addMember}
            disabled={!choice || full}
          >
            <PlusIcon data-icon="inline-start" />
            Adicionar atleta
          </Button>
          {athletes.length === 0 ? (
            <span className="text-sm text-muted-foreground">
              Nenhum atleta na organização.{" "}
              <Link href="/athletes/new">Cadastre atletas</Link>.
            </span>
          ) : null}
        </div>

        <FieldError>{errors.shirts}</FieldError>
        <FieldError>{errors.captain}</FieldError>
        <FieldError>{errors.positions}</FieldError>

        {members.length > 0 ? (
          <RadioGroup
            value={members.find((m) => m.isCaptain)?.athleteId ?? ""}
            onValueChange={setCaptain}
            aria-label="Capitão"
            className="flex flex-col gap-2"
          >
            {members.map((m, index) => {
              const athlete = byId.get(m.athleteId);
              if (!athlete) return null;
              const reason =
                reasonFor(athlete) ??
                (takenIn(athlete.id) ? "já inscrito nesta categoria" : null);
              return (
                <div
                  key={m.athleteId}
                  className={cn(
                    "rounded-xl border bg-muted/20 p-3",
                    (reason || memberError(athlete.id)) &&
                      "border-destructive/60",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge
                      variant="secondary"
                      className="size-7 justify-center rounded-full tabular-nums"
                    >
                      {index + 1}
                    </Badge>
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">
                      {athlete.name}
                    </p>
                    <Input
                      aria-label={`Camisa de ${athlete.name}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={REGISTRATION_LIMITS.maxShirt}
                      placeholder="Camisa"
                      value={m.shirt}
                      onChange={(e) =>
                        updateMember(athlete.id, { shirt: e.target.value })
                      }
                      className="h-9 w-24 tabular-nums"
                    />
                    <NativeSelect
                      aria-label={`Posição de ${athlete.name}`}
                      className="w-44"
                      value={m.positionId}
                      onChange={(e) =>
                        updateMember(athlete.id, { positionId: e.target.value })
                      }
                    >
                      <NativeSelectOption value="">
                        {positions.length ? "Posição" : "Sem posições"}
                      </NativeSelectOption>
                      {positions.map((p) => (
                        <NativeSelectOption key={p.id} value={p.id}>
                          {p.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    {participationType === "TEAM" ? (
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem
                          value={athlete.id}
                          aria-label={`Capitão: ${athlete.name}`}
                        />
                        Capitão
                      </label>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remover ${athlete.name}`}
                      onClick={() =>
                        setMembers(
                          members.filter((x) => x.athleteId !== athlete.id),
                        )
                      }
                    >
                      <XIcon />
                    </Button>
                  </div>
                  {reason || memberError(athlete.id) ? (
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-destructive">
                      <TriangleAlertIcon className="size-4 shrink-0" />
                      {memberError(athlete.id) ??
                        `Fora da categoria: ${reason}.`}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </RadioGroup>
        ) : (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Ninguém adicionado ainda.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="staff-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="staff-heading"
            className="font-display text-2xl leading-none font-bold tracking-wide uppercase"
          >
            Comissão técnica
          </h2>
          <Button
            type="button"
            variant="outline"
            disabled={staff.length >= REGISTRATION_LIMITS.maxStaff}
            onClick={() =>
              setStaff([...staff, { name: "", role: "COACH", contact: "" }])
            }
          >
            <PlusIcon data-icon="inline-start" />
            Adicionar pessoa
          </Button>
        </div>
        {staff.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Opcional. Técnico, auxiliar e responsável pela inscrição.
          </p>
        ) : null}
        <div className="flex flex-col gap-3">
          {staff.map((s, i) => (
            <div
              key={i}
              className="grid gap-3 rounded-xl border bg-muted/20 p-3 sm:grid-cols-[1fr_12rem_1fr_auto]"
            >
              <Field
                data-invalid={errors[`staff.${i}.name`] ? true : undefined}
              >
                <FieldLabel htmlFor={`staff-name-${i}`} className="sr-only">
                  Nome
                </FieldLabel>
                <Input
                  id={`staff-name-${i}`}
                  placeholder="Nome"
                  value={s.name}
                  maxLength={80}
                  onChange={(e) =>
                    setStaff(
                      staff.map((x, j) =>
                        j === i ? { ...x, name: e.target.value } : x,
                      ),
                    )
                  }
                  className="h-9"
                />
                <FieldError>{errors[`staff.${i}.name`]}</FieldError>
              </Field>
              <NativeSelect
                aria-label={`Função da pessoa ${i + 1}`}
                className="w-full"
                value={s.role}
                onChange={(e) =>
                  setStaff(
                    staff.map((x, j) =>
                      j === i
                        ? { ...x, role: e.target.value as Staff["role"] }
                        : x,
                    ),
                  )
                }
              >
                {(
                  Object.keys(
                    STAFF_ROLE_LABELS,
                  ) as (keyof typeof STAFF_ROLE_LABELS)[]
                ).map((r) => (
                  <NativeSelectOption key={r} value={r}>
                    {STAFF_ROLE_LABELS[r]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <Input
                aria-label={`Contato da pessoa ${i + 1}`}
                placeholder="Telefone ou e-mail (opcional)"
                value={s.contact}
                maxLength={80}
                onChange={(e) =>
                  setStaff(
                    staff.map((x, j) =>
                      j === i ? { ...x, contact: e.target.value } : x,
                    ),
                  )
                }
                className="h-9"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remover pessoa ${i + 1}`}
                onClick={() => setStaff(staff.filter((_, j) => j !== i))}
              >
                <XIcon />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t pt-6">
        <Button
          type="button"
          size="lg"
          disabled={pending}
          onClick={save}
          className="h-11 px-5 text-base"
        >
          {pending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <SaveIcon data-icon="inline-start" />
          )}
          {pending ? "Salvando" : editing ? "Salvar inscrição" : "Inscrever"}
        </Button>
        <Link
          href={`/events/${eventId}/registrations`}
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "h-11 px-5 text-base",
          )}
        >
          Cancelar
        </Link>
        {editing ? (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="ml-auto h-11 text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2Icon data-icon="inline-start" />
            Excluir inscrição
          </Button>
        ) : null}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="theme-dark">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta inscrição?</AlertDialogTitle>
            <AlertDialogDescription>
              O elenco e a comissão desta inscrição serão apagados. Os atletas e
              o time continuam no cadastro e ficam livres para outra inscrição.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
