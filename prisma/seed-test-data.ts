import type { PrismaClient } from "../src/generated/prisma/client";

type Gender = "FEMALE" | "MALE";
type RefereeRole = "REFEREE" | "ASSISTANT";
type FixtureAthlete = { name: string; gender: Gender; birthDate: Date };
type FixtureTeam = {
  name: string;
  shortName: string;
  city?: string;
  state?: string;
  color?: string;
};

const TEAM_PLACES = [
  "Ipê",
  "Pôr do Sol",
  "Vale Verde",
  "Lago Azul",
  "Serra Clara",
  "Campo Belo",
  "Rio Dourado",
  "Monte Azul",
  "Jardim das Águas",
  "Vila Nova",
];

const TEAM_PREFIXES = [
  "Atlético de ",
  "União Esportiva de ",
  "Esporte Clube ",
  "Associação Atlética ",
  "Grêmio de ",
];

const ATHLETE_SURNAMES = [
  "Farias",
  "Nascimento",
  "Barcellos",
  "Figueiredo",
  "Machado",
  "Correia",
  "Tavares",
  "Peixoto",
  "Menezes",
  "Vasconcelos",
  "Sampaio",
  "Rangel",
  "Brito",
  "Pacheco",
  "Dantas",
  "Azevedo",
  "Cavalcante",
  "Fonseca",
  "Queiroz",
  "Rezende",
];

const INITIAL_ATHLETES: FixtureAthlete[] = [
  { name: "Marina Alves", gender: "FEMALE", birthDate: new Date("2002-04-12T12:00:00.000Z") },
  { name: "Júlia Martins", gender: "FEMALE", birthDate: new Date("2001-09-23T12:00:00.000Z") },
  { name: "Camila Rocha", gender: "FEMALE", birthDate: new Date("2003-01-18T12:00:00.000Z") },
  { name: "Pedro Nogueira", gender: "MALE", birthDate: new Date("2001-06-05T12:00:00.000Z") },
  { name: "Rafael Lima", gender: "MALE", birthDate: new Date("2002-11-14T12:00:00.000Z") },
  { name: "Bruno Costa", gender: "MALE", birthDate: new Date("2000-08-29T12:00:00.000Z") },
  { name: "Bianca Freitas", gender: "FEMALE", birthDate: new Date("2002-02-16T12:00:00.000Z") },
  { name: "Larissa Mendes", gender: "FEMALE", birthDate: new Date("2004-07-08T12:00:00.000Z") },
  { name: "Isabela Santos", gender: "FEMALE", birthDate: new Date("2001-12-02T12:00:00.000Z") },
  { name: "Caio Ribeiro", gender: "MALE", birthDate: new Date("2003-05-21T12:00:00.000Z") },
  { name: "Diego Carvalho", gender: "MALE", birthDate: new Date("2001-10-11T12:00:00.000Z") },
  { name: "Felipe Barros", gender: "MALE", birthDate: new Date("2002-03-30T12:00:00.000Z") },
  { name: "Beatriz Cardoso", gender: "FEMALE", birthDate: new Date("2000-05-19T12:00:00.000Z") },
  { name: "Ana Clara Oliveira", gender: "FEMALE", birthDate: new Date("2003-08-27T12:00:00.000Z") },
  { name: "Luana Ferreira", gender: "FEMALE", birthDate: new Date("2002-01-09T12:00:00.000Z") },
  { name: "Lucas Teixeira", gender: "MALE", birthDate: new Date("2004-06-13T12:00:00.000Z") },
  { name: "Gabriel Moreira", gender: "MALE", birthDate: new Date("2001-04-25T12:00:00.000Z") },
  { name: "Matheus Araújo", gender: "MALE", birthDate: new Date("2002-12-17T12:00:00.000Z") },
  { name: "Sofia Almeida", gender: "FEMALE", birthDate: new Date("2001-03-07T12:00:00.000Z") },
  { name: "Valentina Lopes", gender: "FEMALE", birthDate: new Date("2003-10-22T12:00:00.000Z") },
  { name: "Manuela Dias", gender: "FEMALE", birthDate: new Date("2002-06-01T12:00:00.000Z") },
  { name: "Enzo Ribeiro", gender: "MALE", birthDate: new Date("2003-02-14T12:00:00.000Z") },
  { name: "João Pedro Melo", gender: "MALE", birthDate: new Date("2001-07-26T12:00:00.000Z") },
  { name: "Vinícius Pires", gender: "MALE", birthDate: new Date("2002-09-04T12:00:00.000Z") },
];

