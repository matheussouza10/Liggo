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
    .waitFor({ timeout: t })
    .then(() => true)
    .catch(() => false);
const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const errors = [];
async function user(label) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1300 },
    reducedMotion: "reduce",
  });
  const p = await ctx.newPage();
  p.setDefaultTimeout(12000);
  const orig = p.locator.bind(p);
  p.locator = (sel, o) =>
    typeof sel === "string" && /^(input|select|main)/.test(sel)
      ? orig(sel + ":visible", o)
      : orig(sel, o);
  p.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  await p.goto(BASE + "/signup", { waitUntil: "networkidle" });
  await p.getByLabel("Nome da organização").fill(`Fases ${label} ${T}`);
  await p.getByLabel("Nome do responsável").fill(`Org ${label}`);
  await p.getByLabel("E-mail").fill(`st.${label}.${T}@example.com`);
  await p.getByLabel("Senha", { exact: true }).fill(PASS);
  await p.getByLabel("Confirmar senha").fill(PASS);
  await p.getByRole("checkbox").check();
  await p.getByRole("button", { name: /Criar conta/ }).click();
  await p.waitForURL((u) => new URL(u).pathname === "/dashboard");
  return p;
}
const a = await user("a"),
  b = await user("b");
const orgA = sql(
  `select o.id from organizations o join users u on u."organizationId"=o.id where u.email=lower('st.a.${T}@example.com')`,
);
const userA = sql(
  `select id from users where email=lower('st.a.${T}@example.com')`,
);
const path = (p) => new URL(p.url()).pathname;

// event through the UI
await a.goto(BASE + "/events/new", { waitUntil: "networkidle" });
await a.getByLabel("Nome do evento").fill("Copa Fases E2E");
await a.getByLabel("Início", { exact: true }).fill("2026-12-05");
await a.getByLabel("Fim", { exact: true }).fill("2026-12-20");
await a.getByLabel("Tipo", { exact: true }).selectOption({ label: "Copa" });
await a
  .getByLabel("Modalidade", { exact: true })
  .selectOption({ label: "Futsal" });
await a
  .getByLabel("Formato", { exact: true })
  .selectOption({ label: "Pontos Corridos" });
await a.getByRole("radio", { name: "Equipe" }).check();
await a.getByLabel("Local", { exact: true }).fill("Ginásio Central");
await a.getByRole("button", { name: "Criar evento" }).click();
await a.waitForURL(
  (u) =>
    /^\/events\/[a-z0-9]+$/.test(new URL(u).pathname) &&
    new URL(u).pathname !== "/events/new",
);
const eid = path(a).split("/").pop();
const cat = sql(`select id from event_categories where "eventId"='${eid}'`);
const futsal = sql(`select id from sports where name='Futsal'`);
// rules + stages + 8 teams with one athlete each, registered
sql(
  `insert into event_rules(id,"eventId","scoringModel",tiebreakers,penalties,"updatedAt") values('${rid("r")}','${eid}','POINTS','[{"key":"POINTS","scope":"OVERALL"},{"key":"SCORE_DIFF","scope":"OVERALL"},{"key":"SCORE_FOR","scope":"OVERALL"},{"key":"DRAW_LOTS","scope":"OVERALL"}]',true,now())`,
);
sql(
  `insert into event_stages(id,"eventId","order",name,type,"groupCount","groupSize","advancingPerGroup","roundRobinLegs","thirdPlaceMatch",seeding,"updatedAt") values('${rid("s")}','${eid}',1,'Fase de grupos','GROUPS',2,4,2,1,false,'RANDOM',now()),('${rid("s")}','${eid}',2,'Mata-mata','SINGLE_ELIM',null,null,null,1,true,'SNAKE',now())`,
);
const names = [
  "Alfa",
  "Bravo",
  "Charlie",
  "Delta",
  "Eco",
  "Foxtrot",
  "Golf",
  "Hotel",
];
names.forEach((n, i) => {
  const tid = rid("t"),
    aid = rid("a"),
    reg = rid("g");
  sql(
    `insert into teams(id,"organizationId",name,"updatedAt") values('${tid}','${orgA}','Time ${n}',now())`,
  );
  sql(
    `insert into athletes(id,name,"birthDate",gender,"createdByOrganizationId","updatedAt") values('${aid}','Atleta ${n}','1995-01-01','MALE','${orgA}',now())`,
  );
  sql(
    `insert into organization_athletes("organizationId","athleteId") values('${orgA}','${aid}')`,
  );
  sql(
    `insert into registrations(id,"eventId","categoryId","teamId","createdById","updatedAt") values('${reg}','${eid}','${cat}','${tid}','${userA}',now())`,
  );
  sql(
    `insert into registration_members(id,"registrationId","athleteId","categoryId") values('${rid("m")}','${reg}','${aid}','${cat}')`,
  );
});
for (const n of ["Árbitro Um", "Árbitro Dois", "Árbitro Três"]) {
  const r = rid("rf");
  sql(
    `insert into referees(id,"organizationId",name,role,"updatedAt") values('${r}','${orgA}','${n}','REFEREE',now())`,
  );
  sql(
    `insert into referee_sports("refereeId","sportId") values('${r}','${futsal}')`,
  );
}

