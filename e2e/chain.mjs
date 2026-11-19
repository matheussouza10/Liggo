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
const errors = [];
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 1300 },
  reducedMotion: "reduce",
});
const a = await ctx.newPage();
a.setDefaultTimeout(12000);
const orig = a.locator.bind(a);
a.locator = (sel, o) =>
  typeof sel === "string" && /^(input|select|main)/.test(sel)
    ? orig(sel + ":visible", o)
    : orig(sel, o);
a.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await a.goto(BASE + "/signup", { waitUntil: "networkidle" });
await a.getByLabel("Nome da organização").fill(`Cadeia ${T}`);
await a.getByLabel("Nome do responsável").fill("Org");
await a.getByLabel("E-mail").fill(`ch.${T}@example.com`);
await a.getByLabel("Senha", { exact: true }).fill(PASS);
await a.getByLabel("Confirmar senha").fill(PASS);
await a.getByRole("checkbox").check();
await a.getByRole("button", { name: /Criar conta/ }).click();
await a.waitForURL((u) => new URL(u).pathname === "/dashboard");
const orgA = sql(
  `select o.id from organizations o join users u on u."organizationId"=o.id where u.email=lower('ch.${T}@example.com')`,
);
const userA = sql(
  `select id from users where email=lower('ch.${T}@example.com')`,
);
await a.goto(BASE + "/events/new", { waitUntil: "networkidle" });
await a.getByLabel("Nome do evento").fill("Copa Cadeia E2E");
await a.getByLabel("Início", { exact: true }).fill("2026-12-05");
await a.getByLabel("Fim", { exact: true }).fill("2026-12-20");
await a.getByLabel("Tipo", { exact: true }).selectOption({ label: "Copa" });
await a
  .getByLabel("Modalidade", { exact: true })
  .selectOption({ label: "Futsal" });
await a
  .getByLabel("Formato", { exact: true })
  .selectOption({ label: "Pontos Corridos" });
await a.getByRole("radio", { name: "Equipe" }).check();
await a.getByLabel("Local", { exact: true }).fill("Ginásio Central");
await a.getByRole("button", { name: "Criar evento" }).click();
await a.waitForURL(
  (u) =>
    /^\/events\/[a-z0-9]+$/.test(new URL(u).pathname) &&
    new URL(u).pathname !== "/events/new",
);
const eid = new URL(a.url()).pathname.split("/").pop();
const cat = sql(`select id from event_categories where "eventId"='${eid}'`);
sql(
  `insert into event_rules(id,"eventId","scoringModel",tiebreakers,"updatedAt") values('${rid("r")}','${eid}','POINTS','[{"key":"POINTS","scope":"OVERALL"},{"key":"DRAW_LOTS","scope":"OVERALL"}]',now())`,
);
sql(
  `insert into event_stages(id,"eventId","order",name,type,"groupCount","groupSize","advancingPerGroup","roundRobinLegs","thirdPlaceMatch",seeding,"updatedAt") values('${rid("s")}','${eid}',1,'Fase de grupos','GROUPS',4,2,2,1,false,'RANDOM',now()),('${rid("s")}','${eid}',2,'Quartas de final','SINGLE_ELIM',null,null,null,1,false,'MANUAL',now()),('${rid("s")}','${eid}',3,'Semi-final','SINGLE_ELIM',null,null,null,1,true,'MANUAL',now()),('${rid("s")}','${eid}',4,'Final','SINGLE_ELIM',null,null,null,1,false,'MANUAL',now())`,
);
for (const n of [
  "Alfa",
  "Bravo",
  "Charlie",
  "Delta",
  "Eco",
  "Foxtrot",
  "Golf",
  "Hotel",
]) {
  const tid = rid("t"),
    aid = rid("a"),
    reg = rid("g");
  sql(
    `insert into teams(id,"organizationId",name,"updatedAt") values('${tid}','${orgA}','Time ${n}',now())`,
  );
  sql(
    `insert into athletes(id,name,"birthDate",gender,"createdByOrganizationId","updatedAt") values('${aid}','Atleta ${n}','1995-01-01','MALE','${orgA}',now())`,
  );
  sql(
    `insert into organization_athletes("organizationId","athleteId") values('${orgA}','${aid}')`,
  );
  sql(
    `insert into registrations(id,"eventId","categoryId","teamId","createdById","updatedAt") values('${reg}','${eid}','${cat}','${tid}','${userA}',now())`,
  );
  sql(
    `insert into registration_members(id,"registrationId","athleteId","categoryId") values('${rid("m")}','${reg}','${aid}','${cat}')`,
  );
}
const stageId = (o) =>
  sql(`select id from event_stages where "eventId"='${eid}' and "order"=${o}`);
