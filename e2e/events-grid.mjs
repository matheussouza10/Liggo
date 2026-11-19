import { chromium } from "playwright-core";
import { execSync } from "node:child_process";
const DB = "postgresql://postgres:admin@localhost:5432/liggo";
const sql = (q) =>
  execSync(`psql "${DB}" -At -c "${q.replace(/"/g, '\\"')}"`)
    .toString()
    .trim();
const BASE = "http://localhost:3000",
  PASS = "Senha-de-teste-123",
  T = Date.now();
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
const a = await (
  await browser.newContext({ viewport: { width: 1440, height: 1000 } })
).newPage();
a.setDefaultTimeout(12000);
await a.goto(BASE + "/signup", { waitUntil: "networkidle" });
await a.getByLabel("Nome da organização").fill(`Grid ${T}`);
await a.getByLabel("Nome do responsável").fill("Org");
await a.getByLabel("E-mail").fill(`gr.${T}@example.com`);
await a.getByLabel("Senha", { exact: true }).fill(PASS);
await a.getByLabel("Confirmar senha").fill(PASS);
await a.getByRole("checkbox").check();
await a.getByRole("button", { name: /Criar conta/ }).click();
await a.waitForURL((u) => new URL(u).pathname === "/dashboard");
const mk = async (name) => {
  await a.goto(BASE + "/events/new", { waitUntil: "networkidle" });
  await a.getByLabel("Nome do evento").fill(name);
  await a.getByLabel("Início", { exact: true }).fill("2026-12-05");
  await a.getByLabel("Fim", { exact: true }).fill("2026-12-06");
  await a.getByLabel("Tipo", { exact: true }).selectOption({ label: "Copa" });
  await a
    .getByLabel("Modalidade", { exact: true })
    .selectOption({ label: "Futsal" });
  await a
    .getByLabel("Formato", { exact: true })
    .selectOption({ label: "Pontos Corridos" });
  await a.getByRole("radio", { name: "Equipe" }).check();
  await a.getByLabel("Local", { exact: true }).fill("Ginásio");
  await a.getByRole("button", { name: "Criar evento" }).click();
  await a.waitForURL(
    (u) =>
      /^\/events\/[a-z0-9]+$/.test(new URL(u).pathname) &&
      new URL(u).pathname !== "/events/new",
  );
  return new URL(a.url()).pathname.split("/").pop();
};
const e1 = await mk("Evento Grid Um"),
  e2 = await mk("Evento Grid Dois");
await a.goto(BASE + "/events", { waitUntil: "networkidle" });
ok(
  "a lista tem a coluna 'Acesso rápido'",
  await vis(a.getByRole("columnheader", { name: "Acesso rápido" })),
);
const row = (n) => a.getByRole("row").filter({ hasText: n });
const href = async (r, label) =>
  r
    .getByRole("link", { name: new RegExp(`^${label} de `) })
    .getAttribute("href");
const r1 = row("Evento Grid Um");
ok(
  "Regras leva para /rules do evento",
  (await href(r1, "Regras")) === `/events/${e1}/rules`,
);
ok(
  "Inscrições leva para /registrations",
  (await href(r1, "Inscrições")) === `/events/${e1}/registrations`,
);
ok(
  "Fases e jogos leva para /stages",
  (await href(r1, "Fases e jogos")) === `/events/${e1}/stages`,
);
ok(
  "Página pública abre /watch/events/ em nova aba",
  (await r1
    .getByRole("link", { name: /^Página pública de / })
    .getAttribute("href")) === `/watch/events/${e1}` &&
    (await r1
      .getByRole("link", { name: /^Página pública de / })
      .getAttribute("target")) === "_blank",
);
ok(
  "cada linha aponta para o seu próprio evento (o 2º usa o id do 2º)",
  (await href(row("Evento Grid Dois"), "Regras")) === `/events/${e2}/rules`,
);
// tooltip on hover
await r1.getByRole("link", { name: /^Regras de / }).hover();
ok(
  "dica 'Regras' aparece ao passar o mouse",
  await vis(r1.getByRole("tooltip").filter({ hasText: "Regras" }).first()),
);
await a.screenshot({ path: "shots/events-grid.png", fullPage: true });
// navigate with each shortcut
await r1.getByRole("link", { name: /^Regras de / }).click();
await a.waitForURL((u) => new URL(u).pathname === `/events/${e1}/rules`);
ok(
  "clicar em Regras abre as regras",
  await vis(a.getByRole("heading", { name: "Regras do evento" })),
);
await a.goto(BASE + "/events", { waitUntil: "networkidle" });
await row("Evento Grid Um")
  .getByRole("link", { name: /^Inscrições de / })
  .click();
await a.waitForURL(
  (u) => new URL(u).pathname === `/events/${e1}/registrations`,
);
ok(
  "clicar em Inscrições abre as inscrições",
  await vis(a.getByRole("heading", { name: "Inscrições", exact: true })),
);
await a.goto(BASE + "/events", { waitUntil: "networkidle" });
await row("Evento Grid Um")
  .getByRole("link", { name: /^Fases e jogos de / })
  .click();
await a.waitForURL((u) => new URL(u).pathname === `/events/${e1}/stages`);
ok(
  "clicar em Fases e jogos abre as fases",
  await vis(a.getByRole("heading", { name: "Fases", exact: true })),
);
const pub = await a.context().newPage();
await pub.goto(`${BASE}/watch/events/${e1}`, { waitUntil: "networkidle" });
ok(
  "a página pública do evento abre",
  await vis(pub.getByRole("heading", { name: "Evento Grid Um" })),
);
await pub.close();
// hide one event -> the public shortcut turns into the "oculto" marker
await a.goto(`${BASE}/events/${e2}`, { waitUntil: "networkidle" });
await a
  .getByRole("switch", { name: "Divulgar este evento na página pública" })
  .click();
await a.waitForTimeout(1200);
await a.goto(BASE + "/events", { waitUntil: "networkidle" });
ok(
  "evento oculto: sem link público e com marcador 'oculto ao público'",
  (await row("Evento Grid Dois")
    .getByRole("link", { name: /^Página pública de / })
    .count()) === 0 &&
    (await vis(
      row("Evento Grid Dois").getByRole("img", { name: /oculto ao público/ }),
    )),
);
ok(
  "o outro evento continua com o link público",
  (await row("Evento Grid Um")
    .getByRole("link", { name: /^Página pública de / })
    .count()) === 1,
);
// hide the first too, so tests leave no public trace
await a.goto(`${BASE}/events/${e1}`, { waitUntil: "networkidle" });
await a
  .getByRole("switch", { name: "Divulgar este evento na página pública" })
  .click();
await a.waitForTimeout(1000);
ok(
  "eventos de teste ocultados ao final",
  sql(
    `select count(*) from events where id in ('${e1}','${e2}') and "publicVisible"`,
  ) === "0",
);
console.log(fails === 0 ? "TODOS PASSARAM" : `${fails} FALHAS`);
await browser.close();