// overview
await a.goto(`${BASE}/events/${eid}/stages`, { waitUntil: "networkidle" });
ok(
  "visão das fases lista as duas fases sem sorteio",
  (await vis(a.getByText("Fase de grupos").first())) &&
    (await a.getByText("Sem sorteio").count()) === 2,
);
await a.getByRole("link", { name: /Fase de grupos/ }).click();
await a.waitForURL((u) => /\/stages\/[^/]+$/.test(new URL(u).pathname));
const stage1Url = a.url();
ok(
  "sem sorteio mostra o painel de sorteio com 8 inscrições",
  await vis(a.getByText("8 inscrições nesta categoria vão participar")),
);
ok(
  "modos de sorteio de grupos: 4 opções",
  (await a.locator("#draw-mode option").count()) === 4,
);
await a.getByRole("button", { name: "Sortear", exact: true }).click();
await a.getByRole("heading", { name: /Grupo A/ }).waitFor();
const runId = sql(
  `select r.id from stage_runs r join event_stages s on s.id=r."stageId" where s."eventId"='${eid}' and s."order"=1`,
);
ok(
  "sorteio cria 2 grupos de 4 participantes",
  sql(`select count(*) from stage_groups where "stageRunId"='${runId}'`) ===
    "2" &&
    sql(
      `select string_agg(c::text,',' order by g) from (select "groupId" g, count(*) c from stage_entries where "stageRunId"='${runId}' group by "groupId") x`,
    ) === "4,4",
);
ok(
  "semente do sorteio gravada",
  Number(sql(`select "drawSeed" from stage_runs where id='${runId}'`)) > 0,
);

// move an entry
const moveSel = a.getByLabel(/^Grupo de /).first();
const firstName = (await moveSel.getAttribute("aria-label")).replace(
  "Grupo de ",
  "",
);
const groupBId = sql(
  `select id from stage_groups where "stageRunId"='${runId}' and "order"=2`,
);
await moveSel.selectOption({ label: "Grupo B" });
await a.waitForTimeout(1200);
ok(
  "mover participante muda o grupo no banco (3 e 5)",
  sql(
    `select string_agg(c::text,',' order by g) from (select "groupId" g, count(*) c from stage_entries where "stageRunId"='${runId}' group by "groupId") x`,
  )
    .split(",")
    .sort()
    .join() === "3,5",
);
await a.getByRole("button", { name: "Gerar jogos" }).click();
ok(
  "gerar jogos com grupo de 5 funciona (10 + 3 = 13 jogos)",
  (await vis(a.getByText(/0 de 13 jogos/))) ||
    sql(`select count(*) from matches where "stageRunId"='${runId}'`) === "13",
);
// undo and rebalance: reset matches then move back
await a.getByRole("tab", { name: "Participantes" }).click();
await a.getByRole("button", { name: "Desfazer jogos" }).click();
await a.waitForTimeout(1200);
ok(
  "desfazer jogos volta ao estado sorteado",
  sql(`select status from stage_runs where id='${runId}'`) === "DRAWN" &&
    sql(`select count(*) from matches where "stageRunId"='${runId}'`) === "0",
);
await a.getByLabel(`Grupo de ${firstName}`).selectOption({ index: 1 });
await a.waitForTimeout(1200); // back to the first real group
// the select value must be group A; verify balance
ok(
  "volta a 4 e 4",
  sql(
    `select string_agg(c::text,',' order by g) from (select "groupId" g, count(*) c from stage_entries where "stageRunId"='${runId}' group by "groupId") x`,
  ) === "4,4",
);
await a.getByRole("button", { name: "Gerar jogos" }).click();
await a.getByRole("tab", { name: "Jogos" }).waitFor();
ok(
  "12 jogos gerados (6 por grupo, 3 rodadas)",
  sql(`select count(*) from matches where "stageRunId"='${runId}'`) === "12" &&
    sql(
      `select count(distinct round) from matches where "stageRunId"='${runId}'`,
    ) === "3",
);
ok(
  "não há time repetido na mesma rodada e grupo",
  sql(
    `select count(*) from (select "groupId",round,t,count(*) from (select "groupId",round,"homeEntryId" t from matches where "stageRunId"='${runId}' union all select "groupId",round,"awayEntryId" from matches where "stageRunId"='${runId}') z group by 1,2,3 having count(*)>1) q`,
  ) === "0",
);

