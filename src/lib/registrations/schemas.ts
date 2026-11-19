import { z } from "zod";
import { REGISTRATION_LIMITS } from "./constants";

const optionalInt = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n < min || n > max) {
        ctx.addIssue({
          code: "custom",
          message: `${label}: use um número de ${min} a ${max}.`,
        });
        return z.NEVER;
      }
      return n;
    });

export const categorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Informe o nome da categoria.")
      .max(60, "Use no máximo 60 caracteres."),
    gender: z.enum(["MALE", "FEMALE", "MIXED"], {
      error: "Escolha o sexo da categoria.",
    }),
    minAge: optionalInt(0, 120, "Idade mínima"),
    maxAge: optionalInt(0, 120, "Idade máxima"),
    rosterMin: optionalInt(1, 100, "Elenco mínimo").transform((v) => v ?? 1),
    rosterMax: optionalInt(1, 100, "Elenco máximo"),
  })
  .superRefine((c, ctx) => {
    if (c.minAge != null && c.maxAge != null && c.minAge > c.maxAge)
      ctx.addIssue({
        code: "custom",
        path: ["maxAge"],
        message: "A idade máxima não pode ser menor que a mínima.",
      });
    if (c.rosterMax != null && c.rosterMin > c.rosterMax)
      ctx.addIssue({
        code: "custom",
        path: ["rosterMax"],
        message: "O elenco máximo não pode ser menor que o mínimo.",
      });
  });

export type CategoryInput = z.infer<typeof categorySchema>;

export const registrationSchema = z.object({
  categoryId: z.string().min(1, "Escolha a categoria."),
  teamId: z.string().min(1).nullable(),
  members: z
    .array(
      z.object({
        athleteId: z.string().min(1),
        shirtNumber: z
          .number()
          .int("Use um número inteiro.")
          .min(0, "Camisa de 0 a 999.")
          .max(REGISTRATION_LIMITS.maxShirt, "Camisa de 0 a 999.")
          .nullable(),
        positionId: z.string().min(1).nullable(),
        isCaptain: z.boolean(),
      }),
    )
    .min(1, "Adicione ao menos um atleta.")
    .max(
      REGISTRATION_LIMITS.maxMembers,
      `Use no máximo ${REGISTRATION_LIMITS.maxMembers} atletas.`,
    ),
  staff: z
    .array(
      z.object({
        name: z
          .string()
          .trim()
          .min(2, "Informe o nome.")
          .max(80, "Use no máximo 80 caracteres."),
        role: z.enum(["COACH", "ASSISTANT", "MANAGER", "PHYSIO", "OTHER"]),
        contact: z
          .string()
          .trim()
          .max(80, "Use no máximo 80 caracteres.")
          .transform((v) => (v ? v : null)),
      }),
    )
    .max(
      REGISTRATION_LIMITS.maxStaff,
      `Use no máximo ${REGISTRATION_LIMITS.maxStaff} pessoas na comissão.`,
    ),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;
