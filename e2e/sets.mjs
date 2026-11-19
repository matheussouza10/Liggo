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
  setsToWin: 3,
  pointsPerSet: 25,
  decidingSetPoints: 15,
  winByTwo: true,
});
sql(
  `insert into event_rules(id,"eventId","scoringModel","winPoints","drawPoints","lossPoints","allowDraw","pointsTable",tiebreakers,"woScoreFor","woScoreAgainst","woPointsAwarded","matchFormat","bestOf","sportConfig","updatedAt") values('${rid("r")}','${E}','SETS',3,0,0,false,'${table}'::jsonb,'${tb}'::jsonb,3,0,3,'BEST_OF',5,'${cfg}'::jsonb,now())`,
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
const open = async () => {
  await A.goto(`${BASE}/events/${E}/stages/${st}`, {
    waitUntil: "networkidle",
  });
  await A.getByRole("button", {
    name: /^Resultado de Time A .* x Time B/,
  }).click();
  await dlg().waitFor();
};
const setIn = async (n, h, a) => {
  await dlg().getByLabel(`Set ${n}, Time A ${T}`).fill(String(h));
  await dlg().getByLabel(`Set ${n}, Time B ${T}`).fill(String(a));
};

await open();
ok(
  "com sets, o diálogo mostra linhas de set (e não o placar simples)",
  (await vis(dlg().getByText("Set 1"))) &&
    (await A.locator("#score-home").count()) === 0,
);
ok(
  "sem nenhum set, o botão Salvar fica desabilitado",
  await dlg().getByRole("button", { name: "Salvar resultado" }).isDisabled(),
);
await setIn(1, 25, 24);
ok(
  "set 25-24 é recusado com o motivo da diferença de 2",
  (await vis(dlg().getByText(/Set 1: É preciso vencer por 2/))) &&
    (await dlg()
      .getByRole("button", { name: "Salvar resultado" })
      .isDisabled()),
);
await setIn(1, 25, 20);
await dlg().getByRole("button", { name: "Adicionar set" }).click();
await setIn(2, 25, 22);
ok(
  "enquanto ninguém chegou a 3 sets, mostra o andamento",
  (await vis(dlg().getByText("Sets: 2 x 0. Vence quem chegar a 3."))) &&
    (await dlg()
      .getByRole("button", { name: "Salvar resultado" })
      .isDisabled()),
);
await dlg().getByRole("button", { name: "Adicionar set" }).click();
await setIn(3, 25, 18);
ok(
  "3-0 fecha o jogo: resumo, sem botão de novo set, Salvar liberado",
  (await vis(dlg().getByText("Resultado: 3 x 0 em sets."))) &&
    (await dlg().getByRole("button", { name: "Adicionar set" }).count()) ===
      0 &&
    !(await dlg()
      .getByRole("button", { name: "Salvar resultado" })
      .isDisabled()),
);
await dlg().getByRole("button", { name: "Salvar resultado" }).click();
await dlg().waitFor({ state: "detached" });
ok(
  "a lista mostra 3 x 0 e o parcial dos sets",
  (await vis(A.getByText("25-20 · 25-22 · 25-18"))) &&
    (await vis(A.getByText("3 x 0").first())),
);
ok(
  "banco: placar em sets, vencedor e 3 sets gravados",
  sql(
    `select "homeScore"||'-'||"awayScore"||'|'||status||'|'||("winnerEntryId"="homeEntryId")||'|'||(select count(*) from match_sets where "matchId"='${M1}')||'|'||(select string_agg("homePoints"||':'||"awayPoints",',' order by number) from match_sets where "matchId"='${M1}') from matches where id='${M1}'`,
  ) === "3-0|FINISHED|true|3|25:20,25:22,25:18",
);
await A.getByRole("tab", { name: "Classificação" }).click();
ok(
  "a tabela mostra colunas de Sets e Pontos, sem Empates",
  (await vis(A.getByRole("columnheader", { name: "Sets" }))) &&
    (await vis(A.getByRole("columnheader", { name: "Pontos" }))) &&
    (await A.getByRole("columnheader", { name: "E", exact: true }).count()) ===
      0,
);
const rowA = A.getByRole("row")
  .filter({ hasText: `Time A ${T}` })
  .first();
ok(
  "Time A: 3 pontos (3-0), sets 3:0 e pontos 75:60",
  /\b3\b/.test(await rowA.innerText()) &&
    (await rowA.innerText()).includes("3:0") &&
    (await rowA.innerText()).includes("75:60"),
);
// correct to 3-2 with the deciding set to 15
await A.getByRole("tab", { name: "Jogos" }).click();
await A.getByRole("button", {
  name: /^Resultado de Time A .* x Time B/,
}).click();
await dlg().waitFor();
ok(
  "ao reabrir o resultado, os sets vêm preenchidos",
  (await dlg().getByLabel(`Set 2, Time A ${T}`).inputValue()) === "25",
);
await dlg().getByRole("button", { name: "Remover set 3" }).click();
for (const [n, h, a] of [
  [3, 23, 25],
  [4, 20, 25],
  [5, 15, 13],
]) {
  await dlg().getByRole("button", { name: "Adicionar set" }).click();
  await setIn(n, h, a);
}
ok(
  "5º set é o decisivo: 15-13 fecha 3 x 2",
  await vis(dlg().getByText("Resultado: 3 x 2 em sets.")),
);
await dlg().getByLabel(`Set 5, Time A ${T}`).fill("25");
await dlg().getByLabel(`Set 5, Time B ${T}`).fill("20");
ok(
  "no decisivo, 25-20 é recusado (passou de 15 sem diferença de 2)",
  await vis(
    dlg().getByText(
      /Set 5: Depois de 15, o set termina com 2 pontos de diferença/,
    ),
  ),
);
await setIn(5, 15, 13);
await dlg().getByRole("button", { name: "Salvar resultado" }).click();
await dlg().waitFor({ state: "detached" });
ok(
  "banco: corrigido para 3-2 com 5 sets (os antigos foram substituídos)",
  sql(
    `select "homeScore"||'-'||"awayScore"||'|'||(select count(*) from match_sets where "matchId"='${M1}') from matches where id='${M1}'`,
  ) === "3-2|5",
);
await A.getByRole("tab", { name: "Classificação" }).click();
ok(
  "vitória por 3-2 vale 2 pontos e a derrota por 2-3 vale 1 (tabela FIVB)",
  /\b2\b/.test(
    await A.getByRole("row")
      .filter({ hasText: `Time A ${T}` })
      .first()
      .innerText(),
  ) &&
    /\b1\b/.test(
      await A.getByRole("row")
        .filter({ hasText: `Time B ${T}` })
        .first()
        .innerText(),
    ),
);
// WO stores no sets
await A.getByRole("tab", { name: "Jogos" }).click();
await A.getByRole("button", {
  name: /^Resultado de Time A .* x Time C/,
}).click();
await dlg().waitFor();
await dlg()
  .getByLabel("W.O.")
  .selectOption({ label: `Time C ${T} vence por W.O.` });
await dlg().getByRole("button", { name: "Salvar resultado" }).click();
await dlg().waitFor({ state: "detached" });
ok(
  "W.O. segue as regras (0 a 3) e não grava sets",
  sql(
    `select "homeScore"||'-'||"awayScore"||'|'||status||'|'||(select count(*) from match_sets where "matchId"='${M[1]}') from matches where id='${M[1]}'`,
  ) === "0-3|WALKOVER|0",
);
// clear
await A.getByRole("button", {
  name: /^Resultado de Time A .* x Time B/,
}).click();
await dlg().waitFor();
await dlg().getByRole("button", { name: "Limpar resultado" }).click();
await dlg().waitFor({ state: "detached" });
ok(
  "limpar o resultado apaga os sets e reabre o jogo",
  sql(
    `select status||'|'||coalesce("homeScore"::text,'-')||'|'||(select count(*) from match_sets where "matchId"='${M1}') from matches where id='${M1}'`,
  ) === "SCHEDULED|-|0",
);
// public page
const P = await (await b.newContext()).newPage();
await P.goto(`${BASE}/watch/events/${E}`, { waitUntil: "networkidle" });
ok(
  "a página pública mostra a classificação por sets",
  await vis(P.getByRole("columnheader", { name: "Sets" })),
);
sql(`update events set "publicVisible"=false where id='${E}'`);
ok("sem erros de JavaScript", errors.length === 0, errors.join(" | "));
console.log(fails === 0 ? "TODOS PASSARAM" : `${fails} FALHAS`);
await b.close();