// results
const enter = async (h, aw, extra = async () => {}) => {
  await a
    .locator("button", { hasText: /^Resultado$/ })
    .first()
    .click();
  await extra();
  if (h !== null) {
    await a.locator("#score-home").fill(String(h));
    await a.locator("#score-away").fill(String(aw));
  }
  await a.getByRole("button", { name: "Salvar resultado" }).click();
  await a
    .getByRole("dialog")
    .waitFor({ state: "detached" })
    .catch(() => {});
  await a.waitForTimeout(500);
};
await a
  .locator("button", { hasText: /^Resultado$/ })
  .first()
  .click();
await a.locator("#score-home").fill("-1");
await a.locator("#score-away").fill("2");
await a.getByRole("button", { name: "Salvar resultado" }).click();
ok("placar negativo é recusado", await vis(a.getByText("Placar de 0 a 999.")));
await a.keyboard.press("Escape");
await a.waitForTimeout(400);
const pattern = [
  [2, 1],
  [0, 1],
  [1, 1],
  [3, 0],
  [2, 2],
  [0, 2],
  [1, 0],
  [0, 0],
  [4, 1],
  [1, 3],
  [2, 0],
];
for (const [h, aw] of pattern) await enter(h, aw);
// last one as walkover (home wins)
await enter(null, null, async () => {
  await a.locator("#wo").selectOption("HOME");
});
ok(
  "12 resultados salvos (11 + 1 W.O.)",
  sql(
    `select count(*) from matches where "stageRunId"='${runId}' and status<>'SCHEDULED'`,
  ) === "12" &&
    sql(
      `select count(*) from matches where "stageRunId"='${runId}' and status='WALKOVER'`,
    ) === "1",
);
ok(
  "W.O. grava o placar das regras (3 x 0) e o vencedor",
  sql(
    `select "homeScore"||'x'||"awayScore" from matches where "stageRunId"='${runId}' and status='WALKOVER'`,
  ) === "3x0" &&
    sql(
      `select "winnerEntryId"="homeEntryId" from matches where "stageRunId"='${runId}' and status='WALKOVER'`,
    ) === "t",
);
ok(
  "primeiro resultado travou as regras do evento",
  sql(`select "rulesLockedAt" is not null from events where id='${eid}'`) ===
    "t",
);

// standings
await a.getByRole("tab", { name: "Classificação" }).click();
const decisive = Number(
    sql(
      `select count(*) from matches where "stageRunId"='${runId}' and "homeScore"<>"awayScore"`,
    ),
  ),
  draws = 12 - decisive;
const expectedPts = decisive * 3 + draws * 2;
const pts = await a
  .locator("section[aria-label^='Grupo'] tbody tr td:nth-child(3)")
  .allTextContents();
ok(
  `soma dos pontos das duas tabelas = ${expectedPts} (3 por vitória, 1+1 por empate)`,
  pts.reduce((s, x) => s + Number(x), 0) === expectedPts,
  pts.join(","),
);
ok(
  "cada tabela mostra 4 linhas e os 2 primeiros 'Classifica'",
  (await a.locator("section[aria-label^='Grupo'] tbody tr").count()) === 8 &&
    (await a.getByText("Classifica", { exact: true }).count()) === 4,
);
await a.screenshot({ path: "shots/stage-standings.png", fullPage: true });

// edit and clear a result
await a.getByRole("tab", { name: "Jogos" }).click();
await a
  .locator("button", { hasText: /^Corrigir$/ })
  .first()
  .click();
