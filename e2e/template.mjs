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
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 1300 },
  reducedMotion: "reduce",
});
const a = await ctx.newPage();
a.setDefaultTimeout(12000);
const orig = a.locator.bind(a);
a.locator = (sel, o) =>
  typeof sel === "string" && /^(input|select|main)/.test(sel)
    ? orig(sel + ":visible", o)
    : orig(sel, o);
a.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await a.goto(BASE + "/signup", { waitUntil: "networkidle" });
await a.getByLabel("Nome da organização").fill(`Cadeia ${T}`);
await a.getByLabel("Nome do responsável").fill("Org");
await a.getByLabel("E-mail").fill(`ch.${T}@example.com`);
await a.getByLabel("Senha", { exact: true }).fill(PASS);
await a.getByLabel("Confirmar senha").fill(PASS);
await a.getByRole("checkbox").check();
await a.getByRole("button", { name: /Criar conta/ }).click();
await a.waitForURL((u) => new URL(u).pathname === "/dashboard");
const orgA = sql(
  `select o.id from organizations o join users u on u."organizationId"=o.id where u.email=lower('ch.${T}@example.com')`,
);
const userA = sql(
  `select id from users where email=lower('ch.${T}@example.com')`,
);
await a.goto(BASE + "/events/new", { waitUntil: "networkidle" });
await a.getByLabel("Nome do evento").fill("Copa Modelo E2E");
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
const eid = new URL(a.url()).pathname.split("/").pop();
const cat = sql(`select id from event_categories where "eventId"='${eid}'`);
sql(
  `insert into event_rules(id,"eventId","scoringModel",tiebreakers,"updatedAt") values('${rid("r")}','${eid}','POINTS','[{"key":"POINTS","scope":"OVERALL"},{"key":"DRAW_LOTS","scope":"OVERALL"}]',now())`,
);
sql(
  `insert into event_stages(id,"eventId","order",name,type,"groupCount","groupSize","advancingPerGroup","roundRobinLegs","thirdPlaceMatch",seeding,"updatedAt") values('${rid("s")}','${eid}',1,'Fase de grupos','GROUPS',4,2,2,1,false,'RANDOM',now()),('${rid("s")}','${eid}',2,'Quartas de final','SINGLE_ELIM',null,null,null,1,false,'MANUAL',now()),('${rid("s")}','${eid}',3,'Semi-final','SINGLE_ELIM',null,null,null,1,true,'MANUAL',now()),('${rid("s")}','${eid}',4,'Final','SINGLE_ELIM',null,null,null,1,false,'MANUAL',now())`,
);
for (const n of [
  "Alfa",
  "Bravo",
  "Charlie",
  "Delta",
  "Eco",
  "Foxtrot",
  "Golf",
  "Hotel",
]) {
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
}
const stageId = (o) =>
  sql(`select id from event_stages where "eventId"='${eid}' and "order"=${o}`);
const runOf = (o) =>
  sql(`select id from stage_runs where "stageId"='${stageId(o)}'`);
const openStage = async (o) => {
  await a.goto(`${BASE}/events/${eid}/stages/${stageId(o)}`, {
    waitUntil: "networkidle",
  });
};
const play = async (h, aw) => {
  await a
    .locator("button", { hasText: /^Resultado$/ })
    .first()
    .click();
  await a.locator("#score-home").fill(String(h));
  await a.locator("#score-away").fill(String(aw));
  await a.getByRole("button", { name: "Salvar resultado" }).click();
  await a.getByRole("dialog").waitFor({ state: "detached" });
  await a.waitForTimeout(500);
};

const jsonOf = (id) =>
  sql(
    `select coalesce(pairings::text,'null') from event_stages where id='${id}'`,
  );
const sel = async (label) => a.getByLabel(label);
// ===== PART A: rules locked, configure on the stage page
await openStage(1);
await a.getByRole("button", { name: "Sortear", exact: true }).click();
await a.getByRole("heading", { name: /Grupo D/ }).waitFor();
await a.getByRole("button", { name: "Gerar jogos" }).click();
await a.getByRole("tab", { name: "Jogos" }).waitFor();
for (let i = 0; i < 4; i++) await play(2, 0);
ok(
  "regras travadas pelo primeiro resultado (o caso do evento do usuário)",
  sql(`select "rulesLockedAt" is not null from events where id='${eid}'`) ===
    "t",
);

