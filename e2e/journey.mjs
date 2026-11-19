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
    .first()
    .waitFor({ timeout: t })
    .then(() => true)
    .catch(() => false);
const b = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const errors = [];
const A = await (
  await b.newContext({ viewport: { width: 1440, height: 1500 } })
).newPage();
A.setDefaultTimeout(12000);
A.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
const o = A.getByLabel.bind(A);
A.getByLabel = (l, x) => o(l, x).filter({ visible: true });
await A.goto(BASE + "/signup", { waitUntil: "networkidle" });
await A.getByLabel("Nome da organização").fill(`Sets ${T}`);
await A.getByLabel("Nome do responsável").fill("Dono Sets");
await A.getByLabel("E-mail").fill(`st.${T}@example.com`);
await A.getByLabel("Senha", { exact: true }).fill(PASS);
await A.getByLabel("Confirmar senha").fill(PASS);
await A.getByRole("checkbox").check();
await A.getByRole("button", { name: /Criar conta/ }).click();
await A.waitForURL((u) => new URL(u).pathname === "/dashboard");
const org = sql(
    `select "organizationId" from users where email='st.${T}@example.com'`,
  ),
  u = sql(`select id from users where email='st.${T}@example.com'`);
const sport = sql(
    `select id from sports where name ilike '%futsal%' and active limit 1`,
  ),
  type = sql(`select id from event_types limit 1`),
  fmt = sql(`select id from competition_formats limit 1`);
const E = rid("ev");
sql(
  `insert into events(id,"organizationId","createdById",name,"startDate","endDate","eventTypeId","formatId","sportId","participationType","locationName","publicVisible","updatedAt") values('${E}','${org}','${u}','Copa Vôlei ${T}','2026-12-05','2026-12-06','${type}','${fmt}','${sport}','TEAM','Ginásio',true,now())`,
);
const cat = rid("c");
sql(
  `insert into event_categories(id,"eventId",name,gender,"rosterMin","sortOrder","updatedAt") values('${cat}','${E}','Geral','MIXED',1,0,now())`,
);
const poll = async (fn, t = 10000) => {
  const end = Date.now() + t;
  while (Date.now() < end) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
};
const J = () => A.getByRole("region", { name: "Jornada do evento" });
const stepState = async (title) =>
  J()
    .getByRole("listitem", { name: new RegExp(`^${title}: `) })
    .getAttribute("data-state");
const stepText = async (title) =>
  (
    await J()
      .getByRole("listitem", { name: new RegExp(`^${title}: `) })
      .innerText()
  ).replace(/\s+/g, " ");
const go = async () => {
  await A.goto(`${BASE}/events/${E}`, { waitUntil: "networkidle" });
};
const warnings = async () =>
  (
    await J()
      .getByRole("list", { name: "Avisos" })
      .locator("li")
      .allInnerTexts()
      .catch(() => [])
  ).map((t) => t.replace(/\s+/g, " "));
