import { z } from "zod";
import { BR_STATES, parseDateInput } from "@/lib/events/constants";
import { isValidCpf, normalizeCpf } from "./cpf";
import { ageOn } from "./format";

/** Text from a form: trimmed, empty becomes undefined. */
const optionalText = (max: number, message?: string) =>
  z
    .string()
    .trim()
    .max(max, message ?? `Use no máximo ${max} caracteres.`)
    .optional()
    .transform((v) => (v ? v : undefined));

const requiredText = (min: number, max: number, empty: string) =>
  z
    .string()
    .trim()
    .min(min, empty)
    .max(max, `Use no máximo ${max} caracteres.`);

const optionalCpf = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine(
    (v) => v === undefined || isValidCpf(v),
    "CPF inválido. Confira os números.",
  )
  .transform((v) => (v === undefined ? undefined : normalizeCpf(v)));

const optionalEmail = z
  .string()
  .trim()
  .max(120, "Use no máximo 120 caracteres.")
  .optional()
  .transform((v) => (v ? v.toLowerCase() : undefined))
  .refine(
    (v) => v === undefined || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    "E-mail inválido.",
  );

const optionalPhone = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v.replace(/\D/g, "") : undefined))
  .refine(
    (v) => v === undefined || (v.length >= 10 && v.length <= 11),
    "Telefone com DDD, 10 ou 11 números.",
  );

const birthDate = z.string().transform((v, ctx) => {
  const date = parseDateInput(v.trim());
  if (!date) {
    ctx.addIssue({ code: "custom", message: "Informe a data de nascimento." });
    return z.NEVER;
  }
  return date;
});

export const athleteSchema = z
  .object({
    name: requiredText(2, 120, "Informe o nome completo."),
    birthDate,
    gender: z.enum(["MALE", "FEMALE", "OTHER"], { error: "Escolha o sexo." }),
    cpf: optionalCpf,
    email: optionalEmail,
    phone: optionalPhone,
    guardianName: optionalText(120),
    guardianCpf: optionalCpf,
  })
  .superRefine((a, ctx) => {
    const now = new Date();
    const age = ageOn(a.birthDate, now);
    if (a.birthDate.getTime() > now.getTime() || age > 120) {
      ctx.addIssue({
        code: "custom",
        path: ["birthDate"],
        message: "Confira a data de nascimento.",
      });
      return;
    }
    if (age >= 18) {
      if (!a.cpf)
        ctx.addIssue({
          code: "custom",
          path: ["cpf"],
          message: "Informe o CPF.",
        });
    } else {
      if (!a.guardianName || a.guardianName.length < 2)
        ctx.addIssue({
          code: "custom",
          path: ["guardianName"],
          message: "Menor de idade: informe o nome do responsável.",
        });
      if (!a.guardianCpf)
        ctx.addIssue({
          code: "custom",
          path: ["guardianCpf"],
          message: "Menor de idade: informe o CPF do responsável.",
        });
      else if (a.cpf && a.guardianCpf === a.cpf)
        ctx.addIssue({
          code: "custom",
          path: ["guardianCpf"],
          message: "O responsável não pode ter o mesmo CPF do atleta.",
        });
    }
  });

export type AthleteInput = z.infer<typeof athleteSchema>;

export const teamSchema = z.object({
  name: requiredText(2, 60, "Informe o nome do time."),
  shortName: optionalText(8, "Use até 8 caracteres.").transform((v) =>
    v?.toUpperCase(),
  ),
  city: optionalText(80),
  state: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.toUpperCase() : undefined))
    .refine(
      (v) => v === undefined || (BR_STATES as readonly string[]).includes(v),
      "Escolha uma UF válida.",
    ),
  color: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine(
      (v) => v === undefined || /^#[0-9a-fA-F]{6}$/.test(v),
      "Use uma cor no formato #RRGGBB.",
    )
    .transform((v) => v?.toLowerCase()),
});

export type TeamInput = z.infer<typeof teamSchema>;

export const refereeSchema = z.object({
  name: requiredText(2, 120, "Informe o nome."),
  role: z.enum(["REFEREE", "JUDGE", "ASSISTANT", "TABLE_OFFICIAL"], {
    error: "Escolha a função.",
  }),
  cpf: optionalCpf,
  email: optionalEmail,
  phone: optionalPhone,
  licenseNumber: optionalText(40),
  licenseEntity: optionalText(80),
  sportIds: z.array(z.string().min(1)).max(30, "Use no máximo 30 modalidades."),
});

export type RefereeInput = z.infer<typeof refereeSchema>;

/** Flattens zod issues into { field: message } (first message wins). */
export function fieldErrorsOf(
  issues: z.core.$ZodIssue[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
