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
await a.getByLabel("Nome do evento").fill("Copa Confrontos E2E");
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

const entryOf = (runNo, g, r) =>
  sql(
    `select e.id||'|'||t.name from stage_entries e join registrations rg on rg.id=e."registrationId" join teams t on t.id=rg."teamId" where e."stageRunId"='${runOf(runNo)}' and e."originGroup"=${g} and e."originRank"=${r}`,
  ).split("|");
const entryWin = (runNo, m) =>
  sql(
    `select e.id||'|'||t.name from stage_entries e join registrations rg on rg.id=e."registrationId" join teams t on t.id=rg."teamId" where e."stageRunId"='${runOf(runNo)}' and e."originMatch"=${m}`,
  ).split("|");
const pick = async (game, side, label) => {
  await a
    .getByLabel(`Jogo ${game}, ${side === 0 ? "primeiro" : "segundo"} time`)
    .selectOption({ label });
};
const posOf = (runNo, id) =>
  sql(`select position from stage_entries where id='${id}'`);

// groups
await openStage(1);
await a.getByRole("button", { name: "Sortear", exact: true }).click();
await a.getByRole("heading", { name: /Grupo D/ }).waitFor();
await a.getByRole("button", { name: "Gerar jogos" }).click();
await a.getByRole("tab", { name: "Jogos" }).waitFor();
for (let i = 0; i < 4; i++) await play(2, 0);
ok("fase de grupos sem editor de confrontos (só mata-mata tem)", true);
await a.getByRole("button", { name: "Concluir fase e avançar" }).click();
await a.waitForTimeout(1500);

// ---- quarters: the editor
await openStage(2);
ok(
  "Quartas mostram o editor 'Confrontos' com 4 jogos",
  (await vis(a.getByRole("heading", { name: "Confrontos" }))) &&
    (await a.locator("[data-testid^='pairing-']").count()) === 4,
);
const [a1, nA1] = entryOf(2, 1, 1),
  [a2, nA2] = entryOf(2, 1, 2),
  [b1, nB1] = entryOf(2, 2, 1),
  [b2, nB2] = entryOf(2, 2, 2),
  [c1, nC1] = entryOf(2, 3, 1),
  [c2, nC2] = entryOf(2, 3, 2),
  [d1, nD1] = entryOf(2, 4, 1),
  [d2, nD2] = entryOf(2, 4, 2);
const opts = await a
  .getByLabel("Jogo 1, primeiro time")
  .locator("option")
  .allTextContents();
ok(
  "as opções dizem de onde vem cada time ('1º do Grupo A · Time ...')",
  opts.includes(`1º do Grupo A · ${nA1}`) &&
    opts.includes(`2º do Grupo D · ${nD2}`) &&
    opts.length === 8,
  opts.slice(0, 3).join(" | "),
);
// default (automatic) cross: seed 1 plays seed 8 => 1A x 2D
const g1def = [
  await a.getByLabel("Jogo 1, primeiro time").inputValue(),
  await a.getByLabel("Jogo 1, segundo time").inputValue(),
];
ok(
  "o automático põe o 1º do Grupo A contra o 2º do Grupo D no jogo 1",
  g1def[0] === a1 && g1def[1] === d2,
);
ok(
  "sem mudanças: o botão Salvar fica desabilitado e aparece 'Automático'",
  (await a.getByRole("button", { name: "Salvar confrontos" }).isDisabled()) &&
    (await vis(a.getByText("Automático", { exact: true }))),
);

