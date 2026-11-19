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
const ok = (n, c, d = "") => {
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
    viewport: { width: 1440, height: 1100 },
  });
  const p = await ctx.newPage();
  p.setDefaultTimeout(12000);
  const orig = p.locator.bind(p);
  p.locator = (sel, o) =>
    typeof sel === "string" && /^(input|select|main)/.test(sel)
      ? orig(sel + ":visible", o)
      : orig(sel, o);
  p.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  await p.goto(BASE + "/signup", { waitUntil: "networkidle" });
  await p.getByLabel("Nome da organização").fill(`Insc ${label} ${T}`);
  await p.getByLabel("Nome do responsável").fill(`Org ${label}`);
  await p.getByLabel("E-mail").fill(`rg.${label}.${T}@example.com`);
  await p.getByLabel("Senha", { exact: true }).fill(PASS);
  await p.getByLabel("Confirmar senha").fill(PASS);
  await p.getByRole("checkbox").check();
  await p.getByRole("button", { name: /Criar conta/ }).click();
  await p.waitForURL((u) => new URL(u).pathname === "/dashboard");
  return p;
}
const a = await user("A"),
  b = await user("B");
const orgA = sql(
  `select o.id from organizations o join users u on u."organizationId"=o.id where u.email=lower('rg.A.${T}@example.com')`,
);
// seed people straight in the database (people flows have their own suite)
const ath = [
  ["f1", "Ana Sub15", "2012-01-01", "FEMALE"],
  ["f2", "Bia Sub15", "2013-05-05", "FEMALE"],
  ["f3", "Carla Sub15", "2012-09-09", "FEMALE"],
  ["m1", "Caio Sub15", "2012-02-02", "MALE"],
  ["ad", "Dora Adulta", "1990-01-01", "FEMALE"],
];
for (const [id, name, birth, g] of ath) {
  const aid = `${id}${T}`;
  sql(
    `insert into athletes(id,name,"birthDate",gender,"createdByOrganizationId","updatedAt") values('${aid}','${name}','${birth}','${g}','${orgA}',now())`,
  );
  sql(
    `insert into organization_athletes("organizationId","athleteId") values('${orgA}','${aid}')`,
  );
}
for (const n of ["Time Azul", "Time Verde"])
  sql(
    `insert into teams(id,"organizationId",name,"updatedAt") values('t${n.slice(5, 6)}${T}','${orgA}','${n}',now())`,
  );
const path = (p) => new URL(p.url()).pathname;

await a.goto(BASE + "/events/new", { waitUntil: "networkidle" });
await a.getByLabel("Nome do evento").fill("Copa Inscrições E2E");
await a.getByLabel("Início", { exact: true }).fill("2026-08-01");
await a.getByLabel("Fim", { exact: true }).fill("2026-08-30");
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
const eid = path(a).split("/").pop();
ok(
  "evento nasce com a categoria Geral (Misto)",
  sql(
    `select name||'|'||gender from event_categories where "eventId"='${eid}'`,
  ) === "Geral|MIXED",
);
ok(
  "página do evento resume inscrições",
  (await vis(a.getByText(/Nenhuma inscrição ainda\. em 1 categoria/))) ||
    (await vis(a.getByText(/Nenhuma inscrição ainda/))),
);

// categories
await a.goto(`${BASE}/events/${eid}/categories`, { waitUntil: "networkidle" });
ok(
  "lista mostra Geral",
  await vis(a.getByRole("cell", { name: "Geral", exact: true })),
);
await a.getByRole("button", { name: "Nova categoria" }).click();
await a.getByRole("button", { name: "Salvar" }).click();
ok(
  "categoria vazia pede nome",
  await vis(a.getByText("Informe o nome da categoria.")),
);
await a.getByLabel("Nome").fill("Sub-15 Feminino");
await a.getByLabel("Sexo").selectOption("FEMALE");
await a.getByLabel("Idade máxima").fill("15");
await a.getByLabel("Elenco mínimo").fill("2");
await a.getByLabel("Elenco máximo").fill("3");
await a.getByRole("button", { name: "Salvar" }).click();
await a.waitForTimeout(500);
ok(
  "categoria criada",
  (await vis(a.getByRole("cell", { name: "Sub-15 Feminino", exact: true }))) &&
    sql(
      `select "maxAge"||'|'||"rosterMin"||'|'||"rosterMax" from event_categories where "eventId"='${eid}' and name='Sub-15 Feminino'`,
    ) === "15|2|3",
);
await a.waitForTimeout(600);
await a.getByRole("button", { name: "Nova categoria" }).click();
await a.getByLabel("Nome").fill("SUB-15 feminino");
await a.getByRole("button", { name: "Salvar" }).click();
ok(
  "nome repetido (caixa diferente) é recusado",
  await vis(a.getByText("Já existe uma categoria com esse nome neste evento.")),
);
await a.keyboard.press("Escape");

