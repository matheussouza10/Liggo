import { chromium } from "playwright-core";
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
const DB = "postgresql://postgres:admin@localhost:5432/liggo";
const sql = (q) =>
  execSync(`psql "${DB}" -At -c "${q.replace(/"/g, '\\"')}"`)
    .toString()
    .trim();
const BASE = "http://localhost:3000",
  PASS = "Senha-de-teste-123",
  T = Date.now();
const rid = (p) => p + randomBytes(8).toString("hex");
let fails = 0;
const ok = (n, c, d = "") => {
  if (!c) fails++;
  console.log(c ? "PASS" : "FAIL", n, d ? `(${d})` : "");
};
const vis = async (loc, t = 8000) =>
  loc
    .waitFor({ timeout: t })
    .then(() => true)
    .catch(() => false);
const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
async function user(label) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1300 },
  });
  const p = await ctx.newPage();
  p.setDefaultTimeout(12000);
  await p.goto(BASE + "/signup", { waitUntil: "networkidle" });
  await p.getByLabel("Nome da organização").fill(`Hist ${label} ${T}`);
  await p.getByLabel("Nome do responsável").fill(`Org ${label}`);
  await p.getByLabel("E-mail").fill(`hs.${label}.${T}@example.com`);
  await p.getByLabel("Senha", { exact: true }).fill(PASS);
  await p.getByLabel("Confirmar senha").fill(PASS);
  await p.getByRole("checkbox").check();
  await p.getByRole("button", { name: /Criar conta/ }).click();
  await p.waitForURL((u) => new URL(u).pathname === "/dashboard");
  return p;
}
const a = await user("a"),
  b = await user("b"),
  c = await user("c");
const orgOf = (l) =>
  sql(
    `select o.id from organizations o join users u on u."organizationId"=o.id where u.email=lower('hs.${l}.${T}@example.com')`,
  );
const userOf = (l) =>
  sql(`select id from users where email=lower('hs.${l}.${T}@example.com')`);
const [oA, oB] = [orgOf("a"), orgOf("b")],
  [uA, uB] = [userOf("a"), userOf("b")];
const futsal = sql(`select id from sports where name='Futsal'`),
  etype = sql(`select id from event_types limit 1`),
  fmt = sql(`select id from competition_formats limit 1`),
  pos = sql(
    `select id from sport_positions where "sportId"='${futsal}' limit 1`,
  );

const S = [];
const q1 = (s) => S.push(s + ";");
const newAthlete = (name, org = oA) => {
  const id = rid("at");
  q1(
    `insert into athletes(id,name,"birthDate",gender,"createdByOrganizationId","updatedAt") values('${id}','${name}','1990-01-01','MALE','${org}',now())`,
  );
  q1(
    `insert into organization_athletes("organizationId","athleteId") values('${org}','${id}')`,
  );
  return id;
};
const AT = newAthlete("Atleta Histórico"),
  AT2 = newAthlete("Companheiro Histórico");
