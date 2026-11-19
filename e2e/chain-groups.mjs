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
const NEXT = process.argv[2] || "DOUBLE_ELIM";
const tb = JSON.stringify([
  { key: "POINTS", scope: "OVERALL" },
  { key: "SCORE_DIFF", scope: "OVERALL" },
  { key: "DRAW_LOTS", scope: "OVERALL" },
]);
sql(
  `insert into event_rules(id,"eventId","scoringModel","winPoints","drawPoints","lossPoints","allowDraw",tiebreakers,"woScoreFor","woScoreAgainst","woPointsAwarded","updatedAt") values('${rid("r")}','${E}','POINTS',3,1,0,false,'${tb}'::jsonb,3,0,3,now())`,
);
const s1 = rid("s"),
  s2 = rid("s");
sql(
  `insert into event_stages(id,"eventId","order",name,type,"groupCount","groupSize","advancingPerGroup","roundRobinLegs","thirdPlaceMatch","grandFinalMode",seeding,"updatedAt") values('${s1}','${E}',1,'Grupos','GROUPS',3,3,2,1,false,'SINGLE','RANDOM',now()),('${s2}','${E}',2,'Mata-mata','${NEXT}',null,null,null,1,false,'SINGLE','RANKING',now())`,
);
const run1 = rid("ru");
sql(
  `insert into stage_runs(id,"stageId","categoryId",status,"drawSeed","drawMode","updatedAt") values('${run1}','${s1}','${cat}','LIVE',1,'RANDOM',now())`,
);
const en = {};
let pos = 0;
for (const g of [1, 2, 3]) {
  const gid = rid("gr");
  sql(
    `insert into stage_groups(id,"stageRunId",name,"order") values('${gid}','${run1}','Grupo ${"ABC"[g - 1]}',${g})`,
  );
  for (const t of [1, 2, 3]) {
    const tm = rid("tm"),
      rg = rid("rg"),
      e = rid("en");
    en[`${g}${t}`] = e;
    const nm = `Time ${"ABC"[g - 1]}${t}`;
    sql(
      `insert into teams(id,"organizationId",name,"updatedAt") values('${tm}','${org}','${nm} ${T}',now())`,
    );
    sql(
      `insert into registrations(id,"eventId","categoryId","teamId","createdById","updatedAt") values('${rg}','${E}','${cat}','${tm}','${u}',now())`,
    );
    sql(
      `insert into stage_entries(id,"stageRunId","registrationId","groupId",position,seed) values('${e}','${run1}','${rg}','${gid}',${pos++},${t})`,
    );
  }
  [
    [1, 2],
    [1, 3],
    [2, 3],
  ].forEach(([h, a], k) =>
    sql(
      `insert into matches(id,"stageRunId","groupId",round,position,label,"homeEntryId","awayEntryId",status,"homeScore","awayScore","winnerEntryId","updatedAt") values('${rid("mt")}','${run1}','${gid}',${k + 1},${g},'Rodada ${k + 1}','${en[`${g}${h}`]}','${en[`${g}${a}`]}','FINISHED',1,0,'${en[`${g}${h}`]}',now())`,
    ),
  );
}
const dlg = () => A.getByRole("dialog");
await A.goto(`${BASE}/events/${E}/stages/${s1}`, { waitUntil: "networkidle" });
await A.getByRole("button", { name: /Concluir fase e avançar/ }).click();
ok(
  "concluir os grupos cria a fase seguinte com os 6 classificados (2 por grupo)",
  await poll(
    async () =>
      sql(
        `select count(*) from stage_entries e join stage_runs r on r.id=e."stageRunId" where r."stageId"='${s2}'`,
      ) === "6",
  ),
);
ok(
  "os classificados são os 1º e 2º de cada grupo (T1 e T2), nunca os 3ºs",
  sql(
    `select count(*) from stage_entries e join stage_runs r on r.id=e."stageRunId" join registrations rg on rg.id=e."registrationId" join teams t on t.id=rg."teamId" where r."stageId"='${s2}' and (t.name like 'Time _3 %')`,
  ) === "0",
);
const run2 = sql(`select id from stage_runs where "stageId"='${s2}'`);
await A.goto(`${BASE}/events/${E}/stages/${s2}`, { waitUntil: "networkidle" });
ok(
  "a fase seguinte aguarda a geração dos jogos",
  await vis(A.getByRole("button", { name: "Gerar jogos" })),
);
await A.getByRole("button", { name: "Gerar jogos" }).click();
await vis(A.getByRole("tab", { name: "Jogos" }));
const total = sql(`select count(*) from matches where "stageRunId"='${run2}'`);
ok(
  NEXT === "DOUBLE_ELIM"
    ? "6 classificados: dupla eliminação gera 10 jogos (2n-2)"
    : "6 classificados: mata-mata gera 5 jogos (n-1)",
  total === (NEXT === "DOUBLE_ELIM" ? "10" : "5"),
  total,
);
const nameOf = (id) =>
  sql(
    `select t.name from stage_entries e join registrations r on r.id=e."registrationId" join teams t on t.id=r."teamId" where e.id='${id}'`,
  ).replace(` ${T}`, "");