// rematch warning: put 1A against 2A
await pick(1, 1, `2º do Grupo A · ${nA2}`);
ok(
  "1º e 2º do mesmo grupo no mesmo jogo mostram o aviso 'Mesmo grupo da fase anterior'",
  await vis(
    a.getByTestId("pairing-1").getByText("Mesmo grupo da fase anterior"),
  ),
);
ok(
  "com alterações não salvas, 'Gerar jogos' fica bloqueado e aparece o aviso",
  (await a.getByRole("button", { name: "Gerar jogos" }).isDisabled()) &&
    (await vis(a.getByText("Salve os confrontos antes de gerar os jogos."))),
);
// target: 1A x 2B | 1B x 2A | 1C x 2D | 1D x 2C
const target = [
  [a1, `1º do Grupo A · ${nA1}`],
  [b2, `2º do Grupo B · ${nB2}`],
  [b1, `1º do Grupo B · ${nB1}`],
  [a2, `2º do Grupo A · ${nA2}`],
  [c1, `1º do Grupo C · ${nC1}`],
  [d2, `2º do Grupo D · ${nD2}`],
  [d1, `1º do Grupo D · ${nD1}`],
  [c2, `2º do Grupo C · ${nC2}`],
];
for (let slot = 0; slot < 8; slot++)
  await pick(Math.floor(slot / 2) + 1, slot % 2, target[slot][1]);
const sel = async (g, s) =>
  a
    .getByLabel(`Jogo ${g}, ${s === 0 ? "primeiro" : "segundo"} time`)
    .inputValue();
ok(
  "trocar um time de lugar manda quem estava lá para o lugar dele (ninguém repete, ninguém some)",
  (
    await Promise.all([1, 2, 3, 4].flatMap((g) => [0, 1].map((s) => sel(g, s))))
  ).join() === target.map((t) => t[0]).join(),
);
ok(
  "o aviso de mesmo grupo some quando os confrontos são cruzados",
  (await a.getByText("Mesmo grupo da fase anterior").count()) === 0,
);
await a.getByRole("button", { name: "Salvar confrontos" }).click();
await a.waitForTimeout(1200);
ok(
  "banco: posições gravadas na ordem escolhida e confronto marcado como manual",
  sql(
    `select string_agg(id,',' order by position) from stage_entries where "stageRunId"='${runOf(2)}'`,
  ) === target.map((t) => t[0]).join() &&
    sql(`select "manualPairing" from stage_runs where id='${runOf(2)}'`) ===
      "t",
);
ok(
  "depois de salvar: badge 'Confrontos definidos por você' e Gerar jogos liberado",
  (await vis(a.getByText("Confrontos definidos por você"))) &&
    !(await a.getByRole("button", { name: "Gerar jogos" }).isDisabled()),
);
// back to automatic and again manual
await a.getByRole("button", { name: "Voltar ao automático" }).click();
await a.waitForTimeout(1200);
ok(
  "'Voltar ao automático' restaura o cruzamento padrão (1A x 2D no jogo 1) e desmarca o manual",
  sql(`select "manualPairing" from stage_runs where id='${runOf(2)}'`) ===
    "f" && (await a.getByLabel("Jogo 1, segundo time").inputValue()) === d2,
);
for (let slot = 0; slot < 8; slot++)
  await pick(Math.floor(slot / 2) + 1, slot % 2, target[slot][1]);
await a.getByRole("button", { name: "Salvar confrontos" }).click();
await a.waitForTimeout(1200);
await a.screenshot({ path: "shots/pairings-quarters.png", fullPage: true });
await a.getByRole("button", { name: "Gerar jogos" }).click();
await a.getByRole("tab", { name: "Jogos" }).waitFor();
const q = sql(
  `select string_agg(h."id"||'>'||w."id", ',' order by m.position) from matches m join stage_entries h on h.id=m."homeEntryId" join stage_entries w on w.id=m."awayEntryId" where m."stageRunId"='${runOf(2)}'`,
);
ok(
  "os 4 jogos das quartas saem exatamente como definido: 1A×2B, 1B×2A, 1C×2D, 1D×2C",
  q === `${a1}>${b2},${b1}>${a2},${c1}>${d2},${d1}>${c2}`,
  q,
);
await a.getByRole("tab", { name: "Participantes" }).click();
ok(
  "com os jogos gerados o editor some e a lista mostra a origem de cada time",
  (await a.getByRole("heading", { name: "Confrontos" }).count()) === 0 &&
    (await vis(a.getByText(`1º do Grupo A`).first())),
);

