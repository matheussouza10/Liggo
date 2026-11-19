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
const pubErrors = [];
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
await a.getByLabel("Nome do evento").fill("Copa Cadeia E2E");
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
  `insert into event_rules(id,"eventId","scoringModel",tiebreakers,penalties,"updatedAt") values('${rid("r")}','${eid}','POINTS','[{"key":"POINTS","scope":"OVERALL"},{"key":"DRAW_LOTS","scope":"OVERALL"}]',true,now())`,
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
    reg = rid("g");
  sql(
    `insert into teams(id,"organizationId",name,"updatedAt") values('${tid}','${orgA}','Time ${n}',now())`,
  );
  sql(
    `insert into registrations(id,"eventId","categoryId","teamId","createdById","updatedAt") values('${reg}','${eid}','${cat}','${tid}','${userA}',now())`,
  );
  for (let k = 1; k <= 3; k++) {
    const aid = rid("a");
    sql(
      `insert into athletes(id,name,"birthDate",gender,"createdByOrganizationId","updatedAt") values('${aid}','Atleta ${n} ${k}','1995-01-01','MALE','${orgA}',now())`,
    );
    sql(
      `insert into organization_athletes("organizationId","athleteId") values('${orgA}','${aid}')`,
    );
    sql(
      `insert into registration_members(id,"registrationId","athleteId","categoryId","shirtNumber") values('${rid("m")}','${reg}','${aid}','${cat}',${k})`,
    );
  }
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

// ---- dashboard with real data
await a.goto(BASE + "/dashboard", { waitUntil: "networkidle" });
const numbers = await a
  .locator("section[aria-label='Números'] a")
  .allTextContents();
ok(
  "painel mostra os números reais (1 evento, 8 times, 24 atletas)",
  numbers.join("|").includes("1Eventos") &&
    numbers.join("|").includes("8Times ativos") &&
    numbers.join("|").includes("24Atletas"),
  numbers.join("|"),
);
ok(
  "painel mostra o evento na lista e sem 'primeiros passos'",
  (await vis(a.getByText("Copa Cadeia E2E").first())) &&
    (await a.getByText("Por onde começar").count()) === 0,
);
ok(
  "painel sem jogos ao vivo orienta o que fazer",
  await vis(a.getByText("Nenhum jogo ao vivo.")),
);
await a.screenshot({ path: "shots/dashboard-1.png", fullPage: true });

// ---- groups draw + matches
await openStage(1);
await a.getByRole("button", { name: "Sortear", exact: true }).click();
await a.getByRole("heading", { name: /Grupo D/ }).waitFor();
await a.getByRole("button", { name: "Gerar jogos" }).click();
await a.getByRole("tab", { name: "Jogos" }).waitFor();

// ---- public visitor (no login)
const pubCtx = await browser.newContext({
  viewport: { width: 1280, height: 1100 },
});
const pub = await pubCtx.newPage();
pub.setDefaultTimeout(12000);
pub.on("pageerror", (e) => pubErrors.push(String(e).slice(0, 200)));
await pub.goto(BASE + "/watch", { waitUntil: "networkidle" });
ok(
  "visitante sem login abre /watch (sem redirecionar para login)",
  new URL(pub.url()).pathname === "/watch" &&
    (await vis(pub.getByRole("heading", { name: "Acompanhe os jogos" }))),
);
ok(
  "lista mostra o evento público",
  await vis(pub.getByRole("link", { name: /Copa Cadeia E2E/ }).first()),
);
ok(
  "antes de iniciar, nenhum jogo deste evento aparece em 'Ao vivo agora'",
  (await pub
    .locator("section[aria-labelledby=live-heading]")
    .getByText("Copa Cadeia E2E")
    .count()) === 0,
);

// ---- start a match
await a.getByRole("link", { name: "Ao vivo" }).first().click();
await a.waitForURL((u) => /\/matches\/[^/]+$/.test(new URL(u).pathname));
const matchId = new URL(a.url()).pathname.split("/").pop();
const matchUrl = a.url();
ok(
  "controle do jogo mostra 'Agendado' e o botão Iniciar",
  (await vis(a.getByRole("button", { name: "Iniciar jogo" }))) &&
    (await vis(a.getByText("Agendado", { exact: true }).first())),
);
ok(
  "sem iniciar não há botões de lance",
  (await a.getByRole("button", { name: /do mandante/ }).count()) === 0,
);
await a.getByRole("button", { name: "Iniciar jogo" }).click();
await a.getByRole("button", { name: "Encerrar jogo" }).waitFor();
ok(
  "iniciar: jogo ao vivo, 0 x 0 e lance 'Início do jogo'",
  (await a.getByTestId("live-score").textContent()).replace(/\s+/g, "") ===
    "0x0" &&
    (await a.getByTestId("timeline-item").count()) === 1 &&
    (await vis(a.getByText("Início do jogo"))),
);
ok(
  "banco: startedAt gravado e evento KICKOFF criado",
  sql(`select "startedAt" is not null from matches where id='${matchId}'`) ===
    "t" &&
    sql(
      `select count(*) from match_events where "matchId"='${matchId}' and type='KICKOFF'`,
    ) === "1",
);