const INITIAL_TEAMS: FixtureTeam[] = [
  { name: "Aurora FC", shortName: "AUR", city: "São Paulo", state: "SP", color: "#2563EB" },
  { name: "Vento Sul Esporte Clube", shortName: "VSE", city: "Curitiba", state: "PR", color: "#16A34A" },
  { name: "Estrela do Vale", shortName: "EDV", city: "Campinas", state: "SP", color: "#EAB308" },
  { name: "Lobos da Serra", shortName: "LDS", city: "Caxias do Sul", state: "RS", color: "#7C3AED" },
];

const INITIAL_REFEREES: { name: string; role: RefereeRole }[] = [
  { name: "Rogério Batista", role: "REFEREE" },
  { name: "Marcos Vieira", role: "REFEREE" },
  { name: "Alberto Fonseca", role: "REFEREE" },
  { name: "Sérgio Campos", role: "REFEREE" },
  { name: "Paulo Queiroz", role: "REFEREE" },
  { name: "Carlos Medeiros", role: "REFEREE" },
  { name: "Ricardo Nunes", role: "REFEREE" },
  { name: "André Falcão", role: "REFEREE" },
  { name: "Roberto Xavier", role: "REFEREE" },
  { name: "Leandro Peixoto", role: "REFEREE" },
  { name: "Eduardo Bastos", role: "REFEREE" },
  { name: "Fábio Siqueira", role: "REFEREE" },
  { name: "Mateus Andrade", role: "ASSISTANT" },
  { name: "Cristiano Moura", role: "ASSISTANT" },
  { name: "Jorge Barcellos", role: "ASSISTANT" },
  { name: "Renato Freire", role: "ASSISTANT" },
  { name: "Thiago Macedo", role: "ASSISTANT" },
  { name: "Vinícius Rocha", role: "ASSISTANT" },
  { name: "Daniel Lacerda", role: "ASSISTANT" },
  { name: "Alexandre Pacheco", role: "ASSISTANT" },
];

const MAIN_FEMALE_NAMES = [
  "Alice", "Amanda", "Bruna", "Carolina", "Daniela", "Eduarda", "Elisa",
  "Fernanda", "Gabriela", "Helena", "Isadora", "Letícia", "Lívia", "Marcela",
  "Natália", "Olívia", "Paula", "Renata", "Sara", "Tatiana",
];

const EXTRA_FEMALE_NAMES = [
  "Helena", "Isadora", "Letícia", "Lívia", "Marcela", "Natália", "Olívia", "Paula",
];

const MALE_NAMES = [
  "André", "Antônio", "Arthur", "Bernardo", "Daniel", "Eduardo", "Gustavo",
  "Henrique", "Igor", "João Victor", "Leonardo", "Marcelo", "Nicolas", "Otávio",
  "Paulo", "Samuel", "Thiago", "Vitor", "Wesley", "Yuri",
];

function nameCandidates(firstNames: readonly string[]) {
  return firstNames.flatMap((firstName) =>
    ATHLETE_SURNAMES.map((surname) => firstName + " " + surname),
  );
}

function generatedAthletes(
  firstNames: readonly string[],
  gender: Gender,
  count: number,
): FixtureAthlete[] {
  const names = nameCandidates(firstNames).slice(0, count);
  if (names.length !== count) {
    throw new Error("O seed de atletas não tem nomes suficientes para completar os dados de teste.");
  }

  return names.map((name, index) => ({
    name,
    gender,
    birthDate: new Date(
      Date.UTC(1990 + (index % 16), index % 12, 1 + (index % 27), 12),
    ),
  }));
}