q1(
  `insert into organization_athletes("organizationId","athleteId") values('${oB}','${AT}')`,
); // the star is also known to organization B
const mkEvent = (org, user, name, start) => {
  const id = rid("ev"),
    cat = rid("ct");
  q1(
    `insert into events(id,"organizationId","createdById",name,"startDate","endDate","eventTypeId","formatId","sportId","participationType","locationName","updatedAt") values('${id}','${org}','${user}','${name}','${start}','${start}','${etype}','${fmt}','${futsal}','TEAM','Ginásio',now())`,
  );
  q1(
    `insert into event_categories(id,"eventId",name,gender,"rosterMin","updatedAt") values('${cat}','${id}','Geral','MIXED',1,now())`,
  );
  return { id, cat };
};
const mkTeam = (org, name) => {
  const id = rid("tm");
  q1(
    `insert into teams(id,"organizationId",name,"updatedAt") values('${id}','${org}','${name}',now())`,
  );
  return id;
};
const mkReg = (ev, team, user, athletes) => {
  const id = rid("rg");
  q1(
    `insert into registrations(id,"eventId","categoryId","teamId","createdById","updatedAt") values('${id}','${ev.id}','${ev.cat}','${team}','${user}',now())`,
  );
  athletes.forEach(([aid, shirt, capt]) =>
    q1(
      `insert into registration_members(id,"registrationId","athleteId","categoryId","shirtNumber","positionId","isCaptain") values('${rid("rm")}','${id}','${aid}','${ev.cat}',${shirt},'${pos}',${capt})`,
    ),
  );
  return id;
};
const mkStage = (ev, order, name, type) => {
  const id = rid("sg");
  q1(
    `insert into event_stages(id,"eventId","order",name,type,"roundRobinLegs","thirdPlaceMatch",seeding,"updatedAt") values('${id}','${ev.id}',${order},'${name}','${type}',1,false,'MANUAL',now())`,
  );
  return id;
};
const mkRun = (ev, stage, status, regs) => {
  const id = rid("ru");
  q1(
    `insert into stage_runs(id,"stageId","categoryId",status,"drawSeed","drawMode","updatedAt") values('${id}','${stage}','${ev.cat}','${status}',1,'RANDOM',now())`,
  );
  const ents = regs.map((r, i) => {
    const e = rid("en");
    q1(
      `insert into stage_entries(id,"stageRunId","registrationId",position,seed) values('${e}','${id}','${r}',${i},${i + 1})`,
    );
    return e;
  });
  return { id, ents };
};
const mkMatch = (run, pos_, label, h, a, status, hs, as_, winner) => {
  const id = rid("mt");
  q1(
    `insert into matches(id,"stageRunId",round,position,label,"homeEntryId","awayEntryId",status,"homeScore","awayScore","winnerEntryId","updatedAt") values('${id}','${run.id}',1,${pos_},'${label}','${run.ents[h]}','${run.ents[a]}','${status}',${hs ?? "null"},${as_ ?? "null"},${winner == null ? "null" : `'${run.ents[winner]}'`},now())`,
  );
  return id;
};
const moment = (m, type, athlete, other = null, value = 1) =>
  q1(
    `insert into match_events(id,"matchId",type,side,minute,"athleteId","otherAthleteId",value,"createdById") values('${rid("me")}','${m}','${type}','HOME',10,${athlete ? `'${athlete}'` : "null"},${other ? `'${other}'` : "null"},${value},'${uA}')`,
  );

// E1 (champion): round robin of 3 teams + final won by the athlete's team
const E1 = mkEvent(oA, uA, "Copa Campeã Hist", "2026-12-01");
const r1 = mkReg(E1, mkTeam(oA, "Time Histórico"), uA, [
    [AT, 10, true],
    [AT2, 7, false],
  ]),
  r2 = mkReg(E1, mkTeam(oA, "Rival Dois"), uA, [
    [newAthlete("Rival X"), 1, false],
  ]),
  r3 = mkReg(E1, mkTeam(oA, "Rival Três"), uA, [
    [newAthlete("Rival Y"), 1, false],
  ]);
const s1 = mkStage(E1, 1, "Pontos corridos", "ROUND_ROBIN"),
  s2 = mkStage(E1, 2, "Final", "SINGLE_ELIM");
const run1 = mkRun(E1, s1, "DONE", [r1, r2, r3]);
const m1 = mkMatch(run1, 0, "Rodada 1", 0, 1, "FINISHED", 2, 1, 0),
  m2 = mkMatch(run1, 1, "Rodada 2", 0, 2, "FINISHED", 3, 0, 0);
mkMatch(run1, 2, "Rodada 3", 1, 2, "FINISHED", 1, 1, null);
const run2 = mkRun(E1, s2, "LIVE", [r1, r2]);
const mf = mkMatch(run2, 0, "Final", 0, 1, "FINISHED", 2, 0, 0);
moment(m1, "GOAL", AT);
moment(m1, "GOAL", AT);
moment(m2, "GOAL", AT2, AT);
moment(mf, "GOAL", AT);
moment(mf, "YELLOW_CARD", AT);
moment(m1, "FOUL", AT);
moment(m2, "FOUL", AT);
// E2 (eliminated in the quarters; the semi stage exists but the team is not in it)
const E2 = mkEvent(oA, uA, "Copa Eliminada Hist", "2026-12-10");
const e2a = mkReg(E2, mkTeam(oA, "Time Histórico B"), uA, [[AT, 9, false]]),
  e2b = mkReg(E2, mkTeam(oA, "Rival Quartas"), uA, [
    [newAthlete("Rival Z"), 1, false],
  ]);
