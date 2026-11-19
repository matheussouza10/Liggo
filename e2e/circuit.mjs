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
const sport = sql(`select id from sports where active order by name limit 1`),
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
const cfg = {
  kind: "PERFORMANCE",
  metric: "POINTS",
  bestIs: "HIGHEST",
  attempts: 3,
  finalists: null,
  extraAttempts: null,
  aggregation: "SUM",
};
const tbs = [{ key: "COUNTBACK_PLACES", scope: "OVERALL" }];
const place = JSON.stringify(
  [25, 18, 15, 12, 10].map((p, i) => ({ place: i + 1, points: p })),
);
sql(
  `insert into event_rules(id,"eventId","scoringModel","winPoints","drawPoints","lossPoints","allowDraw",tiebreakers,"woScoreFor","woScoreAgainst","woPointsAwarded","sportConfig","placePoints","dropWorst","updatedAt") values('${rid("r")}','${E}','PERFORMANCE',0,0,0,false,'${JSON.stringify(tbs)}'::jsonb,0,0,0,'${JSON.stringify(cfg)}'::jsonb,'${place}'::jsonb,1,now())`,
);
const st = rid("s");
sql(
  `insert into event_stages(id,"eventId","order",name,type,"roundRobinLegs","thirdPlaceMatch",seeding,"updatedAt") values('${st}','${E}',1,'Prova','PERFORMANCE',1,false,'RANKING',now())`,
);
const run = rid("ru");
sql(
  `insert into stage_runs(id,"stageId","categoryId",status,"drawSeed","drawMode","updatedAt") values('${run}','${st}','${cat}','DRAWN',1,'RANDOM',now())`,
);
const names = ["Time A", "Time B", "Time C", "Time D"],
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
const poll = async (fn, t = 8000) => {
  const end = Date.now() + t;
  while (Date.now() < end) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
};
const dlg = () => A.getByRole("dialog");
const go = async () => {
  await A.goto(`${BASE}/events/${E}/stages/${st}`, {
    waitUntil: "networkidle",
  });
};
const nm = (l) => `Time ${l} ${T}`;
const launch = async (l, attempts) => {
  await go();
  await A.getByRole("button", {
    name: `Lançar tentativas de ${nm(l)}`,
  }).click();
  await dlg().waitFor();
  for (const [i, a] of attempts.entries()) {
    const st_ = a.status || "OK";
    if (st_ !== "OK")
      await dlg()
        .getByLabel(`Situação da tentativa ${i + 1}`)
        .selectOption(st_);
    else
      await dlg()
        .getByLabel(`Valor da tentativa ${i + 1}`)
        .fill(a.v);
  }
  await dlg().getByRole("button", { name: "Salvar tentativas" }).click();
};
const saved = async (l, attempts) => {
  await launch(l, attempts);
  await dlg().waitFor({ state: "detached" });
};
const rows = async () =>
  (await A.getByRole("table").first().locator("tbody tr").allInnerTexts()).map(
    (t) => t.replace(/\s+/g, " ").trim(),
  );
const order = async () =>
  (await rows()).map((r) => (r.match(/Time ([A-D])/) || [])[1]).join("");
await go();
ok(
  "antes de começar o botão diz Iniciar prova (não Gerar jogos)",
  (await vis(A.getByRole("button", { name: "Iniciar prova" }))) &&
    (await A.getByRole("button", { name: "Gerar jogos" }).count()) === 0,
);
await A.getByRole("button", { name: "Iniciar prova" }).click();
ok(
  "a prova inicia sem partidas e abre a aba Resultados com os 4 participantes",
  (await vis(A.getByRole("tab", { name: "Resultados" }))) &&
    (await rows()).length === 4 &&
    sql(`select count(*) from matches where "stageRunId"='${run}'`) === "0" &&
    sql(`select status from stage_runs where id='${run}'`) === "LIVE",
);
await go();
await A.getByRole("button", {
  name: `Lançar tentativas de ${nm("A")}`,
}).click();
await dlg().waitFor();
ok(
  "o diálogo fala de etapas e pede a posição",
  (await vis(dlg().getByText(/Posição na etapa: 1, 2, 3/))) &&
    (await vis(dlg().getByText("Etapa 1"))) &&
    (await dlg()
      .getByLabel(/^Valor da tentativa/)
      .count()) === 3,
);
await dlg().getByLabel("Valor da tentativa 1").fill("0");
await dlg().getByRole("button", { name: "Salvar tentativas" }).click();
ok(
  "posição inválida é recusada",
  await vis(dlg().getByText(/Informe a posição na etapa/)),
);
await dlg().getByRole("button", { name: "Cancelar" }).click();
await dlg().waitFor({ state: "detached" });
ok(
  "a tela mostra a tabela de pontos e o descarte do pior",
  (await vis(A.getByText(/1º 25, 2º 18, 3º 15, 4º 12, 5º 10/))) &&
    (await vis(A.getByText(/Os 1 piores resultados são descartados/))),
);
await saved("A", [{ v: "1" }, { v: "3" }, { v: "2" }]);
await saved("B", [{ v: "2" }, { v: "1" }, { v: "4" }]);
await saved("C", [{ v: "3" }, { v: "5" }, { v: "1" }]);
await saved("D", [{ v: "4" }, { v: "4" }, { status: "DNS" }]);
ok(
  "A: etapas 1º · 3º · 2º com 43 pontos (58 menos o pior, 15)",
  await poll(async () => {
    const r = (await rows()).find((x) => x.includes("Time A"));
    return !!r && r.includes("1º · 3º · 2º") && /\b43\b/.test(r);
  }),
);
ok(
  "A e B empatam em 43 e A fica à frente pela contagem de colocações (tem um 3º): A, B, C, D",
  (await poll(async () => (await order()) === "ABCD")) &&
    (await A.getByText("Empate").count()) === 0,
);
const r = await rows();
ok(
  "pontos: B 43, C 40 (50 menos 10), D 24 (12+12, com a etapa sem resultado descartada)",
  /\b43\b/.test(r[1]) &&
    /\b40\b/.test(r[2]) &&
    /\b24\b/.test(r[3]) &&
    r[3].includes("DNS"),
);
await go();
await A.getByRole("button", { name: "Concluir prova" }).click();
ok(
  "concluir exige todas as etapas de todos e termina com o líder do circuito",
  (await poll(
    async () =>
      sql(`select status from stage_runs where id='${run}'`) === "DONE",
  )) && (await vis(A.getByText(/Vencedor: Time A .*43/))),
);
const P = await (await b.newContext()).newPage();
await P.goto(`${BASE}/watch/events/${E}`, { waitUntil: "networkidle" });
ok(
  "a página pública mostra a classificação do circuito",
  (await vis(P.getByText(/1º 25, 2º 18/))) &&
    (await P.getByRole("table").first().locator("tbody tr").count()) === 4,
);
sql(`update events set "publicVisible"=false where id='${E}'`);
ok("sem erros de JavaScript", errors.length === 0, errors.join(" | "));
console.log(fails === 0 ? "TODOS PASSARAM" : `${fails} FALHAS`);
await b.close();
