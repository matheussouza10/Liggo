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
async function user(label) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1300 },
  });
  const p = await ctx.newPage();
  p.setDefaultTimeout(12000);
  const ogl = p.getByLabel.bind(p);
  p.getByLabel = (l, o) => ogl(l, o).filter({ visible: true });
  p.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  await p.goto(BASE + "/signup", { waitUntil: "networkidle" });
  await p.getByLabel("Nome da organização").fill(`Gerir ${label} ${T}`);
  await p.getByLabel("Nome do responsável").fill(`Dono ${label}`);
  await p.getByLabel("E-mail").fill(`gv.${label}.${T}@example.com`);
  await p.getByLabel("Senha", { exact: true }).fill(PASS);
  await p.getByLabel("Confirmar senha").fill(PASS);
  await p.getByRole("checkbox").check();
  await p.getByRole("button", { name: /Criar conta/ }).click();
  await p.waitForURL((u) => new URL(u).pathname === "/dashboard");
  return p;
}
const a = await user("a"),
  memberPage = await user("m"),
  other = await user("o");
const em = (l) => `gv.${l}.${T}@example.com`;
const orgA = sql(`select "organizationId" from users where email='${em("a")}'`),
  uA = sql(`select id from users where email='${em("a")}'`);
// the "member" signs up in its own org, then belongs to org A as MEMBER
sql(
  `update users set "organizationId"='${orgA}', role='MEMBER' where email='${em("m")}'`,
);
await memberPage.context().clearCookies();
await memberPage.goto(BASE + "/login", { waitUntil: "networkidle" });
await memberPage.getByLabel("E-mail").fill(em("m"));
await memberPage.getByLabel("Senha", { exact: true }).fill(PASS);
await memberPage.getByRole("button", { name: "Entrar" }).click();
await memberPage.waitForURL((u) => new URL(u).pathname === "/dashboard");

const create = async (name) => {
  await a.goto(BASE + "/events/new", { waitUntil: "networkidle" });
  await a.getByLabel("Nome do evento").fill(name);
  await a.getByLabel("Início", { exact: true }).fill("2026-12-05");
  await a.getByLabel("Fim", { exact: true }).fill("2026-12-06");
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
  return new URL(a.url()).pathname.split("/").pop();
};

// ================= edit without registrations
const E1 = await create(`Evento Editar ${T}`);
ok(
  "a página do evento tem Editar, Duplicar e Excluir (proprietário)",
  (await vis(a.getByRole("link", { name: "Editar", exact: true }))) &&
    (await a.getByRole("button", { name: "Duplicar" }).isVisible()) &&
    (await a.getByRole("button", { name: "Excluir" }).isVisible()),
);
await a.getByRole("link", { name: "Editar", exact: true }).click();
await a.waitForURL((u) => new URL(u).pathname === `/events/${E1}/edit`);
ok(
  "a edição abre com os dados atuais",
  (await a.getByLabel("Nome do evento").inputValue()) ===
    `Evento Editar ${T}` &&
    (await a.getByLabel("Início", { exact: true }).inputValue()) ===
      "2026-12-05" &&
    (await a.getByLabel("Local", { exact: true }).inputValue()) ===
      "Ginásio Central",
);
ok(
  "sem inscrições, modalidade e participação estão liberadas",
  !(await a.getByLabel("Modalidade", { exact: true }).isDisabled()) &&
    !(await a.getByRole("radio", { name: "Equipe" }).isDisabled()),
);
await a.getByLabel("Nome do evento").fill("");
await a.getByRole("button", { name: "Salvar alterações" }).click();
ok(
  "nome vazio é recusado",
  await vis(a.getByText("Informe o nome do evento.")),
);
await a.getByLabel("Nome do evento").fill(`Evento Editado ${T}`);
await a.getByLabel("Fim", { exact: true }).fill("2026-12-01");
await a.getByRole("button", { name: "Salvar alterações" }).click();
ok(
  "fim antes do início é recusado",
  await vis(a.getByText("O fim não pode ser antes do início.")),
);
await a.getByLabel("Início", { exact: true }).fill("2026-12-10");
await a.getByLabel("Fim", { exact: true }).fill("2026-12-12");
await a
  .getByLabel("Modalidade", { exact: true })
  .selectOption({ label: "Basquete" });