const runOf = (o) =>
  sql(`select id from stage_runs where "stageId"='${stageId(o)}'`);
const openStage = async (o) => {
  await a.goto(`${BASE}/events/${eid}/stages/${stageId(o)}`, {
    waitUntil: "networkidle",
  });
};
const play = async (h, aw) => {
  await a
    .locator("button", { hasText: /^Resultado$/ })
    .first()
    .click();
  await a.locator("#score-home").fill(String(h));
  await a.locator("#score-away").fill(String(aw));
  await a.getByRole("button", { name: "Salvar resultado" }).click();
  await a.getByRole("dialog").waitFor({ state: "detached" });
  await a.waitForTimeout(500);
};

// stage 1: 4 groups of 2
await openStage(1);
await a.getByRole("button", { name: "Sortear", exact: true }).click();
await a.getByRole("heading", { name: /Grupo D/ }).waitFor();
await a.getByRole("button", { name: "Gerar jogos" }).click();
await a.getByRole("tab", { name: "Jogos" }).waitFor();
for (let i = 0; i < 4; i++)
  await play(i % 2 === 0 ? 2 : 1, i % 2 === 0 ? 0 : 1); // home wins or 1-1 draw
ok(
  "grupos: 4 jogos com resultado",
  sql(
    `select count(*) from matches where "stageRunId"='${runOf(1)}' and status<>'SCHEDULED'`,
  ) === "4",
);
await a.getByRole("button", { name: "Concluir fase e avançar" }).click();
await a.waitForTimeout(1500);
ok(
  "os 8 classificados entram nas Quartas (seed 1..8)",
  sql(`select count(*) from stage_entries where "stageRunId"='${runOf(2)}'`) ===
    "8" &&
    sql(
      `select min(seed)||'-'||max(seed) from stage_entries where "stageRunId"='${runOf(2)}'`,
    ) === "1-8",
);

// stage 2: quarters (one round only)
await openStage(2);
await a.getByRole("button", { name: "Gerar jogos" }).click();
await a.getByRole("tab", { name: "Jogos" }).waitFor();
ok(
  "Quartas geram só 4 jogos (uma rodada), sem semifinal nem final dentro da fase",
  sql(
    `select count(*)||'|'||string_agg(distinct label,',') from matches where "stageRunId"='${runOf(2)}'`,
  ) === "4|Quartas de final",
);
ok(
  "nenhum jogo das quartas repete o confronto do grupo",
  sql(
    `select count(*) from matches m join stage_entries h on h.id=m."homeEntryId" join stage_entries w on w.id=m."awayEntryId" join stage_entries h1 on h1."registrationId"=h."registrationId" and h1."stageRunId"='${runOf(1)}' join stage_entries w1 on w1."registrationId"=w."registrationId" and w1."stageRunId"='${runOf(1)}' where m."stageRunId"='${runOf(2)}' and h1."groupId"=w1."groupId"`,
  ) === "0",
);
for (let i = 0; i < 4; i++) await play(1, 0);
await a.getByRole("button", { name: "Concluir fase e avançar" }).click();
await a.waitForTimeout(1500);
ok(
  "os 4 vencedores das quartas entram na Semi-final",
  sql(`select count(*) from stage_entries where "stageRunId"='${runOf(3)}'`) ===
    "4",
);