// registration
await a.goto(`${BASE}/events/${eid}/registrations/new`, {
  waitUntil: "networkidle",
});
await a
  .getByLabel("Categoria", { exact: true })
  .selectOption({ label: "Sub-15 Feminino" });
await a
  .getByLabel("Time", { exact: true })
  .selectOption({ label: "Time Azul" });
const opt = async (label) =>
  a
    .getByLabel("Atleta para adicionar")
    .getByRole("option", { name: new RegExp(label) });
ok(
  "atleta masculino aparece desabilitado na categoria feminina",
  await (await opt("Caio Sub15")).isDisabled(),
);
ok(
  "adulta aparece desabilitada (idade máxima)",
  await (await opt("Dora Adulta")).isDisabled(),
);
ok(
  "elegível aparece habilitada",
  !(await (await opt("Ana Sub15")).isDisabled()),
);
const add = async (name) => {
  await a
    .locator("select[aria-label='Atleta para adicionar']")
    .selectOption({ label: name });
  await a.getByRole("button", { name: "Adicionar atleta" }).click();
};
await add("Ana Sub15");
await a.getByRole("button", { name: "Inscrever" }).click();
ok(
  "elenco abaixo do mínimo é recusado",
  await vis(
    a
      .getByText("O elenco precisa de pelo menos 2 atletas nesta categoria.")
      .first(),
  ),
);
await add("Bia Sub15");
await a.getByLabel("Camisa de Ana Sub15").fill("10");
await a.getByLabel("Camisa de Bia Sub15").fill("10");
await a.getByRole("button", { name: "Inscrever" }).click();
ok(
  "camisas repetidas são recusadas",
  await vis(a.getByText("Há camisas repetidas.").first()),
);
await a.getByLabel("Camisa de Bia Sub15").fill("7");
await a.getByLabel("Posição de Ana Sub15").selectOption({ index: 1 });
await a.getByRole("radio", { name: "Capitão: Ana Sub15" }).click();
await a.getByRole("button", { name: "Adicionar pessoa" }).click();
await a.getByPlaceholder("Nome", { exact: true }).fill("Prof. Marcos");
await a.getByLabel("Função da pessoa 1").selectOption("COACH");
await a.getByRole("button", { name: "Inscrever" }).click();
await a.waitForURL(
  (u) => new URL(u).pathname === `/events/${eid}/registrations`,
);
ok(
  "redireciona para a lista com o time e 2 atletas",
  (await vis(a.getByRole("link", { name: "Time Azul" }))) &&
    (await a.getByRole("row", { name: /Time Azul/ }).textContent()).includes(
      "2",
    ),
);
const rid = sql(`select id from registrations where "eventId"='${eid}'`);
ok(
  "banco: 2 membros, categoria denormalizada, 1 capitão, 1 comissão",
  sql(
    `select count(*) from registration_members where "registrationId"='${rid}' and "categoryId"=(select "categoryId" from registrations where id='${rid}')`,
  ) === "2" &&
    sql(
      `select count(*) from registration_members where "registrationId"='${rid}' and "isCaptain"`,
    ) === "1" &&
    sql(
      `select count(*) from registration_staff where "registrationId"='${rid}'`,
    ) === "1",
);
await a.screenshot({ path: "shots/reg-list.png", fullPage: true });

// conflicts on a second registration
await a.goto(`${BASE}/events/${eid}/registrations/new`, {
  waitUntil: "networkidle",
});
await a
  .getByLabel("Categoria", { exact: true })
  .selectOption({ label: "Sub-15 Feminino" });