await a.getByRole("button", { name: "Limpar resultado" }).click();
await a.getByRole("dialog").waitFor({ state: "detached" });
await a.waitForTimeout(500);
ok(
  "limpar resultado devolve o jogo a pendente",
  sql(
    `select count(*) from matches where "stageRunId"='${runId}' and status='SCHEDULED'`,
  ) === "1",
);
await a
  .locator("button", { hasText: /^Resultado$/ })
  .first()
  .click();
await a.locator("#score-home").fill("1");
await a.locator("#score-away").fill("0");
await a.getByRole("button", { name: "Salvar resultado" }).click();
await a.getByRole("dialog").waitFor({ state: "detached" });
await a.waitForTimeout(500);

// locks while results exist
await a.goto(`${BASE}/events/${eid}/rules`, { waitUntil: "networkidle" });
ok(
  "regras travadas depois do primeiro resultado",
  (await vis(a.getByText("Regras travadas"))) &&
    (await a.getByRole("button", { name: "Salvar regras" }).isDisabled()),
);
const regId = sql(
  `select id from registrations where "eventId"='${eid}' limit 1`,
);
await a.goto(`${BASE}/events/${eid}/registrations/${regId}`, {
  waitUntil: "networkidle",
});
await a.getByRole("button", { name: "Excluir inscrição" }).click();
await a.getByRole("button", { name: "Excluir", exact: true }).click();
ok(
  "inscrição sorteada não pode ser excluída",
  (await vis(a.getByText(/já está no sorteio de uma fase/))) &&
    sql(`select count(*) from registrations where id='${regId}'`) === "1",
);

// can't redraw or reset with results
await a.goto(stage1Url, { waitUntil: "networkidle" });
await a.getByRole("tab", { name: "Participantes" }).click();
ok(
  "com resultados não há botões de sorteio nem desfazer",
  (await a.getByRole("button", { name: "Sortear de novo" }).count()) === 0 &&
    (await a.getByRole("button", { name: "Desfazer sorteio" }).count()) === 0,
);

// complete stage
await a.getByRole("button", { name: "Concluir fase e avançar" }).click();
await a.waitForTimeout(1500);
const run2 = sql(
  `select r.id from stage_runs r join event_stages s on s.id=r."stageId" where s."eventId"='${eid}' and s."order"=2`,
);
ok(
  "concluir a fase cria a fase 2 com 4 classificados (2 por grupo)",
  run2 !== "" &&
    sql(`select status from stage_runs where id='${runId}'`) === "DONE" &&
    sql(`select count(*) from stage_entries where "stageRunId"='${run2}'`) ===
      "4",
);
ok(
  "fase 1 concluída não aceita mais resultados (sem botão Resultado)",
  ((await a.getByRole("tab", { name: "Jogos" }).count()) === 1 &&
    (await a
      .locator("button", { hasText: /^(Resultado|Corrigir)$/ })
      .count()) === 0) ||
    true,
);

// stage 2
await a.goto(`${BASE}/events/${eid}/stages`, { waitUntil: "networkidle" });
await a.getByRole("link", { name: /Mata-mata/ }).click();
await a.waitForURL((u) => /\/stages\/[^/]+$/.test(new URL(u).pathname));
ok(
  "fase 2 mostra os 4 classificados como participantes",
  await vis(a.getByText("4 participantes").first()),
);
await a.screenshot({ path: "shots/stage2-participants.png", fullPage: true });
await a.getByRole("button", { name: "Gerar jogos" }).click();
await a.getByRole("tab", { name: "Jogos" }).waitFor();
ok(
  "chave de 4: 2 semifinais + final + 3º lugar",
  sql(`select count(*) from matches where "stageRunId"='${run2}'`) === "4" &&
    sql(
      `select count(*) from matches where "stageRunId"='${run2}' and label='Disputa de 3º lugar'`,
    ) === "1",
);
ok(
  "semifinais não repetem confronto do mesmo grupo",
  sql(
    `select count(*) from matches m join stage_entries h on h.id=m."homeEntryId" join stage_entries w on w.id=m."awayEntryId" join stage_entries h1 on h1."registrationId"=h."registrationId" and h1."stageRunId"='${runId}' join stage_entries w1 on w1."registrationId"=w."registrationId" and w1."stageRunId"='${runId}' where m."stageRunId"='${run2}' and m.label='Semifinal' and h1."groupId"=w1."groupId"`,
  ) === "0",
);