// stage 3: semis with third place
await openStage(3);
await a.getByRole("button", { name: "Gerar jogos" }).click();
await a.getByRole("tab", { name: "Jogos" }).waitFor();
ok(
  "Semi-final gera 2 semifinais + disputa de 3º",
  sql(`select count(*) from matches where "stageRunId"='${runOf(3)}'`) ===
    "3" &&
    sql(
      `select count(*) from matches where "stageRunId"='${runOf(3)}' and label='Disputa de 3º lugar'`,
    ) === "1",
);
// bracket kept: semi 1 = winners of quarter slots 0 and 1; semi 2 = slots 2 and 3
const qWin = (p) =>
  sql(
    `select "winnerEntryId" from matches where "stageRunId"='${runOf(2)}' and position=${p}`,
  );
const qReg = (e) =>
  sql(`select "registrationId" from stage_entries where id='${e}'`);
const semiReg = (pos, side) =>
  sql(
    `select e."registrationId" from matches m join stage_entries e on e.id=m."${side}EntryId" where m."stageRunId"='${runOf(3)}' and m.label='Semifinal' and m.position=${pos}`,
  );
ok(
  "a chave se mantém: semi 1 = vencedores das quartas 1 e 2; semi 2 = vencedores das quartas 3 e 4",
  [semiReg(0, "home"), semiReg(0, "away")].sort().join() ===
    [qReg(qWin(0)), qReg(qWin(1))].sort().join() &&
    [semiReg(1, "home"), semiReg(1, "away")].sort().join() ===
      [qReg(qWin(2)), qReg(qWin(3))].sort().join(),
);
await play(1, 0);
await play(0, 1);
ok(
  "perdedores das semis vão para a disputa de 3º",
  sql(
    `select count(*) from matches where "stageRunId"='${runOf(3)}' and label='Disputa de 3º lugar' and "homeEntryId" is not null and "awayEntryId" is not null`,
  ) === "1",
);
ok(
  "não conclui a Semi-final sem decidir o 3º lugar",
  await a.getByRole("button", { name: "Concluir fase e avançar" }).isDisabled(),
);
await play(2, 1);
await a.getByRole("button", { name: "Concluir fase e avançar" }).click();
await a.waitForTimeout(1500);
ok(
  "os 2 vencedores das semis entram na Final",
  sql(`select count(*) from stage_entries where "stageRunId"='${runOf(4)}'`) ===
    "2",
);

// stage 4: final
await openStage(4);
await a.getByRole("button", { name: "Gerar jogos" }).click();
await a.getByRole("tab", { name: "Jogos" }).waitFor();
ok(
  "Final gera 1 jogo",
  sql(
    `select count(*)||'|'||min(label) from matches where "stageRunId"='${runOf(4)}'`,
  ) === "1|Final",
);
await play(3, 2);
ok("campeão aparece depois da final", await vis(a.getByText(/^Campeão:/)));
await a.getByRole("button", { name: "Concluir fase" }).click();
await a.waitForTimeout(1200);
ok(
  "evento concluído: as 4 fases estão DONE",
  sql(
    `select count(*) from stage_runs r join event_stages s on s.id=r."stageId" where s."eventId"='${eid}' and r.status='DONE'`,
  ) === "4",
);
await a.goto(`${BASE}/events/${eid}/stages`, { waitUntil: "networkidle" });
await a.screenshot({ path: "shots/chain-overview.png", fullPage: true });
ok(
  "sem erros de JavaScript no navegador",
  errors.length === 0,
  errors.join(" | "),
);
console.log(fails === 0 ? "TODOS PASSARAM" : `${fails} FALHAS`);
await browser.close();