await a.getByRole("radio", { name: "Individual" }).check();
await a.getByLabel("Local", { exact: true }).fill("Arena Nova");
await a.getByLabel("Cidade (opcional)").fill("Contagem");
await a.getByLabel("UF").selectOption("MG");
await a.getByRole("button", { name: "Salvar alterações" }).click();
await a.waitForURL((u) => new URL(u).pathname === `/events/${E1}`);
ok(
  "salvar volta ao evento com o aviso",
  (await vis(a.getByText("Alterações do evento salvas."))) &&
    (await vis(a.getByRole("heading", { name: `Evento Editado ${T}` }))),
);
ok(
  "banco: tudo atualizado (nome, datas, local, cidade, UF, modalidade e participação)",
  sql(
    `select e.name||'|'||e."startDate"||'|'||e."endDate"||'|'||e."locationName"||'|'||e.city||'|'||e.state||'|'||s.name||'|'||e."participationType" from events e join sports s on s.id=e."sportId" where e.id='${E1}'`,
  ) ===
    `Evento Editado ${T}|2026-12-10|2026-12-12|Arena Nova|Contagem|MG|Basquete|INDIVIDUAL`,
);

// ================= edit with registrations: locked modality + age check on the start date
const futsal = sql(`select id from sports where name='Futsal'`),
  pos = sql(
    `select id from sport_positions where "sportId"='${futsal}' limit 1`,
  );
sql(
  `update events set "sportId"='${futsal}', "participationType"='TEAM' where id='${E1}'`,
);
const cat = sql(`select id from event_categories where "eventId"='${E1}'`);
sql(`update event_categories set name='Sub-15', "maxAge"=15 where id='${cat}'`);
const at = rid("at"),
  at2 = rid("at"),
  tm = rid("tm"),
  tm2 = rid("tm");
sql(
  `insert into athletes(id,name,"birthDate",gender,"createdByOrganizationId","updatedAt") values('${at}','Jovem Atleta','2011-12-20','MALE','${orgA}',now()),('${at2}','Outra Jovem','2011-12-25','MALE','${orgA}',now())`,
);
sql(
  `insert into organization_athletes("organizationId","athleteId") values('${orgA}','${at}'),('${orgA}','${at2}')`,
);
sql(
  `insert into teams(id,"organizationId",name,"updatedAt") values('${tm}','${orgA}','Time Gerir ${T}',now())`,
);
const reg = rid("rg");
sql(
  `insert into registrations(id,"eventId","categoryId","teamId","createdById","updatedAt") values('${reg}','${E1}','${cat}','${tm}','${uA}',now())`,
);
sql(
  `insert into registration_members(id,"registrationId","athleteId","categoryId","shirtNumber","positionId","isCaptain") values('${rid("m")}','${reg}','${at}','${cat}',10,'${pos}',true)`,
);
await a.goto(`${BASE}/events/${E1}/edit`, { waitUntil: "networkidle" });
ok(
  "com inscrições, modalidade e participação ficam travadas e explicadas",
  (await a.getByLabel("Modalidade", { exact: true }).isDisabled()) &&
    (await a.getByRole("radio", { name: "Equipe" }).isDisabled()) &&
    (await vis(a.getByText(/Não dá para mudar a modalidade/))) &&
    (await vis(a.getByText(/Não dá para mudar o formato de participação/))),
);
// tamper with the form: unlock and change the sport, the server must keep it
await a.evaluate(() => {
  const s = document.querySelector("select[name=sportId]");
  s.disabled = false;
  const o = [...s.options].find((x) => x.text.includes("Vôlei"));
  s.value = o.value;
});
await a.getByLabel("Local", { exact: true }).fill("Arena Travada");
await a.getByRole("button", { name: "Salvar alterações" }).click();
await a.waitForURL((u) => new URL(u).pathname === `/events/${E1}`);
ok(
  "mesmo adulterando o formulário, o servidor mantém a modalidade (Futsal) e a participação",
  sql(
    `select s.name||'|'||e."participationType"||'|'||e."locationName" from events e join sports s on s.id=e."sportId" where e.id='${E1}'`,
  ) === "Futsal|TEAM|Arena Travada",
);
// age check: athlete born 2011-12-20 is 14 on 2026-12-10; a start in 2027-12-25 makes him 16 (> 15)
await a.goto(`${BASE}/events/${E1}/edit`, { waitUntil: "networkidle" });
await a.getByLabel("Início", { exact: true }).fill("2027-12-25");
await a.getByLabel("Fim", { exact: true }).fill("2027-12-26");
await a.getByRole("button", { name: "Salvar alterações" }).click();
ok(
  "mudar a data de início que deixaria um atleta fora da idade é recusado, citando o nome",
  (await vis(
    a.getByText(
      /1 atleta deixaria de caber na categoria por idade: Jovem Atleta/,
    ),
  )) && sql(`select "startDate" from events where id='${E1}'`) === "2026-12-10",
);
await a.getByLabel("Início", { exact: true }).fill("2026-12-15");
await a.getByLabel("Fim", { exact: true }).fill("2026-12-16");
await a.getByRole("button", { name: "Salvar alterações" }).click();
await a.waitForURL((u) => new URL(u).pathname === `/events/${E1}`);
ok(
  "uma data em que todos ainda cabem é aceita",
  sql(`select "startDate" from events where id='${E1}'`) === "2026-12-15",
);

