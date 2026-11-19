"use client";

import { PlusIcon, SendIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState, useTransition } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { submitRequestAction } from "@/lib/requests/public-actions";

type Category = {
  id: string;
  name: string;
  gender: "MALE" | "FEMALE" | "MIXED";
  minAge: number | null;
  maxAge: number | null;
  rosterMin: number;
  rosterMax: number | null;
};
type Participation = "INDIVIDUAL" | "PAIR" | "TEAM";

type Member = {
  key: number;
  name: string;
  birthDate: string;
  gender: string;
  cpf: string;
  guardianName: string;
  guardianCpf: string;
  shirtNumber: string;
  positionId: string;
  isCaptain: boolean;
};
type Staff = { key: number; name: string; role: string; contact: string };

const GENDER_LABEL = {
  MALE: "Masculino",
  FEMALE: "Feminino",
  MIXED: "Misto",
} as const;
const ROLE_LABEL = {
  COACH: "Técnico",
  ASSISTANT: "Auxiliar técnico",
  MANAGER: "Responsável",
  PHYSIO: "Preparador ou fisioterapeuta",
  OTHER: "Outro",
} as const;

const emptyMember = (key: number): Member => ({
  key,
  name: "",
  birthDate: "",
  gender: "",
  cpf: "",
  guardianName: "",
  guardianCpf: "",
  shirtNumber: "",
  positionId: "",
  isCaptain: false,
});
const initialMembers = (type: Participation) =>
  Array.from({ length: type === "PAIR" ? 2 : 1 }, (_, i) => emptyMember(i + 1));
// Module-level so the render stays pure; used only to decide whether to ask for a guardian.
const nowMs = () => Date.now();

function isMinor(birthDate: string): boolean {
  const d = new Date(`${birthDate}T00:00:00Z`);
  if (!birthDate || Number.isNaN(d.getTime())) return false;
  const limit = new Date(nowMs());
  limit.setUTCFullYear(limit.getUTCFullYear() - 18);
  return d.getTime() > limit.getTime();
}

const label = (c: Category) => {
  const age =
    c.minAge != null && c.maxAge != null
      ? `${c.minAge} a ${c.maxAge} anos`
      : c.minAge != null
        ? `${c.minAge}+ anos`
        : c.maxAge != null
          ? `até ${c.maxAge} anos`
          : null;
  return [c.name, GENDER_LABEL[c.gender], age].filter(Boolean).join(" · ");
};