await openStage(2);
ok(
  "Quartas (sem sorteio ainda) mostram 'Confrontos desta fase' em modo Automático",
  (await vis(a.getByRole("heading", { name: "Confrontos desta fase" }))) &&
    (await vis(
      a.getByTestId("stage-editor").getByText("Automático", { exact: true }),
    )),
);
ok(
  "o automático lista os confrontos reais do sistema (jogo 1 = 1º do Grupo A × 2º do Grupo D)",
  (await a.getByTestId("stage-game-1").innerText()).includes("1º do Grupo A") &&
    (await a.getByTestId("stage-game-1").innerText()).includes("2º do Grupo D"),
);
await a.getByRole("button", { name: "Definir os confrontos" }).click();
const Q = "Quartas de final";
const pickQ = async (game, side, label) =>
  a
    .getByLabel(
      `${Q}: jogo ${game}, ${side === 0 ? "primeiro" : "segundo"} time`,
    )
    .selectOption({ label });
const wantQ = [
  "1º do Grupo A",
  "2º do Grupo B",
  "1º do Grupo B",
  "2º do Grupo A",
  "1º do Grupo C",
  "2º do Grupo D",
  "1º do Grupo D",
  "2º do Grupo C",
];
for (let slot = 0; slot < 8; slot++)
  await pickQ(Math.floor(slot / 2) + 1, slot % 2, wantQ[slot]);
await a.getByRole("button", { name: "Salvar confrontos" }).click();
await a.waitForTimeout(1200);
const st2 = sql(
  `select id from event_stages where "eventId"='${eid}' and "order"=2`,
);
const saved = JSON.parse(jsonOf(st2));
ok(
  "salvo no banco, mesmo com as regras travadas: 1A×2B, 1B×2A, 1C×2D, 1D×2C",
  saved.length === 4 &&
    saved
      .map((p) => `${p.a.group}${p.a.rank}-${p.b.group}${p.b.rank}`)
      .join() === "11-22,21-12,31-42,41-32",
  jsonOf(st2).slice(0, 120),
);
// semis: V1xV3, V2xV4
await openStage(3);
const S3 = "Semi-final";
await a.getByRole("button", { name: "Definir os confrontos" }).click();
const wantS = [
  "Vencedor do jogo 1",
  "Vencedor do jogo 3",
  "Vencedor do jogo 2",
  "Vencedor do jogo 4",
];
for (let slot = 0; slot < 4; slot++) {
  const lbl = (
    await a
      .getByLabel(
        `${S3}: jogo ${Math.floor(slot / 2) + 1}, ${slot % 2 === 0 ? "primeiro" : "segundo"} time`,
      )
      .locator("option")
      .allTextContents()
  ).find((o) => o.startsWith(wantS[slot]));
  await a
    .getByLabel(
      `${S3}: jogo ${Math.floor(slot / 2) + 1}, ${slot % 2 === 0 ? "primeiro" : "segundo"} time`,
    )
    .selectOption({ label: lbl });
}
ok(
  "opções da semi citam 'Vencedor do jogo N (Quartas de final)'",
  (
    await a
      .getByLabel(`${S3}: jogo 1, primeiro time`)
      .locator("option")
      .allTextContents()
  ).every((o) => o.includes("(Quartas de final)")),
);
await a.getByRole("button", { name: "Salvar confrontos" }).click();
await a.waitForTimeout(1200);
const st3 = sql(
  `select id from event_stages where "eventId"='${eid}' and "order"=3`,
);
ok(
  "semi salva: V1×V3 e V2×V4",
  JSON.parse(jsonOf(st3))
    .map((p) => `${p.a.match}-${p.b.match}`)
    .join() === "1-3,2-4",
);
// final: automatic stays
await openStage(4);
ok(
  "Final: só 2 origens, confrontos automáticos e salvar desabilitado",
  (await vis(
    a.getByTestId("stage-editor").getByText("Automático", { exact: true }),
  )) &&
    (await a.getByRole("button", { name: "Salvar confrontos" }).isDisabled()),
);
// reload keeps the saved template
await openStage(2);
ok(
  "ao reabrir, as Quartas mostram 'Confrontos definidos por você'",
  (await vis(
    a.getByTestId("stage-editor").getByText("Confrontos definidos por você"),
  )) &&
    (await a.getByLabel(`${Q}: jogo 1, segundo time`).inputValue()).length > 0,
);