let guard = 0;
while (guard++ < 30) {
  const next = sql(
    `select m."homeEntryId"||'|'||m."awayEntryId" from matches m where m."stageRunId"='${run2}' and m.status='SCHEDULED' and m."homeEntryId" is not null and m."awayEntryId" is not null order by m.round, m.position limit 1`,
  );
  if (!next) break;
  const [he, ae] = next.split("|");
  const h = nameOf(he),
    a = nameOf(ae);
  const idx = Number(
    sql(
      `select count(*) from matches m where m."stageRunId"='${run2}' and m.status<>'SCHEDULED' and ((m."homeEntryId"='${he}' and m."awayEntryId"='${ae}') or (m."homeEntryId"='${ae}' and m."awayEntryId"='${he}'))`,
    ),
  );
  await A.goto(`${BASE}/events/${E}/stages/${s2}`, {
    waitUntil: "networkidle",
  });
  await A.getByRole("button", {
    name: new RegExp(`^Resultado de (${h} .* x ${a}|${a} .* x ${h}) `),
  })
    .nth(idx)
    .click();
  await dlg().waitFor();
  const homeWins = h < a;
  await dlg()
    .locator("#score-home")
    .fill(homeWins ? "1" : "0");
  await dlg()
    .locator("#score-away")
    .fill(homeWins ? "0" : "1");
  await dlg().getByRole("button", { name: "Salvar resultado" }).click();
  await dlg().waitFor({ state: "detached" });
}
ok(
  "todos os jogos da fase final foram jogados",
  sql(
    `select count(*) from matches where "stageRunId"='${run2}' and status='SCHEDULED'`,
  ) === "0",
);
await A.goto(`${BASE}/events/${E}/stages/${s2}`, { waitUntil: "networkidle" });
ok("há campeão", await vis(A.getByText(/Campeão: Time /)));
if (NEXT === "DOUBLE_ELIM") {
  const losses = sql(
    `select string_agg(t.name||':'||(select count(*) from matches m where m."stageRunId"='${run2}' and m."winnerEntryId" is not null and m."winnerEntryId"<>e.id and (m."homeEntryId"=e.id or m."awayEntryId"=e.id)),',') from stage_entries e join registrations r on r.id=e."registrationId" join teams t on t.id=r."teamId" where e."stageRunId"='${run2}'`,
  ).replace(new RegExp(` ${T}`, "g"), "");
  const arr = losses.split(",");
  ok(
    "um único invicto e os outros 5 eliminados com exatamente 2 derrotas",
    arr.filter((x) => x.endsWith(":0")).length === 1 &&
      arr.filter((x) => x.endsWith(":2")).length === 5,
    losses,
  );
}
await A.getByRole("button", { name: /Concluir fase/ }).click();
ok(
  "concluir encerra a fase",
  await poll(
    async () =>
      sql(`select status from stage_runs where id='${run2}'`) === "DONE",
  ),
);
sql(`update events set "publicVisible"=false where id='${E}'`);
ok("sem erros de JavaScript", errors.length === 0, errors.join(" | "));
console.log(fails === 0 ? "TODOS PASSARAM" : `${fails} FALHAS`);
await b.close();