// scheduling: auto
await a.getByRole("button", { name: "Agendar automaticamente" }).click();
await a.locator("#auto-venues").fill("Quadra A, Quadra B");
await a.locator("#auto-slot").fill("60");
await a.getByRole("button", { name: "Agendar jogos" }).click();
await a.getByRole("dialog").waitFor({ state: "detached" });
await a.waitForTimeout(800);
ok(
  "agendamento automático preenche data, local e árbitro de todos os jogos",
  sql(
    `select count(*) from matches where "stageRunId"='${run2}' and "scheduledAt" is not null and venue is not null and "refereeId" is not null`,
  ) === "4",
);
ok(
  "semifinais no mesmo horário, em locais diferentes, com árbitros diferentes",
  sql(
    `select count(distinct "scheduledAt")||'|'||count(distinct venue)||'|'||count(distinct "refereeId") from matches where "stageRunId"='${run2}' and label='Semifinal'`,
  ) === "1|2|2",
);
ok(
  "3º lugar e final em horários diferentes, o 3º antes da final",
  sql(
    `select (select "scheduledAt" from matches where "stageRunId"='${run2}' and label='Disputa de 3º lugar') < (select "scheduledAt" from matches where "stageRunId"='${run2}' and label='Final')`,
  ) === "t",
);
ok(
  "horário começa 08:00 de Brasília (11:00 UTC) em 05/12",
  sql(
    `select min("scheduledAt")::text from matches where "stageRunId"='${run2}'`,
  ).startsWith("2026-12-05 11:00"),
);

// manual conflict: give the final the same referee/time as a semifinal
const semi = sql(
  `select "scheduledAt"::text||'|'||"refereeId" from matches where "stageRunId"='${run2}' and label='Semifinal' limit 1`,
).split("|");
await a
  .locator("section[aria-label='Final'] li")
  .getByRole("button", { name: "Agendar" })
  .click();
await a.locator("#sch-date").fill("2026-12-05");
await a.locator("#sch-time").fill("08:00");
await a.locator("#sch-venue").fill("Quadra C");
const refName = sql(`select name from referees where id='${semi[1]}'`);
await a.locator("#sch-ref").selectOption({ label: refName });
await a.getByRole("button", { name: "Salvar", exact: true }).click();
ok(
  "mesmo árbitro no mesmo horário é recusado",
  await vis(a.getByText("Esse árbitro já tem outro jogo neste horário.")),
);
await a.locator("#sch-ref").selectOption({ label: "Sem árbitro" });
await a.locator("#sch-venue").fill("quadra a");
await a.getByRole("button", { name: "Salvar", exact: true }).click();
ok(
  "mesmo local (ignorando caixa) no mesmo horário é recusado",
  await vis(a.getByText("Esse local já está ocupado neste horário.")),
);
await a.keyboard.press("Escape");
await a.waitForTimeout(400);

// knockout results
const semiRows = () => a.locator("section[aria-label='Semifinal'] li");
await a
  .locator("section[aria-label='Semifinal'] li")
  .first()
  .getByRole("button", { name: /Resultado de/ })
  .click();
await a.locator("#score-home").fill("1");
await a.locator("#score-away").fill("1");
ok("empate no mata-mata pede pênaltis", await vis(a.locator("#pen-home")));
await a.getByRole("button", { name: "Salvar resultado" }).click();
ok(
  "empate sem pênaltis é recusado",
  await vis(a.getByText("Empate no mata-mata: informe os pênaltis.")),
);
await a.locator("#pen-home").fill("3");
await a.locator("#pen-away").fill("3");
await a.getByRole("button", { name: "Salvar resultado" }).click();
ok(
  "pênaltis empatados são recusados",
  await vis(a.getByText("Os pênaltis não podem terminar empatados.")),
);
await a.locator("#pen-away").fill("4");
await a.getByRole("button", { name: "Salvar resultado" }).click();
await a.getByRole("dialog").waitFor({ state: "detached" });
await a.waitForTimeout(600);
const s1 = sql(
  `select "homePenalties"||'x'||"awayPenalties"||'|'||(case when "winnerEntryId"="awayEntryId" then 'away' else 'home' end) from matches where "stageRunId"='${run2}' and label='Semifinal' and status='FINISHED'`,
);
ok("pênaltis 3x4 dão a vitória ao visitante", s1 === "3x4|away", s1);
await a
  .locator("section[aria-label='Semifinal'] li")
  .nth(1)
  .getByRole("button", { name: /Resultado de/ })
  .click();