// public page of this match
await pub.goto(`${BASE}/watch/matches/${matchId}`, {
  waitUntil: "networkidle",
});
ok(
  "público vê o jogo ao vivo com 0 x 0",
  (await vis(pub.getByText(/^Ao vivo/).first())) &&
    (await pub.getByTestId("public-score").textContent()).replace(
      /\s+/g,
      "",
    ) === "0x0",
);
await pub.goto(BASE + "/watch", { waitUntil: "networkidle" });
ok(
  "/watch lista o jogo deste evento em 'Ao vivo agora'",
  await vis(
    pub
      .locator("section[aria-labelledby=live-heading]")
      .getByText("Copa Cadeia E2E")
      .first(),
  ),
);
await pub.goto(`${BASE}/watch/matches/${matchId}`, {
  waitUntil: "networkidle",
});

// ---- goal with scorer and assist
const lance = async (name, fn) => {
  await a.getByRole("button", { name }).click();
  await a.getByRole("dialog").waitFor();
  await fn?.();
  await a.getByRole("button", { name: "Lançar", exact: true }).click();
  await a.getByRole("dialog").waitFor({ state: "detached" });
  await a.waitForTimeout(400);
};
await a.getByRole("button", { name: "Gol / ponto do mandante" }).click();
await a.getByRole("dialog").waitFor();
await a.locator("#lance-minute").fill("12");
await a.locator("#lance-player").selectOption({ index: 1 });
await a.locator("#lance-other").selectOption({ index: 2 });
const tGoal = Date.now();
await a.getByRole("button", { name: "Lançar", exact: true }).click();
await a.getByRole("dialog").waitFor({ state: "detached" });
ok(
  "gol do mandante: placar do organizador vai a 1 x 0",
  await a
    .waitForFunction(
      () =>
        document
          .querySelector("[data-testid=live-score]")
          ?.textContent.replace(/\s+/g, "") === "1x0",
      { timeout: 6000 },
    )
    .then(() => true)
    .catch(() => false),
);
await pub
  .waitForFunction(
    () =>
      document
        .querySelector("[data-testid=public-score]")
        ?.textContent.replace(/\s+/g, "") === "1x0",
    { timeout: 9000 },
  )
  .catch(() => {});
const latency = Date.now() - tGoal;
ok(
  "tempo real: o visitante vê 1 x 0 sem recarregar a página (até 9 s)",
  (await pub.getByTestId("public-score").textContent()).replace(/\s+/g, "") ===
    "1x0",
  `${(latency / 1000).toFixed(1)}s`,
);
ok(
  "visitante vê o lance 'Gol' com minuto, time, autor e assistência",
  await vis(
    pub
      .getByTestId("public-event")
      .filter({ hasText: "12'" })
      .filter({ hasText: "Gol" })
      .filter({ hasText: "Assistência" }),
  ),
);
ok(
  "banco: placar ao vivo 1 x 0",
  sql(
    `select "liveHome"||'x'||"liveAway" from matches where id='${matchId}'`,
  ) === "1x0",
);

