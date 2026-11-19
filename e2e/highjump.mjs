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
  metric: "HEIGHT",
  bestIs: "HIGHEST",
  attempts: 3,
  finalists: null,
  extraAttempts: null,
  aggregation: "BEST",
};
const tbs = [
  { key: "JUMPS_AT_FINAL_HEIGHT", scope: "OVERALL" },
  { key: "TOTAL_FAILURES", scope: "OVERALL" },
];
sql(
  `insert into event_rules(id,"eventId","scoringModel","winPoints","drawPoints","lossPoints","allowDraw",tiebreakers,"woScoreFor","woScoreAgainst","woPointsAwarded","sportConfig","updatedAt") values('${rid("r")}','${E}','PERFORMANCE',0,0,0,false,'${JSON.stringify(tbs)}'::jsonb,0,0,0,'${JSON.stringify(cfg)}'::jsonb,now())`,
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
  "o diálogo é de barra progressiva: Salto 1, Adicionar salto e Passou (O)/Falhou (X)",
  (await vis(dlg().getByText("Salto 1"))) &&
    (await vis(dlg().getByRole("button", { name: "Adicionar salto" }))) &&
    (
      await dlg()
        .getByLabel("Situação da tentativa 1")
        .locator("option")
        .allInnerTexts()
    )
      .join("|")
      .includes("Passou a altura (O)") &&
    (
      await dlg()
        .getByLabel("Situação da tentativa 1")
        .locator("option")
        .allInnerTexts()
    )
      .join("|")
      .includes("Falhou (X)"),
);
await dlg().getByRole("button", { name: "Cancelar" }).click();
await dlg().waitFor({ state: "detached" });
ok(
  "a tela explica a barra progressiva",
  await vis(A.getByText(/Barra progressiva: lance cada salto/)),
);
const jumps = async (l, list, expectSaved = true) => {
  await go();
  await A.getByRole("button", {
    name: `Lançar tentativas de ${nm(l)}`,
  }).click();
  await dlg().waitFor();
  const need = list.length;
  let have = await dlg()
    .getByLabel(/^Valor da tentativa/)
    .count();
  while (have < need) {
    await dlg().getByRole("button", { name: "Adicionar salto" }).click();
    have++;
  }
  for (const [i, j] of list.entries()) {
    await dlg()
      .getByLabel(`Situação da tentativa ${i + 1}`)
      .selectOption(j.s);
    await dlg()
      .getByLabel(`Valor da tentativa ${i + 1}`)
      .fill(j.v);
  }
  await dlg().getByRole("button", { name: "Salvar tentativas" }).click();
  if (expectSaved) await dlg().waitFor({ state: "detached" });
};
const O = (v) => ({ s: "OK", v }),
  X = (v) => ({ s: "NM", v });
await jumps("A", [X("2,00"), X("2,00"), X("2,00"), O("2,00")], false);
ok(
  "depois de 3 falhas seguidas não aceita mais saltos",
  await vis(dlg().getByText(/já foi eliminado \(3 falhas seguidas\)/)),
);
await dlg().getByRole("button", { name: "Cancelar" }).click();
await dlg().waitFor({ state: "detached" });
await jumps("A", [O("2,00"), O("2,00")], false);
ok(
  "quem passou uma altura não salta nela de novo",
  await vis(dlg().getByText(/não salta nela de novo/)),
);
await dlg().getByRole("button", { name: "Cancelar" }).click();
await dlg().waitFor({ state: "detached" });
await jumps("A", [O("2,10"), X("2,05")], false);
ok("a barra só sobe", await vis(dlg().getByText(/a barra só sobe/)));
await dlg().getByRole("button", { name: "Cancelar" }).click();
await dlg().waitFor({ state: "detached" });
await jumps("A", [
  O("2,00"),
  X("2,05"),
  O("2,05"),
  X("2,10"),
  X("2,10"),
  X("2,10"),
]);
await jumps("B", [
  X("2,00"),
  O("2,00"),
  O("2,05"),
  X("2,10"),
  X("2,10"),
  X("2,10"),
]);
await jumps("C", [O("2,00"), O("2,05"), X("2,10"), X("2,10"), X("2,10")]);
await jumps("D", [O("2,00"), O("2,05"), O("2,10")]);
ok(
  "D (2,10 m) vence; depois C, B, A pelos desempates: menos saltos na altura final e menos falhas",
  await poll(async () => (await order()) === "DCBA"),
);
const r = await rows();
ok(
  "cada salto aparece com altura e O ou X",
  r[3].includes("2,00 O · 2,05 X · 2,05 O · 2,10 X · 2,10 X · 2,10 X") &&
    /2,05 m/.test(r[3]),
);
ok(
  "sem empates marcados: A, B e C empatam em altura mas os desempates separam",
  (await A.getByText("Empate").count()) === 0,
);
ok(
  "banco: o salto falhado guarda a altura (2,05) e o resultado de A é a maior altura saltada",
  sql(
    `select string_agg(status||':'||coalesce(value::text,'-'),',' order by number) from performance_attempts where "entryId"='${en[0]}'`,
  ) === "OK:2,NM:2.05,OK:2.05,NM:2.1,NM:2.1,NM:2.1",
);
await go();
await A.getByRole("button", { name: "Concluir prova" }).click();
ok(
  "concluir mostra o vencedor",
  (await poll(
    async () =>
      sql(`select status from stage_runs where id='${run}'`) === "DONE",
  )) && (await vis(A.getByText(/Vencedor: Time D .*2,10 m/))),
);
const P = await (await b.newContext()).newPage();
await P.goto(`${BASE}/watch/events/${E}`, { waitUntil: "networkidle" });
ok(
  "a página pública mostra o ranking com os saltos",
  await vis(P.getByText(/2,00 O · 2,05 O · 2,10 O/)),
);
sql(`update events set "publicVisible"=false where id='${E}'`);
ok("sem erros de JavaScript", errors.length === 0, errors.join(" | "));
console.log(fails === 0 ? "TODOS PASSARAM" : `${fails} FALHAS`);
await b.close();