export function RequestForm({
  eventId,
  participation,
  categories,
  positions,
}: {
  eventId: string;
  participation: Participation;
  categories: Category[];
  positions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [categoryId, setCategoryId] = useState(
    categories.length === 1 ? categories[0].id : "",
  );
  const [teamName, setTeamName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [members, setMembers] = useState<Member[]>(() =>
    initialMembers(participation),
  );
  const [staff, setStaff] = useState<Staff[]>([]);
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const nextKey = useRef(100);

  const category = categories.find((c) => c.id === categoryId);
  const team = participation === "TEAM";
  const fixedCount = participation !== "TEAM";

  // Next keeps the state of screens you leave: clear everything when leaving.
  const reset = useRef(() => {});
  useLayoutEffect(() => {
    reset.current = () => {
      setCategoryId(categories.length === 1 ? categories[0].id : "");
      setTeamName("");
      setContactName("");
      setContactEmail("");
      setContactPhone("");
      setNotes("");
      setMembers(initialMembers(participation));
      setStaff([]);
      setConsent(false);
      setWebsite("");
      setError(null);
      setErrors({});
    };
  });
  useLayoutEffect(() => () => reset.current(), []);

  const setMember = (key: number, patch: Partial<Member>) =>
    setMembers((list) =>
      list.map((m) => (m.key === key ? { ...m, ...patch } : m)),
    );
  const setCaptain = (key: number, on: boolean) =>
    setMembers((list) =>
      list.map((m) => ({ ...m, isCaptain: m.key === key ? on : false })),
    );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrors({});
    startTransition(async () => {
      const result = await submitRequestAction(eventId, {
        categoryId,
        teamName,
        contactName,
        contactEmail,
        contactPhone,
        notes,
        consent,
        website,
        members: members.map(({ key, ...rest }) => (void key, rest)),
        staff: staff.map(({ key, ...rest }) => (void key, rest)),
      });
      if (result.ok && result.token) {
        reset.current();
        router.push(`/register/status/${result.token}`);
        return;
      }
      setError(result.error ?? "Não foi possível enviar o pedido.");
      setErrors(result.fieldErrors ?? {});
    });
  }

  const err = (key: string) =>
    errors[key] ? <FieldError>{errors[key]}</FieldError> : null;
  const invalid = (key: string) => (errors[key] ? true : undefined);

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-8">
      {/* Hidden from people; simple robots fill it. */}
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
      >
        <label>
          Não preencha este campo
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      <Section title={team ? "Time e categoria" : "Categoria"}>
        <Field data-invalid={invalid("categoryId")}>
          <FieldLabel htmlFor="rq-category">Categoria</FieldLabel>
          <NativeSelect
            id="rq-category"
            className="w-full"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            aria-invalid={invalid("categoryId")}
          >
            <NativeSelectOption value="">
              Escolha a categoria
            </NativeSelectOption>
            {categories.map((c) => (
              <NativeSelectOption key={c.id} value={c.id}>
                {label(c)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {category && team ? (
            <FieldDescription>
              Elenco de {category.rosterMin}
              {category.rosterMax != null
                ? ` a ${category.rosterMax}`
                : " ou mais"}{" "}
              atletas.
            </FieldDescription>
          ) : null}
          {err("categoryId")}
        </Field>
        {team ? (
          <Field data-invalid={invalid("teamName")}>
            <FieldLabel htmlFor="rq-team">Nome do time</FieldLabel>
            <Input
              id="rq-team"
              value={teamName}
              maxLength={60}
              onChange={(e) => setTeamName(e.target.value)}
              className="h-10"
              aria-invalid={invalid("teamName")}
            />
            {err("teamName")}
          </Field>
        ) : null}
      </Section>

      <Section
        title="Seu contato"
        hint="Você recebe a resposta da organização neste e-mail."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={invalid("contactName")}>
            <FieldLabel htmlFor="rq-contact-name">Seu nome</FieldLabel>
            <Input
              id="rq-contact-name"
              value={contactName}
              maxLength={120}
              onChange={(e) => setContactName(e.target.value)}
              className="h-10"
              autoComplete="name"
              aria-invalid={invalid("contactName")}
            />
            {err("contactName")}
          </Field>
          <Field data-invalid={invalid("contactEmail")}>
            <FieldLabel htmlFor="rq-contact-email">Seu e-mail</FieldLabel>
            <Input
              id="rq-contact-email"
              type="email"
              value={contactEmail}
              maxLength={120}
              onChange={(e) => setContactEmail(e.target.value)}
              className="h-10"
              autoComplete="email"
              aria-invalid={invalid("contactEmail")}
            />
            {err("contactEmail")}
          </Field>
          <Field data-invalid={invalid("contactPhone")}>
            <FieldLabel htmlFor="rq-contact-phone">
              Telefone com DDD (opcional)
            </FieldLabel>
            <Input
              id="rq-contact-phone"
              type="tel"
              value={contactPhone}
              maxLength={20}
              onChange={(e) => setContactPhone(e.target.value)}
              className="h-10"
              autoComplete="tel"
              aria-invalid={invalid("contactPhone")}
            />
            {err("contactPhone")}
          </Field>
        </div>
      </Section>

      <Section
        title={
          participation === "TEAM"
            ? "Atletas do elenco"
            : participation === "PAIR"
              ? "Atletas da dupla"
              : "Atleta"
        }
        hint="Maiores de 18 anos informam o CPF. Para menores, informe o responsável."
      >
        {errors.members ? (
          <Alert variant="destructive">
            <AlertDescription>{errors.members}</AlertDescription>
          </Alert>
        ) : null}
        {errors.captain ? <FieldError>{errors.captain}</FieldError> : null}
        <ol className="flex flex-col gap-4">
          {members.map((m, i) => {
            const minor = isMinor(m.birthDate);
            const k = (f: string) => errors[`members.${i}.${f}`];
            return (
              <li
                key={m.key}
                className="liquid-card flex flex-col gap-4 rounded-xl p-4"
                aria-label={`Atleta ${i + 1}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Atleta {i + 1}</span>
                  {!fixedCount && members.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Remover atleta ${i + 1}`}
                      onClick={() =>
                        setMembers((l) => l.filter((x) => x.key !== m.key))
                      }
                    >
                      <Trash2Icon data-icon="inline-start" />
                      Remover
                    </Button>
                  ) : null}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field data-invalid={k("name") ? true : undefined}>
                    <FieldLabel htmlFor={`rq-m${m.key}-name`}>
                      Nome completo
                    </FieldLabel>
                    <Input
                      id={`rq-m${m.key}-name`}
                      value={m.name}
                      maxLength={120}
                      onChange={(e) =>
                        setMember(m.key, { name: e.target.value })
                      }
                      className="h-10"
                      aria-invalid={k("name") ? true : undefined}
                    />
                    {k("name") ? <FieldError>{k("name")}</FieldError> : null}
                  </Field>
                  <Field data-invalid={k("birthDate") ? true : undefined}>
                    <FieldLabel htmlFor={`rq-m${m.key}-birth`}>
                      Data de nascimento
                    </FieldLabel>
                    <Input
                      id={`rq-m${m.key}-birth`}
                      type="date"
                      value={m.birthDate}
                      onChange={(e) =>
                        setMember(m.key, { birthDate: e.target.value })
                      }
                      className="h-10"
                      aria-invalid={k("birthDate") ? true : undefined}
                    />
                    {k("birthDate") ? (
                      <FieldError>{k("birthDate")}</FieldError>
                    ) : null}
                  </Field>
                  <Field data-invalid={k("gender") ? true : undefined}>
                    <FieldLabel htmlFor={`rq-m${m.key}-gender`}>
                      Sexo
                    </FieldLabel>
                    <NativeSelect
                      id={`rq-m${m.key}-gender`}
                      className="w-full"
                      value={m.gender}
                      onChange={(e) =>
                        setMember(m.key, { gender: e.target.value })
                      }
                      aria-invalid={k("gender") ? true : undefined}
                    >
                      <NativeSelectOption value="">Escolha</NativeSelectOption>
                      <NativeSelectOption value="MALE">
                        Masculino
                      </NativeSelectOption>
                      <NativeSelectOption value="FEMALE">
                        Feminino
                      </NativeSelectOption>
                      <NativeSelectOption value="OTHER">
                        Outro
                      </NativeSelectOption>
                    </NativeSelect>
                    {k("gender") ? (
                      <FieldError>{k("gender")}</FieldError>
                    ) : null}
                  </Field>
                  <Field data-invalid={k("cpf") ? true : undefined}>
                    <FieldLabel htmlFor={`rq-m${m.key}-cpf`}>
                      {minor ? "CPF do atleta (opcional)" : "CPF"}
                    </FieldLabel>
                    <Input
                      id={`rq-m${m.key}-cpf`}
                      inputMode="numeric"
                      value={m.cpf}
                      maxLength={14}
                      onChange={(e) =>
                        setMember(m.key, { cpf: e.target.value })
                      }
                      className="h-10"
                      aria-invalid={k("cpf") ? true : undefined}
                    />
                    {k("cpf") ? <FieldError>{k("cpf")}</FieldError> : null}
                  </Field>
                  {minor ? (
                    <>
                      <Field
                        data-invalid={k("guardianName") ? true : undefined}
                      >
                        <FieldLabel htmlFor={`rq-m${m.key}-gname`}>
                          Nome do responsável
                        </FieldLabel>
                        <Input
                          id={`rq-m${m.key}-gname`}
                          value={m.guardianName}
                          maxLength={120}
                          onChange={(e) =>
                            setMember(m.key, { guardianName: e.target.value })
                          }
                          className="h-10"
                          aria-invalid={k("guardianName") ? true : undefined}
                        />
                        {k("guardianName") ? (
                          <FieldError>{k("guardianName")}</FieldError>
                        ) : null}
                      </Field>
                      <Field data-invalid={k("guardianCpf") ? true : undefined}>
                        <FieldLabel htmlFor={`rq-m${m.key}-gcpf`}>
                          CPF do responsável
                        </FieldLabel>
                        <Input
                          id={`rq-m${m.key}-gcpf`}
                          inputMode="numeric"
                          value={m.guardianCpf}
                          maxLength={14}
                          onChange={(e) =>
                            setMember(m.key, { guardianCpf: e.target.value })
                          }
                          className="h-10"
                          aria-invalid={k("guardianCpf") ? true : undefined}
                        />
                        {k("guardianCpf") ? (
                          <FieldError>{k("guardianCpf")}</FieldError>
                        ) : null}
                      </Field>
                    </>
                  ) : null}
                  <Field data-invalid={k("shirtNumber") ? true : undefined}>
                    <FieldLabel htmlFor={`rq-m${m.key}-shirt`}>
                      Camisa (opcional)
                    </FieldLabel>
                    <Input
                      id={`rq-m${m.key}-shirt`}
                      inputMode="numeric"
                      value={m.shirtNumber}
                      maxLength={3}
                      onChange={(e) =>
                        setMember(m.key, { shirtNumber: e.target.value })
                      }
                      className="h-10"
                      aria-invalid={k("shirtNumber") ? true : undefined}
                    />
                    {k("shirtNumber") ? (
                      <FieldError>{k("shirtNumber")}</FieldError>
                    ) : null}
                  </Field>
                  {positions.length > 0 ? (
                    <Field>
                      <FieldLabel htmlFor={`rq-m${m.key}-pos`}>
                        Posição (opcional)
                      </FieldLabel>
                      <NativeSelect
                        id={`rq-m${m.key}-pos`}
                        className="w-full"
                        value={m.positionId}
                        onChange={(e) =>
                          setMember(m.key, { positionId: e.target.value })
                        }
                      >
                        <NativeSelectOption value="">
                          Sem posição
                        </NativeSelectOption>
                        {positions.map((p) => (
                          <NativeSelectOption key={p.id} value={p.id}>
                            {p.name}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </Field>
                  ) : null}
                </div>
                {team ? (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={m.isCaptain}
                      onCheckedChange={(v) => setCaptain(m.key, v === true)}
                      aria-label={`Atleta ${i + 1} é o capitão`}
                    />
                    Capitão do time
                  </label>
                ) : null}
              </li>
            );
          })}
        </ol>
        {!fixedCount ? (
          <Button
            type="button"
            variant="outline"
            className="self-start"
            disabled={members.length >= 60}
            onClick={() =>
              setMembers((l) => [...l, emptyMember(nextKey.current++)])
            }
          >
            <PlusIcon data-icon="inline-start" />
            Adicionar atleta
          </Button>
        ) : null}
      </Section>

      {team ? (
        <Section
          title="Comissão técnica"
          hint="Opcional: técnico, auxiliar e outras pessoas do time."
        >
          {staff.map((s, i) => (
            <div
              key={s.key}
              className="grid gap-3 sm:grid-cols-[1fr_12rem_1fr_auto] sm:items-end"
              role="group"
              aria-label={`Comissão ${i + 1}`}
            >
              <Field
                data-invalid={errors[`staff.${i}.name`] ? true : undefined}
              >
                <FieldLabel htmlFor={`rq-s${s.key}-name`}>Nome</FieldLabel>
                <Input
                  id={`rq-s${s.key}-name`}
                  value={s.name}
                  maxLength={80}
                  onChange={(e) =>
                    setStaff((l) =>
                      l.map((x) =>
                        x.key === s.key ? { ...x, name: e.target.value } : x,
                      ),
                    )
                  }
                  className="h-10"
                />
                {errors[`staff.${i}.name`] ? (
                  <FieldError>{errors[`staff.${i}.name`]}</FieldError>
                ) : null}
              </Field>
              <Field>
                <FieldLabel htmlFor={`rq-s${s.key}-role`}>Função</FieldLabel>
                <NativeSelect
                  id={`rq-s${s.key}-role`}
                  className="w-full"
                  value={s.role}
                  onChange={(e) =>
                    setStaff((l) =>
                      l.map((x) =>
                        x.key === s.key ? { ...x, role: e.target.value } : x,
                      ),
                    )
                  }
                >
                  {Object.entries(ROLE_LABEL).map(([v, l]) => (
                    <NativeSelectOption key={v} value={v}>
                      {l}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor={`rq-s${s.key}-contact`}>
                  Contato (opcional)
                </FieldLabel>
                <Input
                  id={`rq-s${s.key}-contact`}
                  value={s.contact}
                  maxLength={80}
                  onChange={(e) =>
                    setStaff((l) =>
                      l.map((x) =>
                        x.key === s.key ? { ...x, contact: e.target.value } : x,
                      ),
                    )
                  }
                  className="h-10"
                />
              </Field>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remover pessoa ${i + 1} da comissão`}
                onClick={() =>
                  setStaff((l) => l.filter((x) => x.key !== s.key))
                }
              >
                <Trash2Icon />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            className="self-start"
            disabled={staff.length >= 10}
            onClick={() =>
              setStaff((l) => [
                ...l,
                {
                  key: nextKey.current++,
                  name: "",
                  role: "COACH",
                  contact: "",
                },
              ])
            }
          >
            <PlusIcon data-icon="inline-start" />
            Adicionar pessoa
          </Button>
        </Section>
      ) : null}

      <Section
        title="Observações"
        hint="Opcional: algo que a organização deva saber."
      >
        <Field>
          <FieldLabel htmlFor="rq-notes" className="sr-only">
            Observações
          </FieldLabel>
          <Textarea
            id="rq-notes"
            value={notes}
            maxLength={1000}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </Field>
      </Section>

      <div className="flex flex-col gap-4 border-t border-white/10 pt-6">
        <Field data-invalid={invalid("consent")}>
          <label className="flex items-start gap-3 text-sm leading-relaxed">
            <Checkbox
              checked={consent}
              onCheckedChange={(v) => setConsent(v === true)}
              aria-label="Declaração de autorização"
              className="mt-0.5"
            />
            <span>
              Declaro que tenho autorização das pessoas inscritas (e dos
              responsáveis, no caso de menores) para informar estes dados, e li
              a{" "}
              <Link href="/privacy" target="_blank" className="underline">
                Política de Privacidade
              </Link>
              . Os dados são usados só para esta inscrição.
            </span>
          </label>
          {err("consent")}
        </Field>
        {error ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <Button
          type="submit"
          size="lg"
          className="h-11 self-start px-6"
          disabled={pending}
        >
          {pending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <SendIcon data-icon="inline-start" />
          )}
          Enviar pedido de inscrição
        </Button>
        <p className="text-sm text-muted-foreground">
          O pedido só vira inscrição depois que a organização aprovar.
        </p>
      </div>
    </form>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
          {title}
        </h2>
        {hint ? (
          <p className="mt-1.5 text-sm text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