ok(
  "time já inscrito aparece desabilitado",
  await a.locator("#reg-team option", { hasText: "Time Azul" }).isDisabled(),
);
ok(
  "atleta já inscrito na categoria aparece desabilitado",
  await (await opt("Ana Sub15")).isDisabled(),
);
await a
  .getByLabel("Categoria", { exact: true })
  .selectOption({ label: "Geral" });
ok(
  "na outra categoria o mesmo time e atleta ficam livres",
  !(await a
    .locator("#reg-team option", { hasText: "Time Azul" })
    .isDisabled()) && !(await (await opt("Ana Sub15")).isDisabled()),
);

// edit and delete
await a.goto(`${BASE}/events/${eid}/registrations/${rid}`, {
  waitUntil: "networkidle",
});
ok(
  "edição carrega elenco, camisa e capitão",
  (await vis(a.getByLabel("Camisa de Bia Sub15"))) &&
    (await a.getByLabel("Camisa de Bia Sub15").inputValue()) === "7" &&
    (await a
      .getByRole("radio", { name: "Capitão: Ana Sub15" })
      .getAttribute("aria-checked")) === "true",
);
await add("Carla Sub15");
await a.getByRole("button", { name: "Remover Bia Sub15" }).click();
await a.getByRole("button", { name: "Salvar inscrição" }).click();
await a.waitForURL(
  (u) => new URL(u).pathname === `/events/${eid}/registrations`,
);
ok(
  "edição salva (Ana e Carla)",
  sql(
    `select string_agg(a.name,',' order by a.name) from registration_members m join athletes a on a.id=m."athleteId" where m."registrationId"='${rid}'`,
  ) === "Ana Sub15,Carla Sub15",
);
await a.goto(`${BASE}/events/${eid}/registrations/${rid}`, {
  waitUntil: "networkidle",
});
await a.getByRole("button", { name: "Excluir inscrição" }).click();
await a.getByRole("button", { name: "Excluir", exact: true }).click();
await a.waitForURL(
  (u) => new URL(u).pathname === `/events/${eid}/registrations`,
);
ok(
  "exclusão apaga elenco e comissão, mantém atletas",
  sql(`select count(*) from registrations where id='${rid}'`) === "0" &&
    sql(
      `select count(*) from registration_members where "registrationId"='${rid}'`,
    ) === "0" &&
    sql(`select count(*) from athletes where id like '%${T}'`) === "5",
);

// category with registrations cannot be deleted; unused can
await a.goto(`${BASE}/events/${eid}/categories`, { waitUntil: "networkidle" });
await a.getByRole("button", { name: "Excluir Geral" }).click();
await a.getByRole("button", { name: "Excluir", exact: true }).click();
await a.waitForTimeout(1200);
ok(
  "categoria sem inscrições é excluída",
  sql(`select count(*) from event_categories where "eventId"='${eid}'`) ===
    "1" &&
    sql(`select name from event_categories where "eventId"='${eid}'`) ===
      "Sub-15 Feminino",
);
await a.waitForTimeout(800);
await a.getByRole("button", { name: "Excluir Sub-15 Feminino" }).click();
await a.getByRole("button", { name: "Excluir", exact: true }).click();
ok(
  "a última categoria não pode ser excluída",
  await vis(a.getByText("O evento precisa ter ao menos uma categoria.")),
);

// tenant isolation
const leaks = [];
for (const sub of ["registrations", "registrations/new", "categories"]) {
  await b.goto(`${BASE}/events/${eid}/${sub}`, { waitUntil: "networkidle" });
  const text = await b.locator("body").innerText();
  const noData =
    !/Copa Inscrições E2E|Time Azul|Sub-15 Feminino|Geral|Ana Sub15/.test(text);
  const notFoundPage = /404|não encontrad|not found/i.test(text);
  if (!(noData && notFoundPage)) leaks.push(sub);
}
ok(
  "outra organização vê a página 404, sem nenhum dado do evento",
  leaks.length === 0,
  leaks.join(","),
);
ok(
  "sem erros de JavaScript no navegador",
  errors.length === 0,
  errors.join(" | "),
);
await browser.close();