// ---- other lances
await lance("Cartão amarelo do visitante", async () => {
  await a.locator("#lance-minute").fill("20");
  await a.locator("#lance-player").selectOption({ index: 1 });
});
await lance("Substituição do mandante", async () => {
  await a.locator("#lance-minute").fill("30");
  await a.locator("#lance-player").selectOption({ index: 1 });
  await a.locator("#lance-other").selectOption({ index: 3 });
});
await lance("Gol contra do mandante", async () => {
  await a.locator("#lance-minute").fill("35");
  await a.locator("#lance-player").selectOption({ index: 2 });
});
ok(
  "gol contra do mandante conta para o visitante: 1 x 1",
  (await a.getByTestId("live-score").textContent()).replace(/\s+/g, "") ===
    "1x1",
);
await a.getByRole("button", { name: "Lance importante" }).click();
await a.getByRole("dialog").waitFor();
await a.getByRole("button", { name: "Lançar", exact: true }).click();
ok(
  "lance importante sem descrição é recusado",
  await vis(a.getByText("Descreva o lance.")),
);
await a.locator("#lance-text").fill("Bola na trave do visitante");
await a.locator("#lance-minute").fill("41");
await a.getByRole("button", { name: "Lançar", exact: true }).click();
await a.getByRole("dialog").waitFor({ state: "detached" });
await lance("Fim de período / intervalo", async () => {
  await a.locator("#lance-minute").fill("45");
});
// validations
await a.getByRole("button", { name: "Substituição do visitante" }).click();
await a.getByRole("dialog").waitFor();
await a.getByRole("button", { name: "Lançar", exact: true }).click();
ok(
  "substituição sem os atletas é recusada",
  await vis(a.getByText(/Escolha quem sai/i)),
);
await a.locator("#lance-minute").fill("999");
await a.getByRole("button", { name: "Lançar", exact: true }).click();
ok(
  "minuto fora de 0 a 300 é recusado",
  await vis(a.getByText("Minuto de 0 a 300.")),
);
await a.keyboard.press("Escape");
await a.waitForTimeout(400);
ok(
  "lances do organizador: 7 itens na linha do tempo",
  (await a.getByTestId("timeline-item").count()) === 7,
  String(await a.getByTestId("timeline-item").count()),
);
await pub
  .waitForFunction(
    () => document.querySelectorAll("[data-testid=public-event]").length === 7,
    { timeout: 9000 },
  )
  .catch(() => {});
ok(
  "o visitante também vê os 7 lances",
  (await pub.getByTestId("public-event").count()) === 7,
);
const first = await pub.getByTestId("public-event").first().textContent();
ok(
  "lances do mais novo para o mais antigo (o intervalo vem primeiro)",
  /Fim de período/.test(first) && /45'/.test(first),
  first.slice(0, 60),
);
await pub.screenshot({ path: "shots/public-live.png", fullPage: true });

// delete the own goal -> score back to 1 x 0 for everybody
await a.getByRole("button", { name: /Excluir lance: Gol contra/ }).click();
await a.waitForTimeout(800);
ok(
  "excluir o gol contra desfaz o placar (1 x 0)",
  (await a.getByTestId("live-score").textContent()).replace(/\s+/g, "") ===
    "1x0" &&
    sql(
      `select "liveHome"||'x'||"liveAway" from matches where id='${matchId}'`,
    ) === "1x0",
);
await pub
  .waitForFunction(
    () =>
      document
        .querySelector("[data-testid=public-score]")
        ?.textContent.replace(/\s+/g, "") === "1x0" &&
      document.querySelectorAll("[data-testid=public-event]").length === 6,
    { timeout: 9000 },
  )
  .catch(() => {});
ok(
  "o visitante vê o placar e os lances atualizados após a exclusão",
  (await pub.getByTestId("public-score").textContent()).replace(/\s+/g, "") ===
    "1x0" && (await pub.getByTestId("public-event").count()) === 6,
);
ok(
  "início do jogo não pode ser excluído (sem botão)",
  (await a
    .getByRole("button", { name: /Excluir lance: Início do jogo/ })
    .count()) === 0,
);

// ---- finish
await a.getByRole("button", { name: "Encerrar jogo" }).click();
await a.getByRole("dialog").waitFor();
ok(
  "encerrar abre o resultado já com o placar ao vivo (1 x 0)",
  (await a.locator("#score-home").inputValue()) === "1" &&
    (await a.locator("#score-away").inputValue()) === "0",
);
await a.getByRole("button", { name: "Salvar resultado" }).click();
await a.getByRole("dialog").waitFor({ state: "detached" });
await a.waitForTimeout(800);
ok(
  "jogo encerrado: status Encerrado e evento 'Fim de jogo'",
  (await vis(a.getByText("Encerrado", { exact: true }).first())) &&
    sql(`select status from matches where id='${matchId}'`) === "FINISHED" &&
    sql(
      `select count(*) from match_events where "matchId"='${matchId}' and type='FULL_TIME'`,
    ) === "1",
);
ok(
  "depois de encerrado não há mais botões de lance",
  (await a.getByRole("button", { name: /do mandante/ }).count()) === 0,
);
await pub
  .waitForFunction(() => /Encerrado/.test(document.body.innerText), {
    timeout: 30000,
  })
  .catch(() => {});
ok(
  "o visitante vê o jogo como Encerrado com 'Fim de jogo'",
  /Encerrado/.test(await pub.locator("body").innerText()) &&
    (await vis(pub.getByText("Fim de jogo").first())),
);

// ---- visibility
const evId = eid;
await a.goto(`${BASE}/events/${evId}`, { waitUntil: "networkidle" });
await a
  .getByRole("switch", { name: "Divulgar este evento na página pública" })
  .click();
await a.waitForTimeout(1200);
ok(
  "ocultar: banco marca o evento como não público",
  sql(`select "publicVisible" from events where id='${evId}'`) === "f",
);
const apiHidden = await pub.request.get(`${BASE}/watch/api/matches/${matchId}`);
await pub.goto(`${BASE}/watch/matches/${matchId}`, {
  waitUntil: "networkidle",
});
ok(
  "evento oculto: a página do jogo e a API respondem como inexistentes",
  /could not be found/i.test(await pub.locator("body").innerText()) &&
    apiHidden.status() === 404,
);
await pub.goto(BASE + "/watch", { waitUntil: "networkidle" });
ok(
  "evento oculto some da lista pública",
  (await pub.locator(`a[href='/watch/events/${evId}']`).count()) === 0,
);
await a
  .getByRole("switch", { name: "Divulgar este evento na página pública" })
  .click();
await a.waitForTimeout(1200);
ok(
  "reexibir: volta a ser público",
  sql(`select "publicVisible" from events where id='${evId}'`) === "t",
);
const apiOk = await pub.request.get(`${BASE}/watch/api/matches/${matchId}`);
const apiJson = await apiOk.json();
ok(
  "API pública devolve o jogo com 7 lances e cache curto",
  apiOk.status() === 200 &&
    apiJson.events.length === 7 &&
    /s-maxage=2/.test(apiOk.headers()["cache-control"] || ""),
  apiOk.headers()["cache-control"],
);
ok(
  "API pública não expõe e-mail, CPF nem telefone",
  !/cpf|email|phone|guardian/i.test(JSON.stringify(apiJson)),
);

// ---- finish the other group matches, advance, knockout bracket
await openStage(1);
for (let i = 0; i < 3; i++) {
  await a
    .locator("button", { hasText: /^Resultado$/ })
    .first()
    .click();
  await a.locator("#score-home").fill("2");
  await a.locator("#score-away").fill("1");
  await a.getByRole("button", { name: "Salvar resultado" }).click();
  await a.getByRole("dialog").waitFor({ state: "detached" });
  await a.waitForTimeout(500);
}
await a.getByRole("button", { name: "Concluir fase e avançar" }).click();
await a.waitForTimeout(1500);
await openStage(2);
await a.getByRole("button", { name: "Gerar jogos" }).click();
await a.getByRole("tab", { name: "Jogos" }).waitFor();

await a.goto(`${BASE}/events/${eid}/stages/bracket`, {
  waitUntil: "networkidle",
});
ok(
  "chaveamento completo: 3 colunas (Quartas, Semi-final, Final)",
  (await a
    .locator("section[aria-label]")
    .filter({ has: a.locator("h3") })
    .count()) >= 3 &&
    (await vis(a.getByRole("heading", { name: "Quartas de final" }))),
);
const colCards = async (title) =>
  a
    .locator(`section[aria-label='${title}']`)
    .first()
    .locator("> div > div")
    .count();
