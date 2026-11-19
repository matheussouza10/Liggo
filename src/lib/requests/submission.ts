import { z } from "zod";
import { REGISTRATION_LIMITS } from "@/lib/registrations/constants";
import { foldName } from "@/lib/text";
import { athleteSchema } from "@/lib/people/schemas";

export const ATHLETE_FIELDS = [
  "name",
  "birthDate",
  "gender",
  "cpf",
  "email",
  "phone",
  "guardianName",
  "guardianCpf",
] as const;

const text = (max: number) =>
  z.string().trim().max(max, `Use no máximo ${max} caracteres.`);

const shape = z.object({
  categoryId: z.string().min(1, "Escolha a categoria."),
  teamName: text(60),
  contactName: text(120).min(2, "Informe o seu nome."),
  contactEmail: text(120)
    .toLowerCase()
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Informe um e-mail válido."),
  contactPhone: text(20),
  notes: text(1000),
  consent: z.literal(true, { error: "Marque a declaração para enviar." }),
  /** Honeypot: people never fill it, simple bots do. */
  website: z.string().optional(),
  members: z
    .array(z.record(z.string(), z.unknown()))
    .min(1, "Adicione ao menos um atleta.")
    .max(
      REGISTRATION_LIMITS.maxMembers,
      `Use no máximo ${REGISTRATION_LIMITS.maxMembers} atletas.`,
    ),
  staff: z
    .array(
      z.object({
        name: text(80).min(2, "Informe o nome."),
        role: z.enum(["COACH", "ASSISTANT", "MANAGER", "PHYSIO", "OTHER"]),
        contact: text(80),
      }),
    )
    .max(
      REGISTRATION_LIMITS.maxStaff,
      `Use no máximo ${REGISTRATION_LIMITS.maxStaff} pessoas na comissão.`,
    ),
});

export type SubmissionMember = {
  name: string;
  birthDate: Date;
  gender: "MALE" | "FEMALE" | "OTHER";
  cpf: string | null;
  email: string | null;
  phone: string | null;
  guardianName: string | null;
  guardianCpf: string | null;
  shirtNumber: number | null;
  positionId: string | null;
  isCaptain: boolean;
};

export type Submission = {
  categoryId: string;
  teamName: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  notes: string | null;
  members: SubmissionMember[];
  staff: {
    name: string;
    role: "COACH" | "ASSISTANT" | "MANAGER" | "PHYSIO" | "OTHER";
    contact: string | null;
  }[];
  /** Filled in by the honeypot: pretend it worked, store nothing. */
  bot: boolean;
};

export type ParseResult =
  | { ok: true; data: Submission }
  | { ok: false; fieldErrors: Record<string, string> };

const str = (v: unknown) => (typeof v === "string" ? v : "");

/**
 * Validates what a public visitor sent. Athletes follow the same rules as the
 * athlete registry (adult with CPF, minor with a guardian). `participationType`
 * decides who is asked for: a team name, a pair, or one person.
 */
export function parseSubmission(
  payload: unknown,
  participationType: "INDIVIDUAL" | "PAIR" | "TEAM",
): ParseResult {
  const top = shape.safeParse(payload);
  const errors: Record<string, string> = {};
  if (!top.success) {
    for (const issue of top.error.issues) {
      const key = issue.path.join(".") || "form";
      if (!(key in errors)) errors[key] = issue.message;
    }
  }

  // Everything below runs on the raw payload too, so one submit reports all the problems at once.
  const raw: Record<string, unknown> =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const rawMembers = Array.isArray(raw.members)
    ? raw.members.filter(
        (m): m is Record<string, unknown> => !!m && typeof m === "object",
      )
    : [];
  const teamName = str(raw.teamName).trim();
  const phoneDigits = str(raw.contactPhone).replace(/\D/g, "");

  if (participationType === "TEAM" && teamName.length < 2 && !errors.teamName)
    errors.teamName = "Informe o nome do time.";
  if (
    participationType === "INDIVIDUAL" &&
    rawMembers.length > 1 &&
    !errors.members
  )
    errors.members = "A inscrição individual tem exatamente 1 atleta.";
  if (
    participationType === "PAIR" &&
    rawMembers.length !== 2 &&
    rawMembers.length > 0 &&
    !errors.members
  )
    errors.members = "A dupla tem exatamente 2 atletas.";
  if (
    phoneDigits &&
    (phoneDigits.length < 10 || phoneDigits.length > 11) &&
    !errors.contactPhone
  )
    errors.contactPhone = "Telefone com DDD, 10 ou 11 números.";

  const members: SubmissionMember[] = [];
  rawMembers.forEach((rawMember, i) => {
    const parsed = athleteSchema.safeParse(
      Object.fromEntries(ATHLETE_FIELDS.map((k) => [k, str(rawMember[k])])),
    );
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = `members.${i}.${String(issue.path[0] ?? "form")}`;
        if (!(key in errors)) errors[key] = issue.message;
      }
      return;
    }
    const a = parsed.data;
    const shirtRaw = str(rawMember.shirtNumber).trim();
    let shirtNumber: number | null = null;
    if (shirtRaw !== "") {
      const n = Number(shirtRaw);
      if (!Number.isInteger(n) || n < 0 || n > REGISTRATION_LIMITS.maxShirt)
        errors[`members.${i}.shirtNumber`] = "Camisa de 0 a 999.";
      else shirtNumber = n;
    }
    members.push({
      name: a.name,
      birthDate: a.birthDate,
      gender: a.gender,
      cpf: a.cpf ?? null,
      email: a.email ?? null,
      phone: a.phone ?? null,
      guardianName: a.guardianName ?? null,
      guardianCpf: a.guardianCpf ?? null,
      shirtNumber,
      positionId: str(rawMember.positionId) || null,
      isCaptain: rawMember.isCaptain === true && participationType === "TEAM",
    });
  });

  // Duplicates inside the request itself.
  if (Object.keys(errors).length === 0) {
    const seenCpf = new Set<string>();
    const seenShirt = new Set<number>();
    const seenPerson = new Set<string>();
    members.forEach((m, i) => {
      if (m.cpf) {
        if (seenCpf.has(m.cpf))
          errors[`members.${i}.cpf`] = "Este CPF aparece mais de uma vez.";
        seenCpf.add(m.cpf);
      }
      const person = `${foldName(m.name)}|${m.birthDate.getTime()}`;
      if (seenPerson.has(person))
        errors[`members.${i}.name`] = "Este atleta aparece mais de uma vez.";
      seenPerson.add(person);
      if (m.shirtNumber != null) {
        if (seenShirt.has(m.shirtNumber))
          errors[`members.${i}.shirtNumber`] = "Há camisas repetidas.";
        seenShirt.add(m.shirtNumber);
      }
    });
    if (members.filter((m) => m.isCaptain).length > 1)
      errors.captain = "Escolha só um capitão.";
  }

  if (!top.success || Object.keys(errors).length > 0)
    return { ok: false, fieldErrors: errors };
  const t = top.data;
  return {
    ok: true,
    data: {
      categoryId: t.categoryId,
      teamName: t.teamName || null,
      contactName: t.contactName,
      contactEmail: t.contactEmail,
      contactPhone: t.contactPhone ? t.contactPhone.replace(/\D/g, "") : null,
      notes: t.notes || null,
      members,
      staff: t.staff.map((s) => ({ ...s, contact: s.contact || null })),
      bot: !!t.website && t.website.length > 0,
    },
  };
}
