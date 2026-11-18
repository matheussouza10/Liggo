"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { fieldErrorsOf, refereeSchema } from "./schemas";

export type RefereeFormState = {
  values?: Record<string, string | string[]>;
  fieldErrors?: Record<string, string>;
  error?: string;
};

const FIELDS = [
  "name",
  "role",
  "cpf",
  "email",
  "phone",
  "licenseNumber",
  "licenseEntity",
] as const;

export async function saveRefereeAction(
  refereeId: string | null,
  _prev: RefereeFormState,
  formData: FormData,
): Promise<RefereeFormState> {
  const user = await requireOrganizationUser();
  const organizationId = user.organization?.id;
  if (!organizationId)
    return { error: "Sua conta não está ligada a uma organização." };

  const sportIds = [
    ...new Set(formData.getAll("sportIds").map(String).filter(Boolean)),
  ];
  const values = {
    ...Object.fromEntries(
      FIELDS.map((k) => [k, String(formData.get(k) ?? "")]),
    ),
    sportIds,
  };
  const parsed = refereeSchema.safeParse(values);
  if (!parsed.success)
    return { values, fieldErrors: fieldErrorsOf(parsed.error.issues) };
  const d = parsed.data;

  if (
    refereeId &&
    !(await prisma.referee.findFirst({
      where: { id: refereeId, organizationId },
      select: { id: true },
    }))
  ) {
    return { error: "Árbitro não encontrado." };
  }

  // Only active sports of the catalog can be linked.
  const valid = await prisma.sport.findMany({
    where: { id: { in: d.sportIds }, active: true },
    select: { id: true },
  });
  if (valid.length !== d.sportIds.length)
    return {
      values,
      fieldErrors: { sportIds: "Alguma modalidade não está disponível." },
    };

  const base = {
    name: d.name,
    role: d.role,
    cpf: d.cpf ?? null,
    email: d.email ?? null,
    phone: d.phone ?? null,
    licenseNumber: d.licenseNumber ?? null,
    licenseEntity: d.licenseEntity ?? null,
  };

  if (refereeId) {
    await prisma.$transaction([
      prisma.referee.update({ where: { id: refereeId }, data: base }),
      prisma.refereeSport.deleteMany({ where: { refereeId } }),
      prisma.refereeSport.createMany({
        data: d.sportIds.map((sportId) => ({ refereeId, sportId })),
      }),
    ]);
  } else {
    await prisma.referee.create({
      data: {
        ...base,
        organizationId,
        sports: { create: d.sportIds.map((sportId) => ({ sportId })) },
      },
    });
  }
  revalidatePath("/referees", "layout");
  redirect("/referees");
}

export async function setRefereeActiveAction(
  refereeId: string,
  active: boolean,
): Promise<{ ok: boolean }> {
  const user = await requireOrganizationUser();
  const organizationId = user.organization?.id;
  if (
    !organizationId ||
    typeof refereeId !== "string" ||
    typeof active !== "boolean"
  )
    return { ok: false };
  const result = await prisma.referee.updateMany({
    where: { id: refereeId, organizationId },
    data: { active },
  });
  revalidatePath("/referees", "layout");
  return { ok: result.count === 1 };
}