function testAthletes(): FixtureAthlete[] {
  return [
    ...INITIAL_ATHLETES,
    ...generatedAthletes(MAIN_FEMALE_NAMES, "FEMALE", 176),
    ...generatedAthletes(EXTRA_FEMALE_NAMES, "FEMALE", 8),
    ...generatedAthletes(MALE_NAMES, "MALE", 144),
  ];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
}

function testTeams(): FixtureTeam[] {
  const generated = TEAM_PREFIXES.flatMap((prefix) =>
    TEAM_PLACES.map((place) => prefix + place),
  )
    .slice(0, 46)
    .map((name) => ({ name, shortName: initials(name) }));

  return [...INITIAL_TEAMS, ...generated];
}

export async function seedTestData(prisma: PrismaClient) {
  // Demo fixtures are opt-in so a normal seed does not populate production data.
  const organization = await prisma.organization.upsert({
    where: { slug: "teste" },
    update: {},
    create: { name: "Teste", slug: "teste" },
    select: { id: true },
  });

  for (const team of testTeams()) {
    await prisma.team.upsert({
      where: {
        organizationId_name: { organizationId: organization.id, name: team.name },
      },
      update: {},
      create: { organizationId: organization.id, ...team },
    });
  }

  const linkedAthletes = await prisma.organizationAthlete.findMany({
    where: { organizationId: organization.id },
    select: { athleteId: true, athlete: { select: { name: true } } },
  });
  const athleteByName = new Map(
    linkedAthletes.map((link) => [link.athlete.name, link.athleteId]),
  );

  for (const fixture of testAthletes()) {
    let athleteId = athleteByName.get(fixture.name);
    if (!athleteId) {
      const existing = await prisma.athlete.findFirst({
        where: {
          createdByOrganizationId: organization.id,
          name: fixture.name,
        },
        select: { id: true },
      });
      const athlete =
        existing ??
        (await prisma.athlete.create({
          data: {
            ...fixture,
            createdByOrganizationId: organization.id,
          },
          select: { id: true },
        }));
      athleteId = athlete.id;
      await prisma.organizationAthlete.upsert({
        where: {
          organizationId_athleteId: {
            organizationId: organization.id,
            athleteId,
          },
        },
        update: {},
        create: { organizationId: organization.id, athleteId },
      });
      athleteByName.set(fixture.name, athleteId);
    }
  }

  const sport = await prisma.sport.findFirst({
    where: { name: "Futebol", active: true },
    select: { id: true },
  });
  if (!sport) {
    throw new Error("A modalidade Futebol não existe; execute primeiro o seed dos catálogos.");
  }

  for (const fixture of INITIAL_REFEREES) {
    let referee = await prisma.referee.findFirst({
      where: { organizationId: organization.id, name: fixture.name },
      select: { id: true },
    });
    if (!referee) {
      referee = await prisma.referee.create({
        data: {
          organizationId: organization.id,
          name: fixture.name,
          role: fixture.role,
          active: true,
        },
        select: { id: true },
      });
    }
    await prisma.refereeSport.upsert({
      where: {
        refereeId_sportId: { refereeId: referee.id, sportId: sport.id },
      },
      update: {},
      create: { refereeId: referee.id, sportId: sport.id },
    });
  }

  const [teams, athletes, referees] = await Promise.all([
    prisma.team.count({ where: { organizationId: organization.id } }),
    prisma.organizationAthlete.count({
      where: { organizationId: organization.id },
    }),
    prisma.referee.count({ where: { organizationId: organization.id } }),
  ]);
  console.log(
    "Test data ready: " +
      teams +
      " teams, " +
      athletes +
      " athletes, " +
      referees +
      " referees in organization Teste.",
  );
}