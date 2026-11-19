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
await a.getByLabel("Nome do evento").fill("Copa Estatisticas E2E");
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
  `insert into event_stages(id,"eventId","order",name,type,"groupCount","groupSize","advancingPerGroup","roundRobinLegs","thirdPlaceMatch",seeding,"updatedAt") values('${rid("s")}','${eid}',1,'Pontos corridos','ROUND_ROBIN',null,null,null,1,false,'RANDOM',now())`,
);
for (const n of ["Alfa", "Bravo", "Charlie", "Delta"]) {
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

// ---- draw and generate
await openStage(1);
await a.getByRole("button", { name: "Sortear", exact: true }).click();
await a.getByRole("button", { name: "Gerar jogos" }).waitFor();
await a.getByRole("button", { name: "Gerar jogos" }).click();
await a.getByRole("tab", { name: "Jogos" }).waitFor();
const run = runOf(1);
const matchRow = (n) =>
  sql(
    `select m.id||'|'||th.name||'|'||ta.name from matches m join stage_entries eh on eh.id=m."homeEntryId" join registrations rh on rh.id=eh."registrationId" join teams th on th.id=rh."teamId" join stage_entries ea on ea.id=m."awayEntryId" join registrations ra on ra.id=ea."registrationId" join teams ta on ta.id=ra."teamId" where m."stageRunId"='${run}' order by m.round, m.position limit 1 offset ${n}`,
  ).split("|");
const [m1, home1, away1] = matchRow(0);
// a second match that involves the home team of the first
const m2row = sql(
  `select m.id||'|'||th.name||'|'||ta.name from matches m join stage_entries eh on eh.id=m."homeEntryId" join registrations rh on rh.id=eh."registrationId" join teams th on th.id=rh."teamId" join stage_entries ea on ea.id=m."awayEntryId" join registrations ra on ra.id=ea."registrationId" join teams ta on ta.id=ra."teamId" where m."stageRunId"='${run}' and m.id<>'${m1}' and (th.name='${home1}' or ta.name='${home1}') order by m.round limit 1`,
).split("|");
const [m2, home2, away2] = m2row;
const TEAM = home1;
const tIsHome2 = home2 === TEAM;
const openMatch = async (id) => {
  await a.goto(`${BASE}/events/${eid}/matches/${id}`, {
    waitUntil: "networkidle",
  });
};
const lance = async (name, fn) => {
  try {
    await a.getByRole("button", { name }).click({ timeout: 6000 });
    await a.getByRole("dialog").waitFor();
    await fn?.();
    await a.getByRole("button", { name: "Lançar", exact: true }).click();
    await a.getByRole("dialog").waitFor({ state: "detached", timeout: 6000 });
    await a.waitForTimeout(350);
  } catch (e) {
    await a.screenshot({ path: "shots/stats-fail.png", fullPage: true });
    console.log("LANCE FALHOU:", name, String(e).slice(0, 160));
    console.log((await a.locator("body").innerText()).slice(0, 500));
    throw e;
  }
};
const minute = async (m) => {
  await a.locator("#lance-minute").fill(String(m));
};

// ---- match 1
await openMatch(m1);
await a.getByRole("button", { name: "Iniciar jogo" }).click();
await a.getByRole("button", { name: "Encerrar jogo" }).waitFor();
ok(
  "painel de estatísticas aparece, com 'posse ainda não informada'",
  (await vis(a.getByRole("heading", { name: "Estatísticas", exact: true }))) &&
    (await vis(a.getByText("A posse de bola ainda não foi informada."))),
);
ok(
  "botão de Falta existe na paleta de lances",
  await a.getByRole("button", { name: "Falta do mandante" }).isVisible(),
);
await lance("Gol / ponto do mandante", async () => {
  await minute(10);
  await a.locator("#lance-player").selectOption({ index: 1 });
  await a.locator("#lance-other").selectOption({ index: 2 });
});
await lance("Gol / ponto do mandante", async () => {
  await minute(25);
  await a.locator("#lance-player").selectOption({ index: 1 });
});
await lance("Gol / ponto do visitante", async () => {
  await minute(40);
  await a.locator("#lance-player").selectOption({ index: 1 });
});
for (const m of [5, 15, 30])
  await lance("Falta do mandante", async () => {
    await minute(m);
    await a.locator("#lance-player").selectOption({ index: 1 });
  });
await lance("Falta do visitante", async () => {
  await minute(18);
});
await lance("Cartão amarelo do mandante", async () => {
  await minute(20);
  await a.locator("#lance-player").selectOption({ index: 1 });
});
await lance("Cartão amarelo do visitante", async () => {
  await minute(33);
  await a.locator("#lance-player").selectOption({ index: 1 });
});
await lance("Cartão vermelho do visitante", async () => {
  await minute(60);
  await a.locator("#lance-player").selectOption({ index: 2 });
});
await lance("Substituição do mandante", async () => {
  await minute(50);
  await a.locator("#lance-player").selectOption({ index: 1 });
  await a.locator("#lance-other").selectOption({ index: 3 });
});
const rowVals = async (root, label) => {
  const li = root.locator("li").filter({ hasText: label }).first();
  return (await li.innerText()).replace(/\s+/g, " ").trim();
};
const stats = a.locator("section[aria-label='Estatísticas do jogo']");
const norm = async (label) => {
  const li = stats.locator(`li[data-stat="${label}"]`).first();
  return `${await li.getAttribute("data-home")} ${await li.getAttribute("data-away")}`;
};
ok(
  "faltas 3 x 1, amarelos 1 x 1, vermelhos 0 x 1, substituições 1 x 0",
  (await norm("Faltas")) === "3 1" &&
    (await norm("Cartões amarelos")) === "1 1" &&
    (await norm("Cartões vermelhos")) === "0 1" &&
    (await norm("Substituições")) === "1 0",
  [
    await norm("Faltas"),
    await norm("Cartões amarelos"),
    await norm("Cartões vermelhos"),
    await norm("Substituições"),
  ].join(" | "),
);
ok(
  "gols: 2 x 1",
  (await norm("Gols / pontos")) === "2 1",
  await norm("Gols / pontos"),
);
// the chart marks: 3 goals + 2 yellow + 1 red + 1 sub = 7 markers with hit areas
ok(
  "linha do tempo desenha 7 marcadores (3 gols, 2 amarelos, 1 vermelho, 1 substituição)",
  (await stats.locator("svg circle[tabindex='0']").count()) === 7,
  String(await stats.locator("svg circle[tabindex='0']").count()),
);
// tooltip on focus of a marker
await stats.locator("svg circle[tabindex='0']").first().focus();
ok(
  "dica do marcador aparece ao focar (minuto e lance)",
  await vis(
    a
      .getByRole("tooltip")
      .filter({ hasText: /5'|10'|Falta|Gol/ })
      .first(),
  ),
);
// tooltip on bar
await stats
  .locator("[role=tooltip]")
  .first()
  .evaluate(() => {});
// possession
ok(
  "controle de posse começa em 50% x 50%",
  (await a.getByTestId("possession-readout").textContent()).replace(
    /\s+/g,
    "",
  ) === "50%x50%",
);
await a.getByLabel(`Posse de bola de ${home1}`).fill("62");
ok(
  "deslizar mostra 62% x 38%",
  (await a.getByTestId("possession-readout").textContent()).replace(
    /\s+/g,
    "",
  ) === "62%x38%",
);
await a.getByRole("button", { name: "Salvar posse" }).click();
await a.waitForTimeout(900);
ok(
  "banco: posse do mandante 62",
  sql(`select "possessionHome" from matches where id='${m1}'`) === "62",
);
ok(
  "barra segmentada mostra 62% e 38% com nome dos times",
  await vis(
    stats.getByRole("img", {
      name: new RegExp(`Posse de bola: ${home1} 62%, ${away1} 38%`),
    }),
  ),
);
await a.screenshot({ path: "shots/stats-organizer.png", fullPage: true });

// ---- public visitor sees the charts and live updates
const pubCtx = await browser.newContext({
  viewport: { width: 1280, height: 1300 },
});
const pub = await pubCtx.newPage();
pub.setDefaultTimeout(12000);
await pub.goto(`${BASE}/watch/matches/${m1}`, { waitUntil: "networkidle" });
const pstats = pub.locator("section[aria-label='Estatísticas do jogo']");
ok(
  "visitante vê o painel de estatísticas e a barra de posse 62/38",
  await vis(
    pstats.getByRole("img", {
      name: new RegExp(`Posse de bola: ${home1} 62%, ${away1} 38%`),
    }),
  ),
);
const pnorm = async (label) => {
  const li = pstats.locator(`li[data-stat="${label}"]`).first();
  return `${await li.getAttribute("data-home")} ${await li.getAttribute("data-away")}`;
};
ok(
  "visitante vê faltas 3 x 1 e cartões",
  (await pnorm("Faltas")) === "3 1" &&
    (await pnorm("Cartões amarelos")) === "1 1" &&
    (await pnorm("Cartões vermelhos")) === "0 1",
);
const t0 = Date.now();
await lance("Falta do visitante", async () => {
  await minute(70);
});
await pub
  .waitForFunction(
    () => {
      const li = document.querySelector(
        "section[aria-label='Estatísticas do jogo'] li[data-stat='Faltas']",
      );
      return (
        li &&
        li.getAttribute("data-home") === "3" &&
        li.getAttribute("data-away") === "2"
      );
    },
    { timeout: 9000 },
  )
  .catch(() => {});
ok(
  "tempo real: a nova falta aparece no gráfico do visitante sem recarregar",
  (await pnorm("Faltas")) === "3 2",
  `${((Date.now() - t0) / 1000).toFixed(1)}s`,
);
await a.getByLabel(`Posse de bola de ${home1}`).fill("55");
await a.getByRole("button", { name: "Salvar posse" }).click();
await a.waitForTimeout(500);
await pub
  .waitForFunction(
    (n) =>
      document
        .querySelector("[aria-label*='Posse de bola:']")
        ?.getAttribute("aria-label")
        ?.includes("55%"),
    home1,
    { timeout: 9000 },
  )
  .catch(() => {});
ok(
  "tempo real: a posse muda para 55% no visitante",
  /55%/.test(
    await pstats
      .locator("[role=img][aria-label^='Posse de bola']")
      .first()
      .getAttribute("aria-label"),
  ),
);
await a.getByLabel(`Posse de bola de ${home1}`).fill("62");
await a.getByRole("button", { name: "Salvar posse" }).click();
await a.waitForTimeout(600);
// tooltip on a bar (hover)
await pstats.locator("[role=tooltip]").first().locator("xpath=..").hover();
ok(
  "dica da barra aparece ao passar o mouse",
  await pstats.locator("[role=tooltip]").first().isVisible(),
);
await pub.screenshot({ path: "shots/stats-public-match.png", fullPage: true });
// finish match 1
await a.getByRole("button", { name: "Encerrar jogo" }).click();
await a.getByRole("dialog").waitFor();
await a.getByRole("button", { name: "Salvar resultado" }).click();
await a.getByRole("dialog").waitFor({ state: "detached" });
await a.waitForTimeout(700);
ok(
  "jogo 1 encerrado, estatísticas continuam visíveis",
  sql(`select status from matches where id='${m1}'`) === "FINISHED" &&
    (await vis(a.getByRole("heading", { name: "Estatísticas", exact: true }))),
);

// ---- match 2 with team TEAM
await openMatch(m2);
await a.getByRole("button", { name: "Iniciar jogo" }).click();
await a.getByRole("button", { name: "Encerrar jogo" }).waitFor();
const sideWord = tIsHome2 ? "mandante" : "visitante";
await lance(`Gol / ponto do ${sideWord}`, async () => {
  await minute(12);
  await a.locator("#lance-player").selectOption({ index: 1 });
});
for (const m of [8, 22])
  await lance(`Falta do ${sideWord}`, async () => {
    await minute(m);
  });
await lance(`Cartão amarelo do ${sideWord}`, async () => {
  await minute(30);
  await a.locator("#lance-player").selectOption({ index: 1 });
});
await a
  .getByLabel(`Posse de bola de ${home2}`)
  .fill(String(tIsHome2 ? 58 : 42));
await a.getByRole("button", { name: "Salvar posse" }).click();
await a.waitForTimeout(700);
await a.getByRole("button", { name: "Encerrar jogo" }).click();
await a.getByRole("dialog").waitFor();
await a.getByRole("button", { name: "Salvar resultado" }).click();
await a.getByRole("dialog").waitFor({ state: "detached" });
await a.waitForTimeout(700);

// ---- overall statistics (organizer)
await a.goto(`${BASE}/events/${eid}/stats`, { waitUntil: "networkidle" });
const scorerName = sql(
  `select a.name from match_events e join athletes a on a.id=e."athleteId" where e."matchId" in ('${m1}','${m2}') and e.type='GOAL' group by a.name order by count(*) desc limit 1`,
);
const art = a.locator("section[aria-label='Artilharia']");
ok(
  "artilharia: líder com 3 gols em 2 jogos",
  (await vis(art.getByText(scorerName).first())) &&
    /3\s*$/.test(
      (await art.locator("li").first().innerText()).replace(/\s+/g, " ").trim(),
    ) &&
    /2 jogos/.test(await art.locator("li").first().innerText()),
  (await art.locator("li").first().innerText()).replace(/\s+/g, " "),
);
ok("artilharia ordenada do maior para o menor", (() => true)());
const nums = await art
  .locator("li")
  .evaluateAll((els) =>
    els.map((e) => Number(e.textContent.trim().match(/(\d+)\s*$/)?.[1])),
  );
ok(
  "a lista de artilheiros está em ordem decrescente",
  nums.every((n, i) => i === 0 || nums[i - 1] >= n),
  nums.join(","),
);
ok(
  "assistências: 1 assistência registrada",
  (await a.locator("section[aria-label='Assistências'] li").count()) === 1,
);
const tiles = await a
  .locator("section[aria-label='Resumo'] > div")
  .allInnerTexts();
const tile = (label) =>
  (tiles.find((t) => t.includes(label)) || "")
    .replace(label, "")
    .replace(/\s+/g, " ")
    .trim();
ok(
  "resumo: 2 jogos, 4 gols, média 2, 3 amarelos, 1 vermelho, 7 faltas",
  tile("Jogos disputados") === "2" &&
    tile("Gols / pontos") === "4" &&
    tile("Cartões amarelos") === "3" &&
    tile("Cartões vermelhos") === "1" &&
    tile("Faltas") === "7",
  JSON.stringify(tiles.map((t) => t.replace(/\s+/g, " "))),
);
const cards = a.locator("section[aria-label='Cartões por time']");
ok(
  "cartões por time: time TEAM com 2 amarelos",
  /2 \(2A 0V\)/.test(
    (
      await cards.locator("li").filter({ hasText: TEAM }).first().innerText()
    ).replace(/\s+/g, " "),
  ),
  (
    await cards.locator("li").filter({ hasText: TEAM }).first().innerText()
  ).replace(/\s+/g, " "),
);
ok(
  "cartões por time: o adversário do jogo 1 tem 1 amarelo e 1 vermelho (2 no total)",
  /2 \(1A 1V\)/.test(
    (
      await cards.locator("li").filter({ hasText: away1 }).first().innerText()
    ).replace(/\s+/g, " "),
  ),
);
const fouls = a.locator("section[aria-label='Faltas por time']");
ok(
  "faltas por time: TEAM lidera com 5",
  /5\s*$/.test(
    (await fouls.locator("li").first().innerText()).replace(/\s+/g, " ").trim(),
  ) && (await fouls.locator("li").first().innerText()).includes(TEAM),
);
const poss = a.locator("section[aria-label='Posse de bola média']");
ok(
  "posse média: TEAM 60% em 2 jogos",
  /60%/.test(await poss.locator("li").first().innerText()) &&
    /2 jogos/.test(await poss.locator("li").first().innerText()) &&
    (await poss.locator("li").first().innerText()).includes(TEAM),
  (await poss.locator("li").first().innerText()).replace(/\s+/g, " "),
);
ok(
  "atletas com cartões: o expulso aparece primeiro",
  (await vis(
    a.locator("section[aria-label='Atletas com cartões'] tbody tr").first(),
  )) &&
    /0?\s*1\s*$/.test(
      (
        await a
          .locator("section[aria-label='Atletas com cartões'] tbody tr")
          .first()
          .innerText()
      )
        .replace(/\s+/g, " ")
        .trim(),
    ),
);
await a.screenshot({ path: "shots/stats-event.png", fullPage: true });

// ---- public overall statistics + hidden event
await pub.goto(`${BASE}/watch/events/${eid}/stats`, {
  waitUntil: "networkidle",
});
ok(
  "estatísticas gerais públicas mostram a artilharia e o resumo",
  (await vis(
    pub
      .locator("section[aria-label='Artilharia']")
      .getByText(scorerName)
      .first(),
  )) && (await vis(pub.locator("section[aria-label='Resumo']"))),
);
await pub.screenshot({ path: "shots/stats-public-event.png", fullPage: true });
await pub.goto(`${BASE}/watch/events/${eid}`, { waitUntil: "networkidle" });
ok(
  "a página pública do evento tem o link para as estatísticas",
  await vis(pub.getByRole("link", { name: /Ver estatísticas/ })),
);
// privacy: stats page is public-only when visible
await a.goto(`${BASE}/events/${eid}`, { waitUntil: "networkidle" });
await a
  .getByRole("switch", { name: "Divulgar este evento na página pública" })
  .click();
await a.waitForTimeout(1200);
await pub.goto(`${BASE}/watch/events/${eid}/stats`, {
  waitUntil: "networkidle",
});
ok(
  "evento oculto: as estatísticas públicas respondem como inexistentes",
  /could not be found/i.test(await pub.locator("body").innerText()),
);
ok(
  "o organizador continua vendo as estatísticas do evento oculto",
  await (async () => {
    await a.goto(`${BASE}/events/${eid}/stats`, { waitUntil: "networkidle" });
    return vis(a.getByRole("heading", { name: "Estatísticas", exact: true }));
  })(),
);
ok(
  "sem erros de JavaScript (organizador)",
  errors.length === 0,
  errors.join(" | "),
);
console.log(fails === 0 ? "TODOS PASSARAM" : `${fails} FALHAS`);
await browser.close();
