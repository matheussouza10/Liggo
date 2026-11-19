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
const sport =
    sql(`select id from sports where name ilike 'v_lei' and active limit 1`) ||
    sql(`select id from sports where name ilike '%v_lei%' and active limit 1`),
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
const table = JSON.stringify([
  {
    label: "V 3-0",
    points: 3,
    when: { outcome: "WIN", setsFor: 3, setsAgainst: 0 },
  },
  {
    label: "V 3-1",
    points: 3,
    when: { outcome: "WIN", setsFor: 3, setsAgainst: 1 },
  },
  {
    label: "V 3-2",
    points: 2,
    when: { outcome: "WIN", setsFor: 3, setsAgainst: 2 },
  },
  {
    label: "D 2-3",
    points: 1,
    when: { outcome: "LOSS", setsFor: 2, setsAgainst: 3 },
  },
  {
    label: "D 1-3",
    points: 0,
    when: { outcome: "LOSS", setsFor: 1, setsAgainst: 3 },
  },
  {
    label: "D 0-3",
    points: 0,
    when: { outcome: "LOSS", setsFor: 0, setsAgainst: 3 },
  },
]);
const tb = JSON.stringify([
  { key: "WINS", scope: "OVERALL" },
  { key: "POINTS", scope: "OVERALL" },
  { key: "SET_RATIO", scope: "OVERALL" },
  { key: "POINT_RATIO", scope: "OVERALL" },
  { key: "DRAW_LOTS", scope: "OVERALL" },
]);
const cfg = JSON.stringify({
  kind: "SETS",
  setsToWin: 2,
  pointsPerSet: 5,
  decidingSetPoints: 3,
  winByTwo: true,
});
sql(
  `insert into event_rules(id,"eventId","scoringModel","winPoints","drawPoints","lossPoints","allowDraw","pointsTable",tiebreakers,"woScoreFor","woScoreAgainst","woPointsAwarded","matchFormat","bestOf","sportConfig","updatedAt") values('${rid("r")}','${E}','SETS',3,0,0,false,'${table}'::jsonb,'${tb}'::jsonb,3,0,3,'BEST_OF',3,'${cfg}'::jsonb,now())`,
);
const st = rid("s");
sql(
  `insert into event_stages(id,"eventId","order",name,type,"roundRobinLegs","thirdPlaceMatch",seeding,"updatedAt") values('${st}','${E}',1,'Pontos corridos','ROUND_ROBIN',1,false,'RANDOM',now())`,
);
const run = rid("ru");
sql(
  `insert into stage_runs(id,"stageId","categoryId",status,"drawSeed","drawMode","updatedAt") values('${run}','${st}','${cat}','LIVE',1,'RANDOM',now())`,
);
const names = ["Time A", "Time B", "Time C"],
  en = [];
for (const [i, n] of names.entries()) {
  const t = rid("tm"),
    r = rid("rg"),
    e = rid("en");
  en.push(e);
  sql(
    `insert into teams(id,"organizationId",name,"updatedAt") values('${t}','${org}','${n} ${T}',now())`,
  );
  sql(
    `insert into registrations(id,"eventId","categoryId","teamId","createdById","updatedAt") values('${r}','${E}','${cat}','${t}','${u}',now())`,
  );
  sql(
    `insert into stage_entries(id,"stageRunId","registrationId",position,seed) values('${e}','${run}','${r}',${i},${i + 1})`,
  );
}
const M = [rid("mt"), rid("mt"), rid("mt")];
[
  [0, 1],
  [0, 2],
  [1, 2],
].forEach(([h, a], i) =>
  sql(
    `insert into matches(id,"stageRunId",round,position,label,"homeEntryId","awayEntryId",status,"updatedAt") values('${M[i]}','${run}',${i + 1},0,'Rodada ${i + 1}','${en[h]}','${en[a]}','SCHEDULED',now())`,
  ),
);
const M1 = M[0];
const dlg = () => A.getByRole("dialog");
const pt = async (side, n = 1) => {
  for (let i = 0; i < n; i++) {
    await A.getByRole("button", {
      name: `Ponto para Time ${side} ${T}`,
    }).click();
    await A.waitForTimeout(350);
  }
};
const txt = async (id) =>
  (await A.getByTestId(id).innerText()).replace(/\s+/g, " ");
