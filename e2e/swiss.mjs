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
const FORMAT = process.argv[2] || "BEST_OF";
const tb = JSON.stringify([
  { key: "POINTS", scope: "OVERALL" },
  { key: "BUCHHOLZ", scope: "OVERALL" },
  { key: "DRAW_LOTS", scope: "OVERALL" },
]);
sql(
  `insert into event_rules(id,"eventId","scoringModel","winPoints","drawPoints","lossPoints","allowDraw",tiebreakers,"woScoreFor","woScoreAgainst","woPointsAwarded","matchFormat","bestOf","awayGoals",penalties,"updatedAt") values('${rid("r")}','${E}','POINTS',1,0.5,0,true,'${tb}'::jsonb,3,0,3,'${FORMAT}',${FORMAT === "BEST_OF" ? 3 : "null"},${FORMAT === "HOME_AWAY" ? "true" : "false"},true,now())`,
);
const st = rid("s");
sql(
  `insert into event_stages(id,"eventId","order",name,type,"roundRobinLegs","thirdPlaceMatch","swissRounds",seeding,"updatedAt") values('${st}','${E}',1,'Suíço','SWISS',1,false,3,'RANKING',now())`,
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
const play = async (h, a, sh, sa) => {
  await go();
  let b1 = A.getByRole("button", {
    name: new RegExp(`^Resultado de Time ${h} .* x Time ${a} `),
  });
  let x = sh,
    y = sa;
  if ((await b1.count()) === 0) {
    b1 = A.getByRole("button", {
      name: new RegExp(`^Resultado de Time ${a} .* x Time ${h} `),
    });
    x = sa;
    y = sh;
  }
  await b1.first().click();
  await dlg().waitFor();
  await dlg().locator("#score-home").fill(String(x));
  await dlg().locator("#score-away").fill(String(y));
  await dlg().getByRole("button", { name: "Salvar resultado" }).click();
  await dlg().waitFor({ state: "detached" });
};
const roundPairs = (r) =>
  sql(
    `select string_agg(least(tn."name",tn2."name")||'/'||greatest(tn."name",tn2."name"),',' order by m.position) from matches m join stage_entries h on h.id=m."homeEntryId" join registrations rh on rh.id=h."registrationId" join teams tn on tn.id=rh."teamId" join stage_entries a on a.id=m."awayEntryId" join registrations ra on ra.id=a."registrationId" join teams tn2 on tn2.id=ra."teamId" where m."stageRunId"='${run}' and m.round=${r}`,
  ).replace(new RegExp(` ${T}`, "g"), "");
const gone = en[3];
const goneReg = sql(
  `select "registrationId" from stage_entries where id='${gone}'`,
);
sql(`delete from stage_entries where id='${gone}'`);
await go();
await A.getByRole("button", { name: "Gerar jogos" }).click();
await vis(A.getByRole("tab", { name: "Jogos" }));
ok(
  "com 3 participantes (ímpar) gera 1 jogo e uma folga para o último cabeça (C)",
  sql(`select count(*) from matches where "stageRunId"='${run}'`) === "2" &&
    sql(
      `select count(*) from matches where "stageRunId"='${run}' and status='WALKOVER' and "awayEntryId" is null and "winnerEntryId"='${en[2]}' and label like '%folga%'`,
    ) === "1",
);
ok("a lista mostra Folga", await vis(A.getByText("Folga").first()));
await A.getByRole("tab", { name: "Classificação" }).click();
ok(
  "quem folgou recebe os pontos de W.O. e 1 jogo na classificação",
  /\b3\b/.test(
    await A.getByRole("row").filter({ hasText: "Time C" }).first().innerText(),
  ),
);
await go();
await A.getByRole("button", { name: "Desfazer jogos" }).click();
ok(
  "a folga não conta como resultado: dá para desfazer os jogos",
  await poll(
    async () =>
      sql(`select count(*) from matches where "stageRunId"='${run}'`) === "0",
  ),
);
sql(
  `insert into stage_entries(id,"stageRunId","registrationId",position,seed) values('${gone}','${run}','${goneReg}',3,4)`,
);
await go();
await A.getByRole("button", { name: "Gerar jogos" }).click();
await vis(A.getByRole("tab", { name: "Jogos" }));
ok(
  "gerar jogos cria só a rodada 1 (2 jogos), com a metade de cima contra a de baixo (A x C, B x D)",
  sql(`select count(*) from matches where "stageRunId"='${run}'`) === "2" &&
    roundPairs(1) === "Time A/Time C,Time B/Time D",
);
await go();
ok(
  "a tela mostra Rodada 1 de 3 e o botão de próxima rodada não aparece com jogos pendentes",
  (await vis(A.getByTestId("swiss-progress"))) &&
    /Rodada 1 de 3/.test(await A.getByTestId("swiss-progress").innerText()) &&
    (await A.getByRole("button", { name: "Gerar próxima rodada" }).count()) ===
      0,
);
ok(
  "concluir a fase está desabilitado",
  await A.getByRole("button", { name: /Concluir fase/ }).isDisabled(),
);
await play("A", "C", 1, 0);
await play("B", "D", 1, 0);
await go();
ok(
  "com a rodada toda jogada aparece Gerar próxima rodada, mas concluir segue desabilitado (faltam rodadas)",
  (await vis(A.getByRole("button", { name: "Gerar próxima rodada" }))) &&
    (await A.getByRole("button", { name: /Concluir fase/ }).isDisabled()),
);
await A.getByRole("button", { name: "Gerar próxima rodada" }).click();
ok(
  "rodada 2 pareia por pontos: vencedores entre si (A x B) e perdedores entre si (C x D)",
  await poll(async () => roundPairs(2) === "Time A/Time B,Time C/Time D"),
);
await play("A", "B", 1, 0);
await play("C", "D", 1, 0);
await go();
await A.getByRole("button", { name: "Gerar próxima rodada" }).click();
ok(
  "rodada 3 não repete adversário: A x D e B x C (os únicos possíveis)",
  await poll(async () => roundPairs(3) === "Time A/Time D,Time B/Time C"),
);
ok(
  "nenhum confronto se repetiu em todo o torneio",
  sql(
    `select count(*) from (select least(m."homeEntryId",m."awayEntryId") a, greatest(m."homeEntryId",m."awayEntryId") b, count(*) c from matches m where m."stageRunId"='${run}' group by 1,2 having count(*)>1) x`,
  ) === "0",
);
await play("A", "D", 1, 0);
await play("B", "C", 1, 0);
await go();
ok(
  "com as 3 rodadas jogadas o botão de próxima rodada some e Concluir fase libera",
  (await A.getByRole("button", { name: "Gerar próxima rodada" }).count()) ===
    0 &&
    !(await A.getByRole("button", { name: /Concluir fase/ }).isDisabled()) &&
    /Rodada 3 de 3/.test(await A.getByTestId("swiss-progress").innerText()),
);
await A.getByRole("tab", { name: "Classificação" }).click();
const rowA = A.getByRole("row").filter({ hasText: "Time A" }).first();
ok(
  "a classificação tem A em 1º com 3 pontos",
  /3/.test(await rowA.innerText()) &&
    (await A.getByRole("row").nth(1).innerText()).includes("Time A"),
);
await A.getByRole("button", { name: /Concluir fase/ }).click();
ok(
  "concluir encerra a fase e mostra o líder",
  (await poll(
    async () =>
      sql(`select status from stage_runs where id='${run}'`) === "DONE",
  )) && (await vis(A.getByText(/Líder: Time A/))),
);
ok(
  "banco: 6 jogos, 3 rodadas de 2",
  sql(
    `select count(*) from matches where "stageRunId"='${run}' and status='FINISHED'`,
  ) === "6" &&
    sql(
      `select count(distinct round) from matches where "stageRunId"='${run}'`,
    ) === "3",
);
sql(`update events set "publicVisible"=false where id='${E}'`);
ok("sem erros de JavaScript", errors.length === 0, errors.join(" | "));
console.log(fails === 0 ? "TODOS PASSARAM" : `${fails} FALHAS`);
await b.close();