// complete groups: the system builds the quarters from the template
await openStage(1);
await a.getByRole("button", { name: "Concluir fase e avançar" }).click();
await a.waitForTimeout(1800);
ok(
  "ao concluir os grupos, a fase das Quartas nasce com os confrontos definidos (manual)",
  sql(`select "manualPairing" from stage_runs where id='${runOf(2)}'`) === "t",
);
const ent = (runNo, g, r) =>
  sql(
    `select e.id from stage_entries e where e."stageRunId"='${runOf(runNo)}' and e."originGroup"=${g} and e."originRank"=${r}`,
  );
const order = sql(
  `select string_agg(e.id,',' order by e.position) from stage_entries e where e."stageRunId"='${runOf(2)}'`,
);
const expected = [
  [1, 1],
  [2, 2],
  [2, 1],
  [1, 2],
  [3, 1],
  [4, 2],
  [4, 1],
  [3, 2],
]
  .map(([g, r]) => ent(2, g, r))
  .join();
ok(
  "posições dos 8 times seguem exatamente o modelo (sem o organizador fazer nada)",
  order === expected,
);
await openStage(2);
ok(
  "o editor da fase já mostra os confrontos do modelo e o selo 'definidos por você'",
  (await vis(a.getByText("Confrontos definidos por você"))) &&
    (await a.getByLabel("Jogo 1, segundo time").inputValue()) === ent(2, 2, 2),
);
await a.getByRole("button", { name: "Gerar jogos" }).click();
await a.getByRole("tab", { name: "Jogos" }).waitFor();
const q = sql(
  `select string_agg(h.id||'>'||w.id, ',' order by m.position) from matches m join stage_entries h on h.id=m."homeEntryId" join stage_entries w on w.id=m."awayEntryId" where m."stageRunId"='${runOf(2)}'`,
);
ok(
  "jogos das quartas: 1A×2B, 1B×2A, 1C×2D, 1D×2C",
  q ===
    `${ent(2, 1, 1)}>${ent(2, 2, 2)},${ent(2, 2, 1)}>${ent(2, 1, 2)},${ent(2, 3, 1)}>${ent(2, 4, 2)},${ent(2, 4, 1)}>${ent(2, 3, 2)}`,
  q.slice(0, 80),
);
for (let i = 0; i < 4; i++) await play(1, 0);
await a.getByRole("button", { name: "Concluir fase e avançar" }).click();
await a.waitForTimeout(1800);
ok(
  "a semi nasce com V1×V3 e V2×V4 (manual)",
  sql(`select "manualPairing" from stage_runs where id='${runOf(3)}'`) === "t",
);
await openStage(3);
await a.getByRole("button", { name: "Gerar jogos" }).click();
await a.getByRole("tab", { name: "Jogos" }).waitFor();
const w = (m) =>
  sql(
    `select e.id from stage_entries e where e."stageRunId"='${runOf(3)}' and e."originMatch"=${m}`,
  );
const sm = sql(
  `select string_agg(h.id||'>'||w.id, ',' order by m.position) from matches m join stage_entries h on h.id=m."homeEntryId" join stage_entries w on w.id=m."awayEntryId" where m."stageRunId"='${runOf(3)}' and m.label='Semifinal'`,
);
ok(
  "semifinais: vencedor do jogo 1 × vencedor do jogo 3 e vencedor do 2 × vencedor do 4",
  sm === `${w(1)}>${w(3)},${w(2)}>${w(4)}`,
);
for (let i = 0; i < 3; i++) await play(2, 1);
await a.getByRole("button", { name: "Concluir fase e avançar" }).click();
await a.waitForTimeout(1800);
ok(
  "a final (sem modelo) usa o automático: não é manual",
  sql(`select "manualPairing" from stage_runs where id='${runOf(4)}'`) === "f",
);
await openStage(4);
await a.getByRole("button", { name: "Gerar jogos" }).click();
await a.getByRole("tab", { name: "Jogos" }).waitFor();
await play(3, 2);
ok("campeão definido", await vis(a.getByText(/^Campeão:/)));

