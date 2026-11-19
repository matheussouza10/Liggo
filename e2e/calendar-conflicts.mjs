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
const poll = async (fn, t = 10000) => {
  const end = Date.now() + t;
  while (Date.now() < end) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
};
const mk = (h, a, at, venue, status = "SCHEDULED") => {
  const id = rid("mt");
  sql(
    `insert into matches(id,"stageRunId",round,position,label,"homeEntryId","awayEntryId",status,"scheduledAt",venue,"updatedAt") values('${id}','${run}',1,0,'Rodada','${en[h]}','${en[a]}','${status}','${at}',${venue ? `'${venue}'` : "null"},now())`,
  );
  return id;
};
await A.goto(`${BASE}/calendar`, { waitUntil: "networkidle" });
ok(
  "sem jogos agendados não há painel de conflitos",
  (await A.getByRole("region", { name: "Conflitos" }).count()) === 0,
);
const m1 = mk(0, 1, "2026-12-05T16:00:00Z", "Quadra 1"); // A x B 13:00
const m2 = mk(2, 3, "2026-12-05T16:00:00Z", "quadra 1"); // C x D 13:00, same place (different case)
await A.goto(`${BASE}/calendar`, { waitUntil: "networkidle" });
ok(
  "dois jogos no mesmo local e horário geram 1 conflito, com os dois jogos nomeados",
  (await vis(A.getByRole("region", { name: "Conflitos" }))) &&
    /1 conflito de horário/.test(
      await A.getByRole("region", { name: "Conflitos" }).innerText(),
    ) &&
    /Mesmo local e horário: .*Time A.* x .*Time B.* e .*Time C.* x .*Time D/.test(
      (await A.getByRole("region", { name: "Conflitos" }).innerText()).replace(
        /\s+/g,
        " ",
      ),
    ),
);
ok(
  "os dois jogos aparecem marcados como Conflito na lista",
  (await A.locator('[data-conflict="true"]').count()) === 2 &&
    (await A.getByText("Conflito", { exact: true }).count()) === 2,
);
const m3 = mk(0, 2, "2026-12-05T16:15:00Z", "Quadra 2"); // A x C 13:15: A and C come back after 15 min
await A.goto(`${BASE}/calendar`, { waitUntil: "networkidle" });
const txt = (
  await A.getByRole("region", { name: "Conflitos" }).innerText()
).replace(/\s+/g, " ");
ok(
  "o time que volta 15 minutos depois gera aviso de intervalo curto (A e C)",
  /3 conflitos de horário/.test(txt) &&
    (txt.match(/Intervalo curto entre jogos do mesmo time ou atleta/g) || [])
      .length === 2,
);
ok(
  "os três jogos ficam marcados",
  (await A.locator('[data-conflict="true"]').count()) === 3,
);
sql(
  `update matches set status='FINISHED',"homeScore"=1,"awayScore"=0 where id='${m3}'`,
);
await A.goto(`${BASE}/calendar`, { waitUntil: "networkidle" });
ok(
  "jogo já disputado deixa de contar: voltam só o conflito de local",
  /1 conflito de horário/.test(
    await A.getByRole("region", { name: "Conflitos" }).innerText(),
  ) && (await A.locator('[data-conflict="true"]').count()) === 2,
);
sql(`update matches set venue='Quadra 2' where id='${m2}'`);
await A.goto(`${BASE}/calendar`, { waitUntil: "networkidle" });
ok(
  "corrigindo o local, o painel de conflitos some",
  (await A.getByRole("region", { name: "Conflitos" }).count()) === 0 &&
    (await A.locator('[data-conflict="true"]').count()) === 0,
);
sql(`update events set "publicVisible"=false where id='${E}'`);
ok("sem erros de JavaScript", errors.length === 0, errors.join(" | "));
console.log(fails === 0 ? "TODOS PASSARAM" : `${fails} FALHAS`);
await b.close();