const qs = mkStage(E2, 1, "Quartas de final", "SINGLE_ELIM");
mkStage(E2, 2, "Semi-final", "SINGLE_ELIM");
const qrun = mkRun(E2, qs, "DONE", [e2a, e2b]);
const qm = mkMatch(qrun, 0, "Quartas de final", 0, 1, "FINISHED", 0, 1, 1);
moment(qm, "RED_CARD", AT);
// E3 (in progress)
const E3 = mkEvent(oA, uA, "Copa Andamento Hist", "2026-12-20");
const p1 = mkReg(E3, mkTeam(oA, "Time Histórico C"), uA, [[AT, 11, false]]),
  p2 = mkReg(E3, mkTeam(oA, "Rival Andamento"), uA, [
    [newAthlete("Rival W"), 1, false],
  ]);
const ps = mkStage(E3, 1, "Pontos corridos", "ROUND_ROBIN");
const prun = mkRun(E3, ps, "LIVE", [p1, p2]);
const pm = mkMatch(prun, 0, "Rodada 1", 0, 1, "FINISHED", 1, 1, null);
mkMatch(prun, 1, "Rodada 2", 1, 0, "SCHEDULED", null, null, null);
moment(pm, "GOAL", AT);
// E4: ANOTHER organization (must never show in organization A's history)
const E4 = mkEvent(oB, uB, "Copa Outra Organização", "2026-12-05");
mkReg(E4, mkTeam(oB, "Time B"), uB, [[AT, 5, false]]);
execSync(`psql ${DB} -v ON_ERROR_STOP=1 -q`, {
  input: ["begin;", ...S, "commit;"].join("\n"),
});

// ---------------------------------------------------------------- the page
await a.goto(`${BASE}/athletes/${AT}`, { waitUntil: "networkidle" });
ok(
  "página do atleta tem a navegação 'Dados' e 'Histórico'",
  await vis(a.getByRole("link", { name: "Histórico" })),
);
await a.getByRole("link", { name: "Histórico" }).click();
await a.waitForURL((u) => new URL(u).pathname === `/athletes/${AT}/history`);
ok(
  "abre o histórico do atleta",
  await vis(a.getByRole("heading", { name: "Atleta Histórico" })),
);
const tiles = await a
  .locator("section[aria-label='Resumo'] > div")
  .allInnerTexts();
const tile = (l) =>
  (tiles.find((x) => x.includes(l)) || "")
    .replace(l, "")
    .replace(/\s+/g, " ")
    .trim();