await A.goto(`${BASE}/events/${E}/matches/${M1}`, { waitUntil: "networkidle" });
ok(
  "antes de iniciar não há painel de sets",
  (await A.getByRole("region", { name: "Sets" }).count()) === 0,
);
await A.getByRole("button", { name: "Iniciar jogo" }).click();
ok(
  "ao iniciar, aparece o painel de sets com o alvo do set",
  (await vis(A.getByRole("region", { name: "Sets" }))) &&
    /Set a 5 pontos, com 2 de diferença/.test(await txt("set-target")),
);
ok(
  "em esporte de sets os botões de gol não aparecem",
  (await A.getByRole("button", { name: /^Gol do/ }).count()) === 0,
);
await pt("A", 5);
ok(
  "5-0 fecha o set sozinho: começa o set 2 zerado e o resumo guarda 5-0",
  /0 x 0/.test(await txt("set-score")) &&
    /Sets: 1 x 0 · 5-0/.test(await txt("sets-summary")) &&
    (await vis(A.getByRole("heading", { name: "Set 2" }))),
);
ok(
  "o placar principal mostra os sets ganhos (1 x 0)",
  /1\s*x\s*0/.test(await txt("live-score")),
);
await pt("B", 4);
await pt("A", 4);
ok("4-4 segue aberto", /4 x 4/.test(await txt("set-score")));
await pt("A");
await pt("B");
ok(
  "5-5 não fecha (precisa de 2 de diferença)",
  /5 x 5/.test(await txt("set-score")) &&
    /Sets: 1 x 0/.test(await txt("sets-summary")),
);
// public page mid-match
const P = await (await b.newContext()).newPage();
await P.goto(`${BASE}/watch/matches/${M1}`, { waitUntil: "networkidle" });
ok(
  "a página pública mostra os sets em tempo real",
  (await vis(P.getByTestId("public-sets"))) &&
    /5-0 · 5-5/.test(await P.getByTestId("public-sets").innerText()),
);
await pt("A");
ok("6-5 ainda aberto", /6 x 5/.test(await txt("set-score")));
await pt("A");
ok(
  "7-5 fecha o jogo: decidido, botões de ponto desabilitados e Confirmar disponível",
  /Jogo decidido/.test(await txt("set-target")) &&
    (await A.getByRole("button", {
      name: `Ponto para Time A ${T}`,
    }).isDisabled()) &&
    (await vis(A.getByRole("button", { name: "Confirmar resultado" }))),
);
await A.getByRole("button", { name: `Desfazer ponto de Time A ${T}` }).click();
await A.waitForTimeout(500);
ok(
  "desfazer reabre o set (6-5) e tira o fim de jogo",
  /6 x 5/.test(await txt("set-score")) &&
    (await A.getByRole("button", { name: "Confirmar resultado" }).count()) ===
      0 &&
    /1\s*x\s*0/.test(await txt("live-score")),
);
await A.getByRole("button", { name: `Desfazer ponto de Time B ${T}` }).click();
await A.waitForTimeout(500);
ok(
  "tirar um ponto do visitante (6-4) já deixa o set ganho: o jogo volta a ficar decidido",
  /Jogo decidido/.test(await txt("set-target")) &&
    /6 x 4/.test(await txt("set-score")),
);
await A.getByRole("button", { name: "Confirmar resultado" }).click();
await dlg().waitFor();
ok(
  "confirmar abre o resultado já com os sets e o resumo 2 x 0",
  (await dlg().getByLabel(`Set 1, Time A ${T}`).inputValue()) === "5" &&
    (await dlg().getByLabel(`Set 2, Time A ${T}`).inputValue()) === "6" &&
    (await vis(dlg().getByText("Resultado: 2 x 0 em sets."))),
);
await dlg().getByRole("button", { name: "Salvar resultado" }).click();
await dlg().waitFor({ state: "detached" });
ok(
  "banco: jogo encerrado 2-0 com os 2 sets",
  sql(
    `select m.status||'|'||m."homeScore"||'-'||m."awayScore"||'|'||(select string_agg("homePoints"||':'||"awayPoints",',' order by number) from match_sets where "matchId"=m.id) from matches m where id='${M1}'`,
  ) === "FINISHED|2-0|5:0,6:4",
);
await P.reload({ waitUntil: "networkidle" });
ok(
  "a página pública do jogo encerrado mostra 2 x 0 e os sets",
  /2\s*x\s*0/.test(await P.getByTestId("public-score").innerText()) &&
    /5-0 · 6-4/.test(await P.getByTestId("public-sets").innerText()),
);
sql(`update events set "publicVisible"=false where id='${E}'`);
ok("sem erros de JavaScript", errors.length === 0, errors.join(" | "));
console.log(fails === 0 ? "TODOS PASSARAM" : `${fails} FALHAS`);
await b.close();
