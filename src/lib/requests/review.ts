import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ineligibleReason } from "@/lib/registrations/eligibility";
import { sameName } from "@/lib/text";

export const requestInclude = {
  event: {
    select: {
      id: true,
      name: true,
      organizationId: true,
      sportId: true,
      startDate: true,
      participationType: true,
    },
  },
  category: true,
  members: {
    orderBy: { name: "asc" as const },
    include: { position: { select: { name: true } } },
  },
  staff: true,
} satisfies Prisma.RegistrationRequestInclude;

export type LoadedRequest = Prisma.RegistrationRequestGetPayload<{
  include: typeof requestInclude;
}>;

export type MemberReview = {
  /** An athlete already in the system that this person is. */
  athleteId: string | null;
  /** True when the athlete is new to this organization (it will be linked or created). */
  isNew: boolean;
  problems: string[];
};

export type Review = {
  general: string[];
  members: Record<string, MemberReview>;
  /** The team of this organization with the same name, if any. */
  teamId: string | null;
  /** Nothing blocks the approval. */
  canApprove: boolean;
};

/**
 * Everything the organizer should know before approving: who already exists,
 * who cannot play the category, and what would clash. Pure reading.
 */
export async function reviewRequest(req: LoadedRequest): Promise<Review> {
  const { event, category } = req;
  const organizationId = event.organizationId;
  const general: string[] = [];
  const members: Record<string, MemberReview> = {};

  // Who takes part and how many.
  const count = req.members.length;
  if (event.participationType === "INDIVIDUAL" && count !== 1)
    general.push("A inscrição individual tem exatamente 1 atleta.");
  if (event.participationType === "PAIR" && count !== 2)
    general.push("A dupla tem exatamente 2 atletas.");
  if (event.participationType === "TEAM") {
    if (count < category.rosterMin)
      general.push(
        `O elenco precisa de pelo menos ${category.rosterMin} atletas nesta categoria (a solicitação tem ${count}).`,
      );
    if (category.rosterMax != null && count > category.rosterMax)
      general.push(
        `O elenco pode ter no máximo ${category.rosterMax} atletas nesta categoria (a solicitação tem ${count}).`,
      );
  }

  // Team: reuse the one with the same name, if it is free in this category.
  let teamId: string | null = null;
  if (event.participationType === "TEAM") {
    if (!req.teamName) general.push("A solicitação não tem nome de time.");
    else {
      const teams = await prisma.team.findMany({
        where: { organizationId },
        select: { id: true, name: true, active: true },
      });
      const found = teams.find((t) => sameName(t.name, req.teamName ?? ""));
      if (found) {
        teamId = found.id;
        if (!found.active)
          general.push(
            `O time "${found.name}" está desativado no seu cadastro.`,
          );
        const taken = await prisma.registration.findFirst({
          where: { categoryId: category.id, teamId: found.id },
          select: { id: true },
        });
        if (taken)
          general.push(
            `O time "${found.name}" já está inscrito nesta categoria.`,
          );
      }
    }
  }

  // Athletes already known: by CPF (global identity) or, without CPF, by name and birth date inside the organization.
  const cpfs = req.members.map((m) => m.cpf).filter((c): c is string => !!c);
  const byCpf = new Map(
    (
      await prisma.athlete.findMany({
        where: { cpf: { in: cpfs } },
        select: {
          id: true,
          cpf: true,
          birthDate: true,
          organizations: {
            where: { organizationId },
            select: { organizationId: true },
          },
        },
      })
    ).map((a) => [a.cpf as string, a]),
  );
  const orgAthletes = await prisma.athlete.findMany({
    where: { organizations: { some: { organizationId } } },
    select: { id: true, name: true, birthDate: true },
  });

  const positionIds = [
    ...new Set(
      req.members.map((m) => m.positionId).filter((p): p is string => !!p),
    ),
  ];
  const validPositions = new Set(
    (
      await prisma.sportPosition.findMany({
        where: {
          id: { in: positionIds },
          sportId: event.sportId,
          active: true,
        },
        select: { id: true },
      })
    ).map((p) => p.id),
  );

  for (const m of req.members) {
    const problems: string[] = [];
    let athleteId: string | null = null;
    let isNew = true;

    if (m.cpf) {
      const known = byCpf.get(m.cpf);
      if (known) {
        athleteId = known.id;
        isNew = known.organizations.length === 0;
        if (known.birthDate.getTime() !== m.birthDate.getTime())
          problems.push(
            "Este CPF já está no sistema com outra data de nascimento. Confira os dados com o time antes de aprovar.",
          );
      }
    } else {
      const known = orgAthletes.find(
        (a) =>
          sameName(a.name, m.name) &&
          a.birthDate.getTime() === m.birthDate.getTime(),
      );
      if (known) {
        athleteId = known.id;
        isNew = false;
      }
    }

    const reason = ineligibleReason(
      category,
      { gender: m.gender, birthDate: m.birthDate },
      event.startDate,
    );
    if (reason) problems.push(`Não pode jogar esta categoria: ${reason}.`);
    if (m.positionId && !validPositions.has(m.positionId))
      problems.push("A posição não vale para a modalidade do evento.");
    members[m.id] = { athleteId, isNew, problems };
  }

  // Athletes already in the category through another registration.
  const knownIds = Object.values(members)
    .map((m) => m.athleteId)
    .filter((a): a is string => !!a);
  if (knownIds.length) {
    const busy = await prisma.registrationMember.findMany({
      where: { categoryId: category.id, athleteId: { in: knownIds } },
      select: { athleteId: true },
    });
    const busyIds = new Set(busy.map((b) => b.athleteId));
    for (const m of Object.values(members))
      if (m.athleteId && busyIds.has(m.athleteId))
        m.problems.push("Já está inscrito nesta categoria.");
  }

  const canApprove =
    general.length === 0 &&
    Object.values(members).every((m) => m.problems.length === 0);
  return { general, members, teamId, canApprove };
}
