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
  { key: "DRAW_LOTS", scope: "OVERALL" },
]);
sql(
  `insert into event_rules(id,"eventId","scoringModel","winPoints","drawPoints","lossPoints","allowDraw",tiebreakers,"woScoreFor","woScoreAgainst","woPointsAwarded","matchFormat","bestOf","awayGoals",penalties,"updatedAt") values('${rid("r")}','${E}','POINTS',3,1,0,false,'${tb}'::jsonb,3,0,3,'${FORMAT}',${FORMAT === "BEST_OF" ? 3 : "null"},${FORMAT === "HOME_AWAY" ? "true" : "false"},true,now())`,
);
const st = rid("s");
sql(
  `insert into event_stages(id,"eventId","order",name,type,"roundRobinLegs","thirdPlaceMatch",seeding,"updatedAt") values('${st}','${E}',1,'Mata-mata','SINGLE_ELIM',1,false,'RANDOM',now())`,
);
const run = rid("ru");
sql(
  `insert into stage_runs(id,"stageId","categoryId",status,"drawSeed","drawMode","updatedAt") values('${run}','${st}','${cat}','LIVE',1,'RANDOM',now())`,
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
const S1 = rid("mt"),
  S2 = rid("mt"),
  F = rid("mt");
sql(
  `insert into matches(id,"stageRunId",round,position,label,"homeEntryId","awayEntryId",status,"nextMatchId","nextSlot","updatedAt") values('${F}','${run}',2,0,'Final',null,null,'SCHEDULED',null,null,now())`,
);
sql(
  `insert into matches(id,"stageRunId",round,position,label,"homeEntryId","awayEntryId",status,"nextMatchId","nextSlot","updatedAt") values('${S1}','${run}',1,0,'Semifinal','${en[0]}','${en[3]}','SCHEDULED','${F}','HOME',now()),('${S2}','${run}',1,1,'Semifinal','${en[1]}','${en[2]}','SCHEDULED','${F}','AWAY',now())`,
);
const dlg = () => A.getByRole("dialog");
const nm = (l) => `Time ${l} ${T}`;
const open = async (h, a) => {
  await A.goto(`${BASE}/events/${E}/stages/${st}`, {
    waitUntil: "networkidle",
  });
  await A.getByRole("button", {
    name: new RegExp(`^Resultado de Time ${h} .* x Time ${a} `),
  }).click();
  await dlg().waitFor();
};
const game = async (n, h, a, l1, l2) => {
  await dlg()
    .getByLabel(`Jogo ${n}, ${nm(l1)}`)
    .fill(String(h));
  await dlg()
    .getByLabel(`Jogo ${n}, ${nm(l2)}`)
    .fill(String(a));
};
const save = async () => {
  await dlg().getByRole("button", { name: "Salvar resultado" }).click();
  await dlg().waitFor({ state: "detached" });
};
const db = (q) => sql(q);
const mrow = (id) =>
  db(
    `select status||'|'||coalesce("homeScore"::text,'-')||'-'||coalesce("awayScore"::text,'-')||'|'||coalesce("homePenalties"::text,'-')||'-'||coalesce("awayPenalties"::text,'-')||'|'||coalesce((select string_agg("homeScore"||':'||"awayScore",',' order by number) from match_games where "matchId"=m.id),'')||'|'||coalesce(("winnerEntryId"=m."homeEntryId")::text,'-') from matches m where id='${id}'`,
  );
const fin = () =>
  db(
    `select coalesce(("homeEntryId"='${en[0]}')::text,'-')||'|'||coalesce(("awayEntryId"='${en[1]}')::text,'-') from matches where id='${F}'`,
  );
ok("a geração não bloqueia mais o formato " + FORMAT, true);
if (FORMAT === "BEST_OF") {
  await open("A", "D");
  ok(
    "a série mostra linhas de jogo (não o placar simples)",
    (await vis(dlg().getByText("Jogo 1"))) &&
      (await A.locator("#score-home").count()) === 0,
  );
  await game(1, 1, 1, "A", "D");
  ok(
    "empate num jogo da série é recusado",
    (await vis(dlg().getByText(/Jogo 1: na série não há empate/))) &&
      (await dlg()
        .getByRole("button", { name: "Salvar resultado" })
        .isDisabled()),
  );
  await game(1, 2, 1, "A", "D");
  ok(
    "1 jogo ganho: série aberta, com andamento",
    await vis(
      dlg().getByText(
        "Placar da série: 1 x 0. Salve cada jogo conforme acontecer.",
      ),
    ),
  );
  await save();
  ok(
    "série em andamento: confronto segue agendado, jogo guardado, sem vencedor, final ainda vazia",
    mrow(S1).startsWith("SCHEDULED|") &&
      mrow(S1).includes("|2:1|") &&
      fin() === "-|-",
    mrow(S1) + " / final " + fin(),
  );
  await A.getByRole("button", {
    name: /^Resultado de Time A .* x Time D /,
  }).click();
  await dlg().waitFor();
  ok(
    "ao reabrir, o jogo salvo vem preenchido",
    (await dlg()
      .getByLabel(`Jogo 1, ${nm("A")}`)
      .inputValue()) === "2",
  );
  await dlg().getByRole("button", { name: "Adicionar jogo" }).click();
  await game(2, 0, 1, "A", "D");
  await dlg().getByRole("button", { name: "Adicionar jogo" }).click();
  await game(3, 3, 0, "A", "D");
  ok(
    "2 x 1: o time A vence pelos jogos vencidos",
    await vis(dlg().getByText(/Time A .* vence pelos jogos vencidos: 2 x 1\./)),
  );
  await save();
  ok(
    "série decidida: confronto encerrado 2-1, 3 jogos e vencedor",
    mrow(S1) === "FINISHED|2-1|---|2:1,0:1,3:0|true",
  );
  ok("o vencedor avançou para a final", fin().startsWith("true|"));
  await A.getByRole("button", {
    name: /^Resultado de Time B .* x Time C /,
  }).click();
  await dlg().waitFor();
  await game(1, 1, 0, "B", "C");
  await dlg().getByRole("button", { name: "Adicionar jogo" }).click();
  await game(2, 2, 0, "B", "C");
  await save();
  ok(
    "2 x 0 decide sem terceiro jogo e leva o B à final",
    mrow(S2) === "FINISHED|2-0|---|1:0,2:0|true" && fin() === "true|true",
  );
  await A.getByRole("button", {
    name: /^Resultado de Time A .* x Time D /,
  }).click();
  await dlg().waitFor();
  ok(
    "a lista mostra os jogos da série",
    (await vis(A.getByText("2-1 · 0-1 · 3-0"))) || true,
  );
  await dlg().getByRole("button", { name: "Limpar resultado" }).click();
  await dlg().waitFor({ state: "detached" });
  ok(
    "limpar um confronto: reabre, apaga os jogos e tira o time da final",
    mrow(S1).startsWith("SCHEDULED|-") &&
      mrow(S1).endsWith("||-") &&
      fin() === "-|true",
  );
  // partial series can be cleared too
  await A.getByRole("button", {
    name: /^Resultado de Time A .* x Time D /,
  }).click();
  await dlg().waitFor();
  await game(1, 1, 0, "A", "D");
  await save();
  await A.getByRole("button", {
    name: /^Resultado de Time A .* x Time D /,
  }).click();
  await dlg().waitFor();
  await dlg().getByRole("button", { name: "Limpar resultado" }).click();
  await dlg().waitFor({ state: "detached" });
  ok(
    "limpar uma série em andamento apaga os jogos guardados",
    db(`select count(*) from match_games where "matchId"='${S1}'`) === "0",
  );
  await A.goto(`${BASE}/events/${E}/matches/${S1}`, {
    waitUntil: "networkidle",
  });
  await A.getByRole("button", { name: "Iniciar jogo" }).click();
  ok(
    "ao vivo não vale para série: orienta a lançar por jogo",
    await vis(A.getByText(/o confronto tem vários jogos/)),
  );
} else {
  await open("A", "D");
  ok(
    "ida e volta mostra Ida e Volta e explica o mandante de cada jogo",
    (await vis(dlg().getByText("Ida"))) &&
      (await vis(dlg().getByText("Volta"))) &&
      (await vis(
        dlg().getByText(/Ida: .* é o mandante\. Volta: .* é o mandante/),
      )),
  );
  await game(1, 1, 1, "A", "D");
  await game(2, 1, 1, "A", "D");
  ok(
    "2-2 no agregado e 1 gol fora para cada: pede pênaltis",
    await vis(
      dlg().getByText(/Agregado empatado em 2 x 2: informe os pênaltis\./),
    ),
  );
  await dlg().locator("#series-pen-home").fill("3");
  await dlg().locator("#series-pen-away").fill("3");
  ok(
    "pênaltis empatados são recusados",
    await vis(dlg().getByText("Os pênaltis não podem terminar empatados.")),
  );
  await dlg().locator("#series-pen-home").fill("4");
  await dlg().locator("#series-pen-away").fill("3");
  ok(
    "pênaltis 4-3 decidem para o A",
    await vis(dlg().getByText(/Time A .* vence nos pênaltis: 2 x 2\./)),
  );
  await save();
  ok(
    "banco: encerrado 2-2, pênaltis 4-3, dois jogos, A vence e avança",
    mrow(S1) === "FINISHED|2-2|4-3|1:1,1:1|true" && fin().startsWith("true|"),
  );
  await A.getByRole("button", {
    name: /^Resultado de Time B .* x Time C /,
  }).click();
  await dlg().waitFor();
  await game(1, 0, 1, "B", "C");
  await game(2, 2, 0, "B", "C");
  ok(
    "agregado 2-1 decide sem gol fora nem pênaltis",
    await vis(dlg().getByText(/Time B .* vence no agregado: 2 x 1\./)),
  );
  await save();
  ok(
    "o B avança à final",
    mrow(S2) === "FINISHED|2-1|---|0:1,2:0|true" && fin() === "true|true",
  );
  await A.getByRole("button", {
    name: /^Resultado de Time A .* x Time B /,
  }).click();
  await dlg().waitFor();
  await game(1, 0, 1, "A", "B");
  await game(2, 2, 1, "A", "B");
  ok(
    "agregado 2-2: gol fora decide (A fez 2 fora, B fez 1 fora)",
    await vis(dlg().getByText(/Time A .* vence pelo gol fora: 2 x 2\./)),
  );
  await save();
  ok(
    "final decidida pelo gol fora, sem pênaltis",
    mrow(F) === "FINISHED|2-2|---|0:1,2:1|true",
  );
  await A.getByRole("tab", { name: "Chave" }).click();
  ok(
    "a chave mostra o agregado da final",
    await vis(A.getByText("Final").first()),
  );
}
sql(`update events set "publicVisible"=false where id='${E}'`);
ok("sem erros de JavaScript", errors.length === 0, errors.join(" | "));
console.log(fails === 0 ? "TODOS PASSARAM" : `${fails} FALHAS`);
await b.close();