// ================= duplicate: rules, stages (with matchups), categories; no registrations
sql(
  `insert into event_rules(id,"eventId","scoringModel",tiebreakers,penalties,"updatedAt") values('${rid("r")}','${E1}','POINTS','[{"key":"POINTS","scope":"OVERALL"},{"key":"DRAW_LOTS","scope":"OVERALL"}]',true,now())`,
);
const tpl = JSON.stringify([
  {
    a: { type: "GROUP_RANK", group: 1, rank: 1 },
    b: { type: "GROUP_RANK", group: 2, rank: 2 },
  },
  {
    a: { type: "GROUP_RANK", group: 2, rank: 1 },
    b: { type: "GROUP_RANK", group: 1, rank: 2 },
  },
]);
sql(
  `insert into event_stages(id,"eventId","order",name,type,"groupCount","groupSize","advancingPerGroup","roundRobinLegs","thirdPlaceMatch",seeding,pairings,"updatedAt") values('${rid("s")}','${E1}',1,'Grupos','GROUPS',2,4,2,1,false,'RANDOM',null,now()),('${rid("s")}','${E1}',2,'Semi','SINGLE_ELIM',null,null,null,1,true,'MANUAL','${tpl}'::jsonb,now())`,
);
await a.goto(`${BASE}/events/${E1}`, { waitUntil: "networkidle" });
await a.getByRole("button", { name: "Duplicar" }).click();
ok(
  "o diálogo de duplicar sugere '(cópia)' e as mesmas datas um ano depois",
  (await a.locator("#dup-name").inputValue()) ===
    `Evento Editado ${T} (cópia)` &&
    (await a.locator("#dup-start").inputValue()) === "2027-12-15" &&
    (await a.locator("#dup-end").inputValue()) === "2027-12-16",
);
await a.locator("#dup-name").fill("");
await a.getByRole("button", { name: "Duplicar", exact: true }).click();
ok(
  "nome vazio é recusado ao duplicar",
  await vis(a.getByText("Informe o nome do novo evento.")),
);
await a.locator("#dup-name").fill(`Evento Copiado ${T}`);
await a.locator("#dup-end").fill("2027-12-01");
await a.getByRole("button", { name: "Duplicar", exact: true }).click();
ok(
  "fim antes do início é recusado ao duplicar",
  await vis(a.getByText("O fim não pode ser antes do início.")),
);
await a.locator("#dup-end").fill("2027-12-16");
await a.getByRole("button", { name: "Duplicar", exact: true }).click();
await a.waitForURL(
  (u) =>
    /^\/events\/[a-z0-9]+$/.test(new URL(u).pathname) &&
    !new URL(u).pathname.endsWith(E1),
);
const E2 = new URL(a.url()).pathname.split("/").pop();
ok(
  "abre o evento novo com o aviso de duplicado",
  E2 !== E1 &&
    (await vis(a.getByText(/Evento duplicado\./))) &&
    (await vis(a.getByRole("heading", { name: `Evento Copiado ${T}` }))),
);
ok(
  "a cópia herda modalidade, participação, local, cidade e UF, com as datas novas, na mesma organização",
  sql(
    `select s.name||'|'||e."participationType"||'|'||e."locationName"||'|'||e."startDate"||'|'||e."endDate"||'|'||e.city||'|'||e.state from events e join sports s on s.id=e."sportId" where e.id='${E2}'`,
  ) === "Futsal|TEAM|Arena Travada|2027-12-15|2027-12-16|Contagem|MG" &&
    sql(`select "organizationId" from events where id='${E2}'`) === orgA,
);
ok(
  "categorias copiadas (Sub-15 com idade máxima 15)",
  sql(
    `select name||'|'||"maxAge" from event_categories where "eventId"='${E2}'`,
  ) === "Sub-15|15",
);
ok(
  "regras copiadas (desempate e pênaltis)",
  sql(
    `select penalties::text||'|'||jsonb_array_length(tiebreakers) from event_rules where "eventId"='${E2}'`,
  ).replace("true", "t") === "t|2" ||
    sql(
      `select penalties::text||'|'||jsonb_array_length(tiebreakers) from event_rules where "eventId"='${E2}'`,
    ) === "true|2",
);
ok(
  "fases copiadas na ordem, com os confrontos por origem da semi",
  sql(
    `select string_agg(name,',' order by "order") from event_stages where "eventId"='${E2}'`,
  ) === "Grupos,Semi" &&
    sql(
      `select jsonb_array_length(pairings) from event_stages where "eventId"='${E2}' and name='Semi'`,
    ) === "2",
);
ok(
  "NÃO copia inscrições, sorteio nem jogos",
  sql(
    `select (select count(*) from registrations where "eventId"='${E2}')+(select count(*) from stage_runs r join event_stages s on s.id=r."stageId" where s."eventId"='${E2}')`,
  ) === "0",
);
ok(
  "a regra do evento novo não está travada (começa do zero)",
  sql(`select "rulesLockedAt" is null from events where id='${E2}'`) === "t",
);
ok(
  "o evento original continua intacto",
  sql(`select name from events where id='${E1}'`) === `Evento Editado ${T}` &&
    sql(`select count(*) from registrations where "eventId"='${E1}'`) === "1",
);

