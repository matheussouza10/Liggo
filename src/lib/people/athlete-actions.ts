"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { checkLimit } from "@/lib/payments/plans";
import { prisma } from "@/lib/prisma";
import { isValidCpf, normalizeCpf } from "./cpf";
import { abbreviateName } from "./format";
import { athleteSchema, fieldErrorsOf } from "./schemas";

export type AthleteFormState = {
  values?: Record<string, string>;
  fieldErrors?: Record<string, string>;
  error?: string;
  /** A CPF that already exists elsewhere: only an abbreviated name is revealed. */
  match?: { displayName: string; cpf: string };
};

const FIELDS = [
  "name",
  "birthDate",
  "gender",
  "cpf",
  "email",
  "phone",
  "guardianName",
  "guardianCpf",
] as const;

function read(formData: FormData) {
  return Object.fromEntries(
    FIELDS.map((k) => [k, String(formData.get(k) ?? "")]),
  ) as Record<(typeof FIELDS)[number], string>;
}

const isUniqueViolation = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

async function organizationOf() {
  const user = await requireOrganizationUser();
  return user.organization?.id ?? null;
}

export async function createAthleteAction(
  _prev: AthleteFormState,
  formData: FormData,
): Promise<AthleteFormState> {
  const organizationId = await organizationOf();
  if (!organizationId)
    return { error: "Sua conta não está ligada a uma organização." };

  const values = read(formData);
  const parsed = athleteSchema.safeParse(values);
  if (!parsed.success)
    return { values, fieldErrors: fieldErrorsOf(parsed.error.issues) };
  const data = parsed.data;

  const limit = await checkLimit(organizationId, "athletes");
  if (limit) return { values, error: limit };

  // The CPF is the athlete's identity across organizations.
  if (data.cpf) {
    const existing = await prisma.athlete.findUnique({
      where: { cpf: data.cpf },
      select: {
        id: true,
        name: true,
        organizations: {
          where: { organizationId },
          select: { organizationId: true },
        },
      },
    });
    if (existing) {
      if (existing.organizations.length > 0) {
        return {
          values,
          fieldErrors: {
            cpf: "Este atleta já está no cadastro da sua organização.",
          },
        };
      }
      return {
        values,
        match: { displayName: abbreviateName(existing.name), cpf: data.cpf },
      };
    }
  }

  try {
    const athlete = await prisma.athlete.create({
      data: {
        cpf: data.cpf ?? null,
        name: data.name,
        birthDate: data.birthDate,
        gender: data.gender,
        email: data.email ?? null,
        phone: data.phone ?? null,
        guardianName: data.guardianName ?? null,
        guardianCpf: data.guardianCpf ?? null,
        createdByOrganizationId: organizationId,
        organizations: { create: { organizationId } },
      },
      select: { id: true },
    });
    revalidatePath("/athletes", "layout");
    redirect(`/athletes/${athlete.id}`);
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    // Someone registered the same CPF a moment ago: offer to use that record.
    const winner = await prisma.athlete.findUnique({
      where: { cpf: data.cpf ?? "" },
      select: { name: true },
    });
    if (winner && data.cpf)
      return {
        values,
        match: { displayName: abbreviateName(winner.name), cpf: data.cpf },
      };
    throw error;
  }
}

/**
 * Links an existing athlete to the organization. Needs the CPF itself (not an
 * id), so only someone who knows the CPF can do it, and no data is copied.
 */
export async function linkAthleteByCpfAction(
  cpf: string,
): Promise<{ error?: string }> {
  const organizationId = await organizationOf();
  if (!organizationId)
    return { error: "Sua conta não está ligada a uma organização." };

  const digits = normalizeCpf(String(cpf ?? ""));
  if (!isValidCpf(digits)) return { error: "CPF inválido." };

  const athlete = await prisma.athlete.findUnique({
    where: { cpf: digits },
    select: { id: true },
  });
  if (!athlete) return { error: "Atleta não encontrado." };

  const alreadyMine = await prisma.organizationAthlete.findUnique({
    where: {
      organizationId_athleteId: { organizationId, athleteId: athlete.id },
    },
    select: { athleteId: true },
  });
  if (!alreadyMine) {
    const limit = await checkLimit(organizationId, "athletes");
    if (limit) return { error: limit };
  }

  await prisma.organizationAthlete.upsert({
    where: {
      organizationId_athleteId: { organizationId, athleteId: athlete.id },
    },
    create: { organizationId, athleteId: athlete.id },
    update: {},
  });
  revalidatePath("/athletes", "layout");
  redirect(`/athletes/${athlete.id}`);
}

export async function updateAthleteAction(
  athleteId: string,
  _prev: AthleteFormState,
  formData: FormData,
): Promise<AthleteFormState> {
  const organizationId = await organizationOf();
  if (!organizationId)
    return { error: "Sua conta não está ligada a uma organização." };

  const current = await prisma.athlete.findFirst({
    where: { id: athleteId, organizations: { some: { organizationId } } },
  });
  if (!current) return { error: "Atleta não encontrado." };
  if (
    current.createdByOrganizationId !== organizationId ||
    current.userId !== null
  ) {
    return {
      error: "Só a organização que cadastrou o atleta pode alterar os dados.",
    };
  }

  const values = read(formData);
  // The CPF never changes after registration, so validate with the stored one.
  const parsed = athleteSchema.safeParse({ ...values, cpf: current.cpf ?? "" });
  if (!parsed.success)
    return { values, fieldErrors: fieldErrorsOf(parsed.error.issues) };
  const d = parsed.data;

  await prisma.athlete.update({
    where: { id: current.id },
    data: {
      name: d.name,
      birthDate: d.birthDate,
      gender: d.gender,
      email: d.email ?? null,
      phone: d.phone ?? null,
      guardianName: d.guardianName ?? null,
      guardianCpf: d.guardianCpf ?? null,
    },
  });
  revalidatePath("/athletes", "layout");
  redirect(`/athletes/${current.id}?saved=1`);
}