// ---- quarters results: home wins; semis editor
await a.getByRole("tab", { name: "Jogos" }).click();
for (let i = 0; i < 4; i++) await play(1, 0);
await a.getByRole("button", { name: "Concluir fase e avançar" }).click();
await a.waitForTimeout(1500);
await openStage(3);
const [w1, nW1] = entryWin(3, 1),
  [w2, nW2] = entryWin(3, 2),
  [w3, nW3] = entryWin(3, 3),
  [w4, nW4] = entryWin(3, 4);
const sopts = await a
  .getByLabel("Jogo 1, primeiro time")
  .locator("option")
  .allTextContents();
ok(
  "Semi-final: as opções dizem 'Vencedor do jogo N (Quartas de final)'",
  sopts.some((o) => o.startsWith("Vencedor do jogo 1 (Quartas de final)")) &&
    sopts.length === 4,
  sopts.join(" | "),
);
ok(
  "o automático mantém a chave: jogo 1 = vencedores dos jogos 1 e 2",
  [await sel(1, 0), await sel(1, 1)].join() === [w1, w2].join(),
);
// custom: W1 x W3 | W2 x W4
const sTarget = [
  [w1, sopts.find((o) => o.includes("jogo 1 "))],
  [w3, sopts.find((o) => o.includes("jogo 3 "))],
  [w2, sopts.find((o) => o.includes("jogo 2 "))],
  [w4, sopts.find((o) => o.includes("jogo 4 "))],
];
for (let slot = 0; slot < 4; slot++)
  await pick(Math.floor(slot / 2) + 1, slot % 2, sTarget[slot][1]);
await a.getByRole("button", { name: "Salvar confrontos" }).click();
await a.waitForTimeout(1200);
await a.getByRole("button", { name: "Gerar jogos" }).click();
await a.getByRole("tab", { name: "Jogos" }).waitFor();
const sm = sql(
  `select string_agg(h.id||'>'||w.id, ',' order by m.position) from matches m join stage_entries h on h.id=m."homeEntryId" join stage_entries w on w.id=m."awayEntryId" where m."stageRunId"='${runOf(3)}' and m.label='Semifinal'`,
);
ok(
  "semifinais saem como definido: vencedor do jogo 1 × vencedor do jogo 3, vencedor do 2 × vencedor do 4",
  sm === `${w1}>${w3},${w2}>${w4}`,
  sm,
);
ok(
  "a disputa de 3º lugar foi criada (vem da configuração da fase)",
  sql(
    `select count(*) from matches where "stageRunId"='${runOf(3)}' and label='Disputa de 3º lugar'`,
  ) === "1",
);
// semis + third, complete, final stage
for (let i = 0; i < 3; i++) await play(2, 1);
await a.getByRole("button", { name: "Concluir fase e avançar" }).click();
await a.waitForTimeout(1500);
await openStage(4);
const fopts = await a
  .getByLabel("Jogo 1, primeiro time")
  .locator("option")
  .allTextContents();
ok(
  "Final: duas opções 'Vencedor do jogo 1/2 (Semi-final)'",
  fopts.length === 2 && fopts.every((o) => o.includes("(Semi-final)")),
  fopts.join(" | "),
);
await a.getByRole("button", { name: "Gerar jogos" }).click();
await a.getByRole("tab", { name: "Jogos" }).waitFor();
await play(3, 2);
ok("campeão aparece no fim", await vis(a.getByText(/^Campeão:/)));
await a.getByRole("button", { name: "Concluir fase" }).click();
await a.waitForTimeout(1200);
ok(
  "as 4 fases concluídas",
  sql(
    `select count(*) from stage_runs r join event_stages s on s.id=r."stageId" where s."eventId"='${eid}' and r.status='DONE'`,
  ) === "4",
);
// leave no public trace
await a.goto(`${BASE}/events/${eid}`, { waitUntil: "networkidle" });
await a
  .getByRole("switch", { name: "Divulgar este evento na página pública" })
  .click();
await a.waitForTimeout(1200);
ok(
  "evento de teste ocultado ao final",
  sql(`select "publicVisible" from events where id='${eid}'`) === "f",
);
ok("sem erros de JavaScript", errors.length === 0, errors.join(" | "));
console.log(fails === 0 ? "TODOS PASSARAM" : `${fails} FALHAS`);
await browser.close();