// ================= permissions
await memberPage.goto(`${BASE}/events/${E1}`, { waitUntil: "networkidle" });
ok(
  "membro vê Editar e Duplicar, mas não Excluir",
  (await vis(memberPage.getByRole("link", { name: "Editar", exact: true }))) &&
    (await memberPage.getByRole("button", { name: "Duplicar" }).isVisible()) &&
    (await memberPage.getByRole("button", { name: "Excluir" }).count()) === 0,
);
await other.goto(`${BASE}/events/${E1}/edit`, { waitUntil: "networkidle" });
ok(
  "outra organização recebe 404 na edição",
  /could not be found/i.test(await other.locator("body").innerText()),
);
await a.goto(BASE + "/events", { waitUntil: "networkidle" });
ok(
  "a lista de eventos tem o atalho Editar apontando para a edição",
  (await a
    .getByRole("row")
    .filter({ hasText: `Evento Editado ${T}` })
    .getByRole("link", { name: /^Editar de / })
    .getAttribute("href")) === `/events/${E1}/edit`,
);

// ================= delete: a full event with draw, matches and lances
const E3 = await create(`Evento Excluir ${T}`);
sql(
  `insert into event_stages(id,"eventId","order",name,type,"roundRobinLegs","thirdPlaceMatch",seeding,"updatedAt") values('${rid("s")}','${E3}',1,'Pontos corridos','ROUND_ROBIN',1,false,'RANDOM',now())`,
);
const c3 = sql(`select id from event_categories where "eventId"='${E3}'`),
  st3 = sql(`select id from event_stages where "eventId"='${E3}'`);
const a3 = rid("at"),
  a4 = rid("at"),
  t3 = rid("tm"),
  t4 = rid("tm");
sql(
  `insert into athletes(id,name,"birthDate",gender,"createdByOrganizationId","updatedAt") values('${a3}','Atleta Excluir 1','1990-01-01','MALE','${orgA}',now()),('${a4}','Atleta Excluir 2','1990-01-01','MALE','${orgA}',now())`,
);
sql(
  `insert into organization_athletes("organizationId","athleteId") values('${orgA}','${a3}'),('${orgA}','${a4}')`,
);
sql(
  `insert into teams(id,"organizationId",name,"updatedAt") values('${t3}','${orgA}','Time Excluir 1 ${T}',now()),('${t4}','${orgA}','Time Excluir 2 ${T}',now())`,
);
const r3 = rid("rg"),
  r4 = rid("rg");
sql(
  `insert into registrations(id,"eventId","categoryId","teamId","createdById","updatedAt") values('${r3}','${E3}','${c3}','${t3}','${uA}',now()),('${r4}','${E3}','${c3}','${t4}','${uA}',now())`,
);
sql(
  `insert into registration_members(id,"registrationId","athleteId","categoryId","shirtNumber") values('${rid("m")}','${r3}','${a3}','${c3}',1),('${rid("m")}','${r4}','${a4}','${c3}',1)`,
);
const run3 = rid("ru");
sql(
  `insert into stage_runs(id,"stageId","categoryId",status,"drawSeed","drawMode","updatedAt") values('${run3}','${st3}','${c3}','LIVE',1,'RANDOM',now())`,
);
const en3 = rid("en"),
  en4 = rid("en");
