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
sql(`update event_stages set type='ROUND_ROBIN' where id='${st}'`);
// athletes: 2 per team
const regs = sql(
  `select string_agg(id,',' order by "createdAt") from registrations where "eventId"='${E}'`,
).split(",");
const ath = [];
regs.forEach((rg, i) =>
  [1, 2].forEach((n) => {
    const a = rid("at");
    ath.push(a);
    sql(
      `insert into athletes(id,name,"birthDate",gender,cpf,"createdByOrganizationId","updatedAt") values('${a}','Atleta ${"ABCD"[i]}${n} ${T}','199${n}-0${n + 2}-1${i}','MALE','${String(T + i * 10 + n).slice(-11)}','${org}',now())`,
    );
    sql(
      `insert into organization_athletes("organizationId","athleteId") values('${org}','${a}')`,
    );
    sql(
      `insert into registration_members(id,"registrationId","athleteId","categoryId","shirtNumber","isCaptain") values('${rid("m")}','${rg}','${a}','${cat}',${n * 5 + i},${n === 1})`,
    );
  }),
);
sql(
  `insert into registration_staff(id,"registrationId",name,role,contact) values('${rid("sf")}','${regs[0]}','Técnico Zé','COACH','31 99999-0000')`,
);
const mid = [];
[
  [0, 1, 2, 0],
  [2, 3, 1, 1],
  [0, 2, 3, 1],
].forEach(([h, a, sh, sa], k) => {
  const id = rid("mt");
  mid.push(id);
  sql(
    `insert into matches(id,"stageRunId",round,position,label,"homeEntryId","awayEntryId",status,"homeScore","awayScore","winnerEntryId","scheduledAt",venue,"updatedAt") values('${id}','${run}',${k + 1},0,'Rodada ${k + 1}','${en[h]}','${en[a]}','FINISHED',${sh},${sa},${sh > sa ? `'${en[h]}'` : sh < sa ? `'${en[a]}'` : "null"},'2026-12-05T16:00:00Z','Quadra ${k + 1}',now())`,
  );
});
sql(
  `insert into match_events(id,"matchId",type,side,minute,"athleteId","createdById") values('${rid("me")}','${mid[0]}','GOAL','HOME',12,'${ath[0]}','${u}')`,
);
const nm = (l) => `Time ${l} ${T}`;
await A.goto(`${BASE}/reports`, { waitUntil: "networkidle" });
ok(
  "a página Relatórios lista os eventos",
  (await vis(A.getByRole("link", { name: /^Relatórios de Copa Vôlei/ }))) ||
    (await vis(A.getByRole("link", { name: /^Relatórios de / }))),
);
await A.getByRole("link", { name: /^Relatórios de / })
  .first()
  .click();