ok(
  "coluna das quartas tem 4 jogos reais; semi e final aparecem como 'A definir'",
  (await colCards("Quartas de final")) === 4 &&
    (await a.getByLabel("Jogo a definir").count()) === 3,
  `${await a.getByLabel("Jogo a definir").count()} placeholders`,
);
ok(
  "ligações entre as rodadas desenhadas (2 + 1 conectores)",
  (await a
    .locator("div[aria-hidden='true'] .border-white\\/25.rounded-r-md")
    .count()) === 3,
  String(
    await a
      .locator("div[aria-hidden='true'] .border-white\\/25.rounded-r-md")
      .count(),
  ),
);
await a.screenshot({ path: "shots/bracket-empty.png", fullPage: true });
// play the quarters, advance, generate semis -> bracket shows real semis, third place and placeholder final
await openStage(2);
for (let i = 0; i < 4; i++) {
  await a
    .locator("button", { hasText: /^Resultado$/ })
    .first()
    .click();
  await a.locator("#score-home").fill("1");
  await a.locator("#score-away").fill("0");
  await a.getByRole("button", { name: "Salvar resultado" }).click();
  await a.getByRole("dialog").waitFor({ state: "detached" });
  await a.waitForTimeout(500);
}
await a.getByRole("button", { name: "Concluir fase e avançar" }).click();
await a.waitForTimeout(1500);
await openStage(3);
await a.getByRole("button", { name: "Gerar jogos" }).click();
await a.getByRole("tab", { name: "Jogos" }).waitFor();
await a.goto(`${BASE}/events/${eid}/stages/bracket`, {
  waitUntil: "networkidle",
});
ok(
  "com as semis geradas: 2 semifinais com times, final a definir e disputa de 3º",
  (await colCards("Semifinal")) === 2 &&
    (await a.getByLabel("Jogo a definir").count()) === 1 &&
    (await vis(a.getByRole("heading", { name: "Disputa de 3º lugar" }))),
);
await a.screenshot({ path: "shots/bracket-full.png", fullPage: true });
await a.locator("section[aria-label='Quartas de final'] a").first().click();
await a.waitForURL((u) => /\/matches\/[^/]+$/.test(new URL(u).pathname));
ok(
  "clicar num jogo do chaveamento abre o controle do jogo",
  await vis(a.getByRole("heading", { name: "Jogo", exact: true })),
);

// public event page: standings + bracket
await pub.goto(`${BASE}/watch/events/${eid}`, { waitUntil: "networkidle" });
ok(
  "página pública do evento mostra classificação dos grupos e o chaveamento",
  (await vis(pub.getByRole("heading", { name: "Chaveamento" }))) &&
    (await pub.locator("section[aria-label^='Grupo']").count()) === 4 &&
    (await vis(pub.getByRole("heading", { name: "Fase de grupos" }))),
);
await pub.screenshot({ path: "shots/public-event.png", fullPage: true });

// isolation: other organization cannot open the organizer match page
const ctx2 = await browser.newContext({
  viewport: { width: 1280, height: 900 },
});
const b = await ctx2.newPage();
await b.goto(BASE + "/signup", { waitUntil: "networkidle" });
await b.getByLabel("Nome da organização").fill(`Outra ${T}`);
await b.getByLabel("Nome do responsável").fill("Org B");
await b.getByLabel("E-mail").fill(`ob.${T}@example.com`);
await b.getByLabel("Senha", { exact: true }).fill(PASS);
await b.getByLabel("Confirmar senha").fill(PASS);
await b.getByRole("checkbox").check();
await b.getByRole("button", { name: /Criar conta/ }).click();
await b.waitForURL((u) => new URL(u).pathname === "/dashboard");
ok(
  "painel de organização nova mostra 'Por onde começar'",
  await vis(b.getByText("Por onde começar")),
);
await b.goto(matchUrl, { waitUntil: "networkidle" });
ok(
  "outra organização não abre o controle do jogo (404)",
  /could not be found/i.test(await b.locator("body").innerText()),
);
await b.goto(`${BASE}/events/${eid}/stages/bracket`, {
  waitUntil: "networkidle",
});
ok(
  "nem o chaveamento do organizador",
  /could not be found/i.test(await b.locator("body").innerText()),
);

// dashboard at the end
await a.goto(BASE + "/dashboard", { waitUntil: "networkidle" });
ok(
  "painel final: resultados recentes e andamento dos jogos",
  (await vis(a.getByText("Resultados recentes"))) &&
    (await vis(a.getByRole("progressbar").first())),
);
await a.screenshot({ path: "shots/dashboard-2.png", fullPage: true });
// leave no public trace: the test user hides its own event through the product's own switch
await a.goto(`${BASE}/events/${eid}`, { waitUntil: "networkidle" });
await a
  .getByRole("switch", { name: "Divulgar este evento na página pública" })
  .click();
await a.waitForTimeout(1200);
ok(
  "o evento de teste foi ocultado ao final (não aparece na lista pública)",
  sql(`select "publicVisible" from events where id='${eid}'`) === "f",
);
ok(
  "sem erros de JavaScript (organizador e visitante)",
  errors.length === 0 && pubErrors.length === 0,
  [...errors, ...pubErrors].join(" | "),
);
console.log(fails === 0 ? "TODOS PASSARAM" : `${fails} FALHAS`);
await browser.close();