sql(
  `insert into stage_entries(id,"stageRunId","registrationId",position,seed) values('${en3}','${run3}','${r3}',0,1),('${en4}','${run3}','${r4}',1,2)`,
);
const m3 = rid("mt");
sql(
  `insert into matches(id,"stageRunId",round,position,label,"homeEntryId","awayEntryId",status,"homeScore","awayScore","winnerEntryId","updatedAt") values('${m3}','${run3}',1,0,'Rodada 1','${en3}','${en4}','FINISHED',1,0,'${en3}',now())`,
);
sql(
  `insert into match_events(id,"matchId",type,side,minute,"athleteId","createdById") values('${rid("me")}','${m3}','GOAL','HOME',10,'${a3}','${uA}')`,
);
await a.goto(`${BASE}/events/${E3}`, { waitUntil: "networkidle" });
await a.getByRole("button", { name: "Excluir" }).click();
ok(
  "o diálogo de excluir mostra o que será apagado (2 inscrições, 1 jogo com resultado)",
  (await vis(
    a.getByText(/Serão apagados 2 inscrições e 1 jogo \(1 com resultado\)/),
  )) &&
    (await vis(a.getByText(/Atletas, times e árbitros continuam no cadastro/))),
);
const del = a.getByRole("button", { name: "Excluir definitivamente" });
ok("o botão começa desabilitado", await del.isDisabled());
await a.locator("#del-confirm").fill("nome errado");
ok("com o nome errado continua desabilitado", await del.isDisabled());
await a.locator("#del-confirm").fill(`Evento Excluir ${T}`);
ok("com o nome certo habilita", !(await del.isDisabled()));
await del.click();
await a.waitForURL((u) => new URL(u).pathname === "/events");
ok(
  "excluir volta para a lista de eventos, sem o evento",
  (await a.getByRole("link", { name: `Evento Excluir ${T}` }).count()) === 0,
);
ok(
  "banco: evento, inscrições, sorteio, jogos e lances foram apagados",
  sql(
    `select (select count(*) from events where id='${E3}')+(select count(*) from registrations where "eventId"='${E3}')+(select count(*) from stage_runs where id='${run3}')+(select count(*) from matches where id='${m3}')+(select count(*) from match_events where "matchId"='${m3}')+(select count(*) from event_stages where "eventId"='${E3}')+(select count(*) from event_categories where "eventId"='${E3}')`,
  ) === "0",
);
ok(
  "atletas e times continuam no cadastro",
  sql(
    `select (select count(*) from athletes where id in ('${a3}','${a4}'))||'|'||(select count(*) from teams where id in ('${t3}','${t4}'))`,
  ) === "2|2",
);
ok(
  "o outro evento da organização não foi tocado",
  sql(`select count(*) from events where id='${E1}'`) === "1",
);
await a.goto(`${BASE}/events/${E3}`, { waitUntil: "networkidle" });
ok(
  "abrir o evento excluído dá 404",
  /could not be found/i.test(await a.locator("body").innerText()),
);
const pubPage = await (await browser.newContext()).newPage();
await pubPage.goto(`${BASE}/watch/events/${E3}`, { waitUntil: "networkidle" });
ok(
  "a página pública do evento excluído também dá 404",
  /could not be found/i.test(await pubPage.locator("body").innerText()),
);
await a.goto(`${BASE}/events/${E1}`, { waitUntil: "networkidle" });
await a.getByRole("button", { name: "Excluir" }).click();
await a.locator("#del-confirm").fill(`Evento Editado ${T}`);
await a.getByRole("button", { name: "Excluir definitivamente" }).click();
await a.waitForURL((u) => new URL(u).pathname === "/events");
ok(
  "excluir um evento com inscrição de elenco e categorias também funciona",
  sql(`select count(*) from events where id='${E1}'`) === "0",
);
// the copy remains, and is hidden from the public list so tests leave no trace
await a.goto(`${BASE}/events/${E2}`, { waitUntil: "networkidle" });
await a
  .getByRole("switch", { name: "Divulgar este evento na página pública" })
  .click();
await a.waitForTimeout(1000);
ok(
  "evento de teste ocultado ao final",
  sql(`select "publicVisible" from events where id='${E2}'`) === "f",
);
ok("sem erros de JavaScript", errors.length === 0, errors.join(" | "));
console.log(fails === 0 ? "TODOS PASSARAM" : `${fails} FALHAS`);
await browser.close();