await A.waitForURL((u) => new URL(u).pathname === `/events/${E}/reports`);
ok(
  "o evento tem a central de relatórios com inscritos, resultados e a lista de súmulas",
  (await vis(A.getByRole("heading", { name: "Lista de inscritos" }))) &&
    (await vis(
      A.getByRole("heading", { name: "Resultados e classificação" }),
    )) &&
    (await A.getByRole("link", { name: /^Súmula de / }).count()) === 3,
);
// registrations report
await A.getByRole("link", { name: "Ver e imprimir" }).first().click();
await A.waitForURL(
  (u) => new URL(u).pathname === `/events/${E}/reports/registrations`,
);
const art = A.getByRole("article", { name: "Lista de inscritos" });
const txt = (await art.innerText()).replace(/\s+/g, " ");
ok(
  "a lista mostra o cabeçalho do evento, as categorias e os times",
  (await vis(art)) &&
    /Copa Vôlei/.test(txt) &&
    /4 inscrições em 1 categoria/.test(txt) &&
    txt.includes(nm("A")) &&
    txt.includes(nm("D")),
);
ok(
  "cada atleta aparece com camisa, nascimento (dd/mm/aaaa) e a comissão do time",
  txt.includes(`Atleta A1 ${T}`) &&
    /\d{2}\/\d{2}\/199\d/.test(txt) &&
    txt.includes("Comissão: Técnico Zé (Técnico)") &&
    /\b10\b/.test(txt),
);
const cpfs = sql(
  `select string_agg(cpf,',') from athletes where "createdByOrganizationId"='${org}'`,
).split(",");
const fmtCpf = (c) => c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
ok(
  "o relatório não expõe o CPF dos atletas (nem puro nem formatado)",
  cpfs.length === 8 &&
    cpfs.every((c) => !txt.includes(c) && !txt.includes(fmtCpf(c))),
);
// print: menu hidden, article visible, and a real PDF
await A.emulateMedia({ media: "print" });
ok(
  "ao imprimir o menu e o cabeçalho do aplicativo somem e a folha continua",
  !(await A.locator("aside").first().isVisible()) &&
    (await art.isVisible()) &&
    !(await A.getByRole("button", { name: /Imprimir ou salvar/ }).isVisible()),
);
const pdf = await A.pdf({ format: "A4", printBackground: true });
ok(
  "o Chrome gera um PDF a partir do relatório (mais de 5 KB, com cabeçalho %PDF)",
  pdf.length > 5000 && pdf.subarray(0, 4).toString() === "%PDF",
  String(pdf.length),
);
await A.emulateMedia({ media: "screen" });
ok(
  "na tela há o botão Imprimir ou salvar em PDF",
  await vis(A.getByRole("button", { name: "Imprimir ou salvar em PDF" })),
);
// results report
await A.goto(`${BASE}/events/${E}/reports/results`, {
  waitUntil: "networkidle",
});
const rt = (
  await A.getByRole("article", {
    name: "Resultados e classificação",
  }).innerText()
).replace(/\s+/g, " ");
ok(
  "os resultados mostram a categoria, a fase, a classificação e os jogos com placar",
  /Geral/.test(rt) &&
    rt.includes(nm("A")) &&
    /2 x 0/.test(rt) &&
    /1 x 1/.test(rt) &&
    /3 x 1/.test(rt) &&
    /Quadra 1/.test(rt),
);
ok(
  "a classificação soma os pontos (A venceu duas vezes: 6 pontos, em 1º)",
  await vis(
    A.getByRole("table")
      .first()
      .locator("tbody tr")
      .first()
      .filter({ hasText: nm("A") }),
  ),
);
// CSV
const csvR = await A.context().request.get(
  `${BASE}/events/${E}/reports/registrations.csv`,
);
const csv = await csvR.text();
ok(
  "a planilha de inscritos baixa como CSV com BOM, cabeçalho e os atletas",
  csvR.status() === 200 &&
    /text\/csv/.test(csvR.headers()["content-type"]) &&
    /attachment/.test(csvR.headers()["content-disposition"]) &&
    csv.startsWith(
      "\uFEFFCategoria;Inscrição;Função;Nome;Nascimento;Camisa;Posição;Capitão;Contato",
    ) &&
    csv.includes(`Atleta A1 ${T}`) &&
    csv.includes("Técnico Zé"),
);
const csv2 = await (
  await A.context().request.get(`${BASE}/events/${E}/reports/results.csv`)
).text();
ok(
  "a planilha de resultados traz classificação e jogos",
  csv2.includes(";Classificação;") &&
    csv2.includes(";Jogo;") &&
    csv2.includes("2 x 0"),
);
const anon = await (
  await b.newContext()
).request.get(`${BASE}/events/${E}/reports/registrations.csv`);
ok("sem login o download é recusado (401)", anon.status() === 401);
// match sheet
await A.goto(`${BASE}/events/${E}/reports/matches/${mid[0]}`, {
  waitUntil: "networkidle",
});
const sh = (
  await A.getByRole("article", { name: "Súmula do jogo" }).innerText()
).replace(/\s+/g, " ");
ok(
  "a súmula mostra os times, o placar 2 x 0, o local, os elencos e os lances",
  sh.includes(nm("A")) &&
    sh.includes(nm("B")) &&
    /2\s*x\s*0/.test(await A.getByTestId("sheet-score").innerText()) &&
    sh.includes("Quadra 1") &&
    sh.includes(`Atleta A1 ${T}`) &&
    /12'/.test(sh) &&
    /Gol/.test(sh),
);
ok(
  "a súmula tem as linhas de assinatura (árbitro e capitães)",
  sh.includes("Árbitro") && sh.includes("Capitão " + nm("A")),
);
await A.goto(`${BASE}/events/${E}/matches/${mid[0]}`, {
  waitUntil: "networkidle",
});
ok(
  "a tela do jogo tem o atalho Súmula para imprimir",
  await vis(A.getByRole("link", { name: "Súmula para imprimir" })),
);
await A.goto(`${BASE}/events/${E}`, { waitUntil: "networkidle" });
ok(
  "a página do evento tem o botão Relatórios",
  await vis(A.getByRole("link", { name: "Relatórios", exact: true })),
);
sql(`update events set "publicVisible"=false where id='${E}'`);
ok("sem erros de JavaScript", errors.length === 0, errors.join(" | "));
console.log(fails === 0 ? "TODOS PASSARAM" : `${fails} FALHAS`);
await b.close();