await go();
ok("a página do evento mostra a Jornada do evento", await vis(J()));
ok(
  "evento novo: Regras e fases é o passo atual, com o botão Configurar regras",
  (await stepState("Regras e fases")) === "current" &&
    (await vis(J().getByRole("link", { name: "Configurar regras" }))) &&
    /Próximo passo: Regras e fases/.test(await J().innerText()),
);
ok(
  "Categorias já está feito (categoria padrão) e os passos de sorteio, jogos e encerramento aguardam",
  (await stepState("Categorias")) === "done" &&
    (await stepState("Sorteio")) === "blocked" &&
    (await stepState("Jogos e resultados")) === "blocked" &&
    (await stepState("Encerramento")) === "blocked",
);
await J().getByRole("link", { name: "Configurar regras" }).click();
await A.waitForURL((u) => new URL(u).pathname === `/events/${E}/rules`);
ok("o botão leva às regras do evento", true);
// rules + a league stage, 3 registrations
sql(
  `insert into event_rules(id,"eventId","scoringModel","winPoints","drawPoints","lossPoints","allowDraw",tiebreakers,"woScoreFor","woScoreAgainst","woPointsAwarded","updatedAt") values('${rid("r")}','${E}','POINTS',3,1,0,true,'[{"key":"POINTS","scope":"OVERALL"}]'::jsonb,3,0,3,now())`,
);
const s1 = rid("s");
sql(
  `insert into event_stages(id,"eventId","order",name,type,"groupCount","groupSize","advancingPerGroup","roundRobinLegs","thirdPlaceMatch",seeding,"updatedAt") values('${s1}','${E}',1,'Pontos corridos','ROUND_ROBIN',null,null,null,1,false,'RANDOM',now())`,
);
await go();
ok(
  "com regras e fase, o passo atual vira Inscrições",
  (await stepState("Regras e fases")) === "done" &&
    (await stepState("Inscrições")) === "current" &&
    /Nenhuma inscrição/.test(await stepText("Inscrições")),
);
const en = [];
for (const i of [1, 2, 3]) {
  const tm = rid("tm"),
    rg = rid("rg");
  sql(
    `insert into teams(id,"organizationId",name,"updatedAt") values('${tm}','${org}','Time ${i} ${T}',now())`,
  );
  sql(
    `insert into registrations(id,"eventId","categoryId","teamId","createdById","updatedAt") values('${rg}','${E}','${cat}','${tm}','${u}',now())`,
  );
  en.push(rg);
}
await go();
ok(
  "com 3 inscrições o passo Inscrições está feito e o próximo é o Sorteio, citando a categoria",
  (await stepState("Inscrições")) === "done" &&
    (await stepState("Sorteio")) === "current" &&
    /Falta sortear Geral/.test(await stepText("Sorteio")),
);
ok(
  "o progresso aumentou",
  Number(await J().getByRole("progressbar").getAttribute("aria-valuenow")) >=
    40,
);
// run + matches
const run = rid("ru");
sql(
  `insert into stage_runs(id,"stageId","categoryId",status,"drawSeed","drawMode","updatedAt") values('${run}','${s1}','${cat}','LIVE',1,'RANDOM',now())`,
);
const ent = [];
for (const [i, rg] of en.entries()) {
  const e = rid("en");
  ent.push(e);
  sql(
    `insert into stage_entries(id,"stageRunId","registrationId",position,seed) values('${e}','${run}','${rg}',${i},${i + 1})`,
  );
}
[
  [0, 1],
  [0, 2],
  [1, 2],
].forEach(([h, a], k) =>
  sql(
    `insert into matches(id,"stageRunId",round,position,label,"homeEntryId","awayEntryId",status,"homeScore","awayScore","updatedAt") values('${rid("mt")}','${run}',${k + 1},0,'Rodada ${k + 1}','${ent[h]}','${ent[a]}',${k === 0 ? "'FINISHED'" : "'SCHEDULED'"},${k === 0 ? "1" : "null"},${k === 0 ? "0" : "null"},now())`,
  ),
);
await go();
ok(
  "com o sorteio feito e 1 de 3 jogos disputado, o passo Jogos está em andamento com o progresso",
  (await stepState("Sorteio")) === "done" &&
    (await stepState("Jogos e resultados")) === "current" &&
    /1 de 3 jogos com resultado/.test(await stepText("Jogos e resultados")),
);
// warnings
sql(
  `insert into registration_requests(id,"eventId","categoryId",status,"teamName","contactName","contactEmail","consentAt","tokenHash","updatedAt") values('${rid("rq")}','${E}','${cat}','PENDING','Pedido','C','c@x.com',now(),'${rid("h")}${rid("h")}',now())`,
);
sql(
  `update events set "registrationOpen"=true, "publicVisible"=false where id='${E}'`,
);
await go();
const w = await warnings();
ok(
  "aviso de pedido pendente com link para a fila",
  w.some((x) => /1 pedido de inscrição aguarda a sua resposta/.test(x)) &&
    (await J()
      .getByRole("link", { name: /Resolver/ })
      .count()) >= 1,
);
ok(
  "aviso de inscrições abertas com evento oculto",
  w.some((x) => /inscrições estão abertas, mas o evento está oculto/.test(x)),
);
await J()
  .getByRole("list", { name: "Avisos" })
  .locator("li", { hasText: "pedido de inscrição" })
  .getByRole("link", { name: /Resolver/ })
  .click();
await A.waitForURL((u) => new URL(u).pathname === `/events/${E}/requests`);
ok("Resolver leva à fila de pedidos", true);
// short category warning with a groups stage
sql(
  `update event_stages set type='GROUPS', "groupCount"=4, "groupSize"=4, "advancingPerGroup"=2 where id='${s1}'`,
);
sql(`delete from matches where "stageRunId"='${run}'`);
sql(`delete from stage_runs where id='${run}'`);
await go();
ok(
  "com grupos 4x, uma categoria com 3 inscritos recebe aviso do mínimo (8), citando o nome",
  (await warnings()).some((x) =>
    /Geral tem menos de 8 inscritos, o mínimo para a 1ª fase \(Pontos corridos\)/.test(
      x,
    ),
  ) &&
    (await stepState("Inscrições")) === "current" &&
    (await stepState("Sorteio")) === "blocked",
);
// finished
sql(
  `update event_stages set type='ROUND_ROBIN', "groupCount"=null where id='${s1}'`,
);
sql(
  `insert into stage_runs(id,"stageId","categoryId",status,"drawSeed","drawMode","updatedAt") values('${rid("ru")}','${s1}','${cat}','DONE',1,'RANDOM',now())`,
);
await go();
ok(
  "com todas as fases concluídas, o encerramento está feito e o progresso é 100%",
  (await stepState("Encerramento")) === "done" &&
    (await J().getByRole("progressbar").getAttribute("aria-valuenow")) ===
      "100" &&
    /Tudo concluído/.test(await J().innerText()),
);
sql(`update events set "publicVisible"=false where id='${E}'`);
ok("sem erros de JavaScript", errors.length === 0, errors.join(" | "));
console.log(fails === 0 ? "TODOS PASSARAM" : `${fails} FALHAS`);
await b.close();