// ===== PART B: configure in the rules editor (event without results)
await a.goto(BASE + "/events/new", { waitUntil: "networkidle" });
await a.getByLabel("Nome do evento").fill("Copa Modelo Regras E2E");
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
const eid2 = new URL(a.url()).pathname.split("/").pop();
sql(
  `insert into event_rules(id,"eventId","scoringModel",tiebreakers,"updatedAt") values('${rid("r")}','${eid2}','POINTS','[{"key":"POINTS","scope":"OVERALL"},{"key":"DRAW_LOTS","scope":"OVERALL"}]',now())`,
);
sql(
  `insert into event_stages(id,"eventId","order",name,type,"groupCount","groupSize","advancingPerGroup","roundRobinLegs","thirdPlaceMatch",seeding,"updatedAt") values('${rid("s")}','${eid2}',1,'Grupos','GROUPS',4,4,2,1,false,'RANDOM',now()),('${rid("s")}','${eid2}',2,'Quartas','SINGLE_ELIM',null,null,null,1,false,'MANUAL',now()),('${rid("s")}','${eid2}',3,'Semi','SINGLE_ELIM',null,null,null,1,false,'MANUAL',now()),('${rid("s")}','${eid2}',4,'Final','SINGLE_ELIM',null,null,null,1,false,'MANUAL',now())`,
);
await a.goto(`${BASE}/events/${eid2}/rules`, { waitUntil: "networkidle" });
await a.getByRole("tab", { name: "Fases" }).click();
ok(
  "editor de regras mostra o bloco 'Confrontos' nas 3 fases de mata-mata (e não na de grupos)",
  (await a
    .getByRole("heading", { name: "Confrontos", exact: true })
    .count()) === 3,
  String(
    await a.getByRole("heading", { name: "Confrontos", exact: true }).count(),
  ),
);
await a
  .getByTestId("rules-1-editor")
  .getByRole("button", { name: "Definir os confrontos" })
  .click();
const pickR = async (game, side, label) =>
  a
    .getByLabel(
      `Quartas: jogo ${game}, ${side === 0 ? "primeiro" : "segundo"} time`,
    )
    .selectOption({ label });
for (let slot = 0; slot < 8; slot++)
  await pickR(Math.floor(slot / 2) + 1, slot % 2, wantQ[slot]);
await a.getByRole("button", { name: "Salvar regras" }).click();
await a.waitForURL((u) => new URL(u).pathname === `/events/${eid2}`);
const st2b = sql(
  `select id from event_stages where "eventId"='${eid2}' and "order"=2`,
);
ok(
  "salvar as regras grava os confrontos da fase",
  JSON.parse(jsonOf(st2b))
    .map((p) => `${p.a.group}${p.a.rank}-${p.b.group}${p.b.rank}`)
    .join() === "11-22,21-12,31-42,41-32",
);
ok(
  "as outras fases continuam automáticas (nulo)",
  jsonOf(
    sql(`select id from event_stages where "eventId"='${eid2}' and "order"=3`),
  ) === "null",
);
await a.goto(`${BASE}/events/${eid2}/rules`, { waitUntil: "networkidle" });
await a.getByRole("tab", { name: "Fases" }).click();
ok(
  "ao reabrir, as regras mostram os confrontos salvos",
  await vis(
    a.getByTestId("rules-1-editor").getByText("Confrontos definidos por você"),
  ),
);
// make the saved template stop fitting: 1 qualifier per group instead of 2
await a.getByLabel("Avançam por grupo").fill("1");
ok(
  "mudar a fase anterior (1 classificado por grupo) avisa que os confrontos salvos não combinam",
  await vis(
    a
      .getByTestId("rules-1-editor")
      .getByText(/não combinam mais com a fase anterior/),
  ),
);
await a.getByRole("button", { name: "Salvar regras" }).click();
ok(
  "o servidor recusa salvar confrontos que não combinam com a fase anterior",
  (await vis(
    a
      .getByText(
        /Revise os campos|define todos os confrontos|não existe na fase anterior|Esta fase tem/,
      )
      .first(),
  )) &&
    sql(
      `select "advancingPerGroup" from event_stages where "eventId"='${eid2}' and "order"=1`,
    ) === "2",
);
await a.screenshot({ path: "shots/template-rules.png", fullPage: true });
// hide both test events
for (const id of [eid, eid2]) {
  await a.goto(`${BASE}/events/${id}`, { waitUntil: "networkidle" });
  await a
    .getByRole("switch", { name: "Divulgar este evento na página pública" })
    .click();
  await a.waitForTimeout(900);
}
ok(
  "eventos de teste ocultados ao final",
  sql(
    `select count(*) from events where id in ('${eid}','${eid2}') and "publicVisible"`,
  ) === "0",
);
ok("sem erros de JavaScript", errors.length === 0, errors.join(" | "));
console.log(fails === 0 ? "TODOS PASSARAM" : `${fails} FALHAS`);
await browser.close();
