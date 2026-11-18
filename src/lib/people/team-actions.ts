"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { sameName } from "@/lib/text";
import { fieldErrorsOf, teamSchema } from "./schemas";

export type TeamFormState = {
  values?: Record<string, string>;
  fieldErrors?: Record<string, string>;
  error?: string;
};

const FIELDS = ["name", "shortName", "city", "state", "color"] as const;
const DUPLICATE = "Já existe um time com esse nome na sua organização.";

export async function saveTeamAction(
  teamId: string | null,
  _prev: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  const user = await requireOrganizationUser();
  const organizationId = user.organization?.id;
  if (!organizationId)
    return { error: "Sua conta não está ligada a uma organização." };

  const values = Object.fromEntries(
    FIELDS.map((k) => [k, String(formData.get(k) ?? "")]),
  );
  const parsed = teamSchema.safeParse(values);
  if (!parsed.success)
    return { values, fieldErrors: fieldErrorsOf(parsed.error.issues) };
  const d = parsed.data;

  if (
    teamId &&
    !(await prisma.team.findFirst({
      where: { id: teamId, organizationId },
      select: { id: true },
    }))
  ) {
    return { error: "Time não encontrado." };
  }

  // Names are unique per organization, ignoring case, accents and extra spaces.
  const names = await prisma.team.findMany({
    where: { organizationId },
    select: { id: true, name: true },
  });
  const clash = names.some((t) => t.id !== teamId && sameName(t.name, d.name));
  if (clash) return { values, fieldErrors: { name: DUPLICATE } };

  const data = {
    name: d.name,
    shortName: d.shortName ?? null,
    city: d.city ?? null,
    state: d.state ?? null,
    color: d.color ?? null,
  };
  try {
    if (teamId) await prisma.team.update({ where: { id: teamId }, data });
    else await prisma.team.create({ data: { ...data, organizationId } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { values, fieldErrors: { name: DUPLICATE } };
    }
    throw error;
  }
  revalidatePath("/teams", "layout");
  redirect("/teams");
}

export async function setTeamActiveAction(
  teamId: string,
  active: boolean,
): Promise<{ ok: boolean }> {
  const user = await requireOrganizationUser();
  const organizationId = user.organization?.id;
  if (
    !organizationId ||
    typeof teamId !== "string" ||
    typeof active !== "boolean"
  )
    return { ok: false };
  const result = await prisma.team.updateMany({
    where: { id: teamId, organizationId },
    data: { active },
  });
  revalidatePath("/teams", "layout");
  return { ok: result.count === 1 };
}