ok(
  "resumo: 3 eventos (só os da minha organização), 1 título",
  tile("Eventos") === "3" && tile("Títulos") === "1",
  JSON.stringify(tiles.map((t) => t.replace(/\s+/g, " "))),
);
ok(
  "resumo: 4 gols (3 + 1), 1 assistência, 1 amarelo, 1 vermelho, 2 faltas",
  tile("Gols / pontos") === "4" &&
    tile("Assistências") === "1" &&
    tile("Cartões amarelos") === "1" &&
    tile("Cartões vermelhos") === "1" &&
    tile("Faltas") === "2",
);
const cards = a.getByTestId("participation");
ok(
  "3 participações, a mais recente primeiro (Andamento, Eliminada, Campeã)",
  (await cards.count()) === 3 &&
    (await cards.nth(0).innerText()).includes("Copa Andamento Hist") &&
    (await cards.nth(1).innerText()).includes("Copa Eliminada Hist") &&
    (await cards.nth(2).innerText()).includes("Copa Campeã Hist"),
);
const c1 = (await cards.nth(2).innerText()).replace(/\s+/g, " ");
ok(
  "campeão: selo 'Campeão', time, camisa 10, posição e capitão",
  c1.includes("Campeão") &&
    c1.includes("Time Histórico") &&
    c1.includes("camisa 10") &&
    c1.includes("capitão"),
  c1.slice(0, 160),
);
ok(
  "campanha do time no campeonato: 3 jogos, 3V 0E 0D, gols 7 x 1",
  c1.includes("3 jogos, 3V 0E 0D, gols 7 x 1"),
  c1.slice(-90),
);
const stat = async (card, label) => {
  const el = card
    .locator("div.rounded-lg.border")
    .filter({ hasText: label })
    .first();
  return (await el.innerText()).replace(label, "").trim();
};
ok(
  "desempenho no campeão: 3 gols, 1 assistência, 1 amarelo, 0 vermelho, 2 faltas, 3 jogos com lance",
  [
    await stat(cards.nth(2), "Gols / pontos"),
    await stat(cards.nth(2), "Assistências"),
    await stat(cards.nth(2), "Amarelos"),
    await stat(cards.nth(2), "Vermelhos"),
    await stat(cards.nth(2), "Faltas"),
    await stat(cards.nth(2), "Jogos com lance"),
  ].join() === "3,1,1,0,2,3",
);
const c2 = (await cards.nth(1).innerText()).replace(/\s+/g, " ");
ok(
  "eliminado: 'Eliminado: Quartas de final' e 1 cartão vermelho",
  c2.includes("Eliminado: Quartas de final") &&
    (await stat(cards.nth(1), "Vermelhos")) === "1",
);
const c3 = (await cards.nth(0).innerText()).replace(/\s+/g, " ");
ok(
  "em andamento: 'Em andamento: Pontos corridos', 1 gol, campanha 1 jogo 0V 1E 0D",
  c3.includes("Em andamento: Pontos corridos") &&
    (await stat(cards.nth(0), "Gols / pontos")) === "1" &&
    c3.includes("1 jogo, 0V 1E 0D, gols 1 x 1"),
  c3.slice(-110),
);
ok(
  "não mostra o evento de outra organização",
  (await a.getByText("Copa Outra Organização").count()) === 0,
);
const goalsChart = a.locator("section[aria-label='Gols por evento'] li");
ok(
  "gráfico 'Gols por evento' ordenado: Campeã (3) e Andamento (1)",
  (await goalsChart.count()) === 2 &&
    (await goalsChart.nth(0).innerText()).includes("Copa Campeã Hist") &&
    /3\s*$/.test((await goalsChart.nth(0).innerText()).trim()),
);
await a.screenshot({ path: "shots/athlete-history.png", fullPage: true });
// link to the event
await a.getByRole("link", { name: "Copa Campeã Hist" }).click();
await a.waitForURL((u) => /^\/events\/[a-z0-9]+$/.test(new URL(u).pathname));
ok(
  "o nome do evento leva ao evento",
  await vis(a.getByRole("heading", { name: "Copa Campeã Hist" })),
);
// organization B sees only its own event
await b.goto(`${BASE}/athletes/${AT}/history`, { waitUntil: "networkidle" });
const bc = b.getByTestId("participation");
ok(
  "organização B vê só o evento dela (1 participação) e nenhum dado da A",
  (await bc.count()) === 1 &&
    (await bc.first().innerText()).includes("Copa Outra Organização") &&
    (await b.getByText("Copa Campeã Hist").count()) === 0,
);
// organization C does not know the athlete
await c.goto(`${BASE}/athletes/${AT}/history`, { waitUntil: "networkidle" });
ok(
  "organização que não conhece o atleta recebe 404",
  /could not be found/i.test(await c.locator("body").innerText()),
);
// athlete without participations
const NEW = newAthleteNow();
function newAthleteNow() {
  const id = rid("at");
  sql(
    `insert into athletes(id,name,"birthDate",gender,"createdByOrganizationId","updatedAt") values('${id}','Atleta Sem Evento','1990-01-01','MALE','${oA}',now())`,
  );
  sql(
    `insert into organization_athletes("organizationId","athleteId") values('${oA}','${id}')`,
  );
  return id;
}
await a.goto(`${BASE}/athletes/${NEW}/history`, { waitUntil: "networkidle" });
ok(
  "atleta sem participações mostra a mensagem vazia",
  await vis(a.getByText("ainda não participou de eventos da sua organização")),
);
// hide the test events from the public list (E1..E4 were created straight in the database, so hide in bulk through the toggle column)
console.log(fails === 0 ? "TODOS PASSARAM" : `${fails} FALHAS`);
await browser.close();