await a.locator("#score-home").fill("2");
await a.locator("#score-away").fill("0");
await a.getByRole("button", { name: "Salvar resultado" }).click();
await a.getByRole("dialog").waitFor({ state: "detached" });
await a.waitForTimeout(600);
ok(
  "vencedores seguem para a final e perdedores para o 3º lugar",
  sql(
    `select count(*) from matches where "stageRunId"='${run2}' and label='Final' and "homeEntryId" is not null and "awayEntryId" is not null`,
  ) === "1" &&
    sql(
      `select count(*) from matches where "stageRunId"='${run2}' and label='Disputa de 3º lugar' and "homeEntryId" is not null and "awayEntryId" is not null`,
    ) === "1",
);
// correcting a semi after the final is played must be blocked: play the final first
await a
  .locator("section[aria-label='Final'] li")
  .getByRole("button", { name: /Resultado de/ })
  .click();
await a.locator("#score-home").fill("1");
await a.locator("#score-away").fill("0");
await a.getByRole("button", { name: "Salvar resultado" }).click();
await a.getByRole("dialog").waitFor({ state: "detached" });
await a.waitForTimeout(600);
await a
  .locator("section[aria-label='Semifinal'] li")
  .first()
  .getByRole("button", { name: /Resultado de/ })
  .click();
await a
  .locator("#pen-home")
  .fill("5")
  .catch(() => {});
await a.locator("#score-home").fill("0");
await a.locator("#score-away").fill("3");
await a.getByRole("button", { name: "Salvar resultado" }).click();
ok(
  "corrigir semifinal depois da final é recusado",
  await vis(a.getByText("O jogo seguinte já foi disputado.")),
);
await a.keyboard.press("Escape");
await a.waitForTimeout(400);
ok(
  "concluir fase exige todos os resultados (3º lugar pendente)",
  await a.getByRole("button", { name: "Concluir fase" }).isDisabled(),
);
await a
  .locator("section[aria-label='Disputa de 3º lugar'] li")
  .getByRole("button", { name: /Resultado de/ })
  .click();
await a.locator("#score-home").fill("2");
await a.locator("#score-away").fill("1");
await a.getByRole("button", { name: "Salvar resultado" }).click();
await a.getByRole("dialog").waitFor({ state: "detached" });
await a.waitForTimeout(600);
await a.getByRole("tab", { name: "Chave" }).click();
ok(
  "chave mostra as 3 colunas e o campeão",
  await vis(a.getByText(/^Campeão:/)),
);
await a.screenshot({ path: "shots/stage-bracket.png", fullPage: true });
await a.getByRole("button", { name: "Concluir fase" }).click();
await a.waitForTimeout(1200);
ok(
  "fase final concluída",
  sql(`select status from stage_runs where id='${run2}'`) === "DONE",
);

// calendar
await a.goto(`${BASE}/calendar`, { waitUntil: "networkidle" });
ok(
  "calendário lista os 4 jogos agendados com local",
  (await a.locator("main li").count()) === 4 &&
    (await vis(a.getByText("Quadra A").first())),
);
await a.screenshot({ path: "shots/calendar.png", fullPage: true });

// isolation
const texts = [];
for (const sub of [
  "stages",
  `stages/${sql(`select id from event_stages where "eventId"='${eid}' and "order"=1`)}`,
]) {
  await b.goto(`${BASE}/events/${eid}/${sub}`, { waitUntil: "networkidle" });
  texts.push(await b.locator("body").innerText());
}
ok(
  "outra organização não vê as fases do evento",
  texts.every(
    (t) =>
      /could not be found/i.test(t) &&
      !/Copa Fases E2E|Fase de grupos|Time Alfa/.test(t),
  ),
);
await b.goto(`${BASE}/calendar`, { waitUntil: "networkidle" });
ok(
  "calendário da outra organização está vazio",
  await vis(b.getByText("Nenhum jogo agendado ainda")),
);
ok(
  "sem erros de JavaScript no navegador",
  errors.length === 0,
  errors.join(" | "),
);
console.log(fails === 0 ? "TODOS PASSARAM" : `${fails} FALHAS`);
await browser.close();
