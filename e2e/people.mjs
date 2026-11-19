import { chromium } from "playwright-core";
import fs from "node:fs";
import { execSync } from "node:child_process";
const env = Object.fromEntries(
  fs
    .readFileSync("/Users/matheus/Documents/Projetos/Liggo/.env", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);
const DB = "postgresql://postgres:admin@localhost:5432/liggo";
const sql = (q) =>
  execSync(`psql "${DB}" -At -c "${q.replace(/"/g, '\\"')}"`)
    .toString()
    .trim();
const genCpf = () => {
  const d = Array.from({ length: 9 }, () => Math.floor(Math.random() * 9) + 1);
  const dv = (a) => {
    let t = 0;
    a.forEach((n, k) => (t += n * (a.length + 1 - k)));
    const r = (t * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const x = dv(d),
    y = dv([...d, x]);
  return [...d, x, y].join("");
};
const CPF_D = genCpf();
const CPF_F = CPF_D.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
const CPF_MASK = `•••.${CPF_F.slice(4, 11)}-••`;
const BASE = "http://localhost:3000",
  PASS = "Senha-de-teste-123",
  T = Date.now();
const res = [];
const ok = (n, c, d = "") => {
  res.push(c);
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
    viewport: { width: 1440, height: 1000 },
  });
  const p = await ctx.newPage();
  p.setDefaultTimeout(12000);
  const orig = p.locator.bind(p);
  p.locator = (sel, o) =>
    typeof sel === "string" && /^(input|select|main)/.test(sel)
      ? orig(sel + ":visible", o)
      : orig(sel, o);
  p.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 160));
  });
  await p.goto(BASE + "/signup", { waitUntil: "networkidle" });
  await p.getByLabel("Nome da organização").fill(`Pessoas ${label} ${T}`);
  await p.getByLabel("Nome do responsável").fill(`Org ${label}`);
  await p.getByLabel("E-mail").fill(`pp.${label}.${T}@example.com`);
  await p.getByLabel("Senha", { exact: true }).fill(PASS);
  await p.getByLabel("Confirmar senha").fill(PASS);
  await p.getByRole("checkbox").check();
  await p.getByRole("button", { name: /Criar conta/ }).click();
  await p.waitForURL((u) => new URL(u).pathname === "/dashboard");
  return p;
}
const a = await user("A"),
  b = await user("B");
const path = (p) => new URL(p.url()).pathname;
const isDetail = (u) =>
  /^\/athletes\/[a-z0-9]+$/.test(new URL(u).pathname) &&
  new URL(u).pathname !== "/athletes/new";
async function fillAthlete(p, o) {
  await p.locator('input[name="name"]').fill(o.name);
  await p.locator('input[name="birthDate"]').fill(o.birth);
  await p.getByRole("radio", { name: o.gender }).check();
  if (o.cpf !== undefined) await p.locator('input[name="cpf"]').fill(o.cpf);
  if (o.email) await p.locator('input[name="email"]').fill(o.email);
  if (o.phone) await p.locator('input[name="phone"]').fill(o.phone);
  if (o.gname) await p.locator('input[name="guardianName"]').fill(o.gname);
  if (o.gcpf) await p.locator('input[name="guardianCpf"]').fill(o.gcpf);
}

// navigation
ok(
  "sidebar: Atletas, Times, Árbitros (sem Participantes)",
  (await a.getByRole("link", { name: "Atletas", exact: true }).count()) === 1 &&
    (await a.getByRole("link", { name: "Times", exact: true }).count()) === 1 &&
    (await a.getByRole("link", { name: "Árbitros", exact: true }).count()) ===
      1 &&
    (await a.getByRole("link", { name: "Participantes" }).count()) === 0,
);
await a.getByRole("link", { name: "Atletas", exact: true }).click();
await a.waitForURL((u) => new URL(u).pathname === "/athletes");
ok("atletas: estado vazio", await vis(a.getByText("Nenhum atleta ainda")));
await a.getByRole("link", { name: "Cadastrar atleta" }).click();
await a.waitForURL((u) => new URL(u).pathname === "/athletes/new");

// validation
await a.getByRole("button", { name: "Cadastrar atleta" }).click();
ok(
  "formulário vazio pede nome, nascimento e sexo",
  (await vis(a.getByText("Informe o nome completo."))) &&
    (await vis(a.getByText("Informe a data de nascimento."))) &&
    (await vis(a.getByText("Escolha o sexo."))),
);
await a.waitForTimeout(700);
await fillAthlete(a, {
  name: "Matheus de Souza",
  birth: "1995-03-10",
  gender: "Masculino",
  cpf: "123.456.789-00",
});
await a.getByRole("button", { name: "Cadastrar atleta" }).click();
ok(
  "CPF inválido é recusado",
  await vis(a.getByText("CPF inválido. Confira os números.")),
);
await a.waitForTimeout(700);
await a.locator('input[name="cpf"]').fill("");
await a.getByRole("button", { name: "Cadastrar atleta" }).click();
ok("adulto sem CPF é recusado", await vis(a.getByText("Informe o CPF.")));
await a.waitForTimeout(700);
await a.locator('input[name="birthDate"]').fill("2099-01-01");
await a.locator('input[name="cpf"]').fill(CPF_F);
await a.getByRole("button", { name: "Cadastrar atleta" }).click();
ok(
  "nascimento no futuro é recusado",
  await vis(a.getByText("Confira a data de nascimento.")),
);
await a.waitForTimeout(700);

// create adult
await a.locator('input[name="birthDate"]').fill("1995-03-10");
await fillAthlete(a, {
  name: "Matheus de Souza",
  birth: "1995-03-10",
  gender: "Masculino",
  cpf: CPF_F,
  email: "Matheus@Exemplo.com",
  phone: "(31) 99999-8888",
});
await a.getByRole("button", { name: "Cadastrar atleta" }).click();
await a.waitForURL(isDetail);
const athleteId = path(a).split("/").pop();
ok(
  "atleta cadastrado abre o detalhe",
  await vis(a.getByRole("heading", { name: "Matheus de Souza" })),
);
ok(
  "banco: CPF só com dígitos, e-mail e telefone normalizados, vínculo criado",
  sql(
    `select cpf||'|'||email||'|'||phone from athletes where id='${athleteId}'`,
  ) ===
    CPF_D + "|matheus@exemplo.com|31999998888" &&
    sql(
      `select count(*) from organization_athletes where "athleteId"='${athleteId}'`,
    ) === "1",
);
await a.getByRole("link", { name: "Atletas" }).first().click();
await a.waitForURL((u) => new URL(u).pathname === "/athletes");
ok(
  "lista mostra CPF mascarado e idade",
  (await vis(a.getByRole("cell", { name: CPF_MASK }))) &&
    (await a.getByRole("cell", { name: /^\d+$/ }).count()) >= 1,
);
ok(
  "lista não mostra o CPF completo",
  (await a.locator("main").textContent()).includes(CPF_F.slice(0, 7)) === false,
);

// duplicate in the same org
await a.goto(BASE + "/athletes/new", { waitUntil: "networkidle" });
await fillAthlete(a, {
  name: "Outro Nome",
  birth: "1990-01-01",
  gender: "Masculino",
  cpf: CPF_D,
});
await a.getByRole("button", { name: "Cadastrar atleta" }).click();
ok(
  "mesmo CPF na mesma organização é avisado",
  await vis(a.getByText("Este atleta já está no cadastro da sua organização.")),
);

// minor
await a.goto(BASE + "/athletes/new", { waitUntil: "networkidle" });
ok(
  "bloco do responsável escondido para adulto",
  !(await a.locator('input[name="guardianName"]').isVisible()),
);
await a.locator('input[name="birthDate"]').fill("2014-05-01");
ok(
  "bloco do responsável aparece para menor",
  await a.locator('input[name="guardianName"]').isVisible(),
);
await fillAthlete(a, {
  name: "Joana Lima",
  birth: "2014-05-01",
  gender: "Feminino",
});
await a.getByRole("button", { name: "Cadastrar atleta" }).click();
ok(
  "menor sem responsável é recusado",
  (await vis(a.getByText("Menor de idade: informe o nome do responsável."))) &&
    (await vis(a.getByText("Menor de idade: informe o CPF do responsável."))),
);
await a.waitForTimeout(700);
await a.locator('input[name="guardianName"]').fill("Maria Lima");
await a.locator('input[name="guardianCpf"]').fill("111.444.777-35");
await a.getByRole("button", { name: "Cadastrar atleta" }).click();
await a.waitForURL(isDetail);
const minorId = path(a).split("/").pop();
ok(
  "menor sem CPF, com responsável, é aceito",
  sql(
    `select coalesce(cpf,'sem')||'|'||"guardianCpf" from athletes where id='${minorId}'`,
  ) === "sem|11144477735",
);

// cross-organization: same CPF in org B
await b.goto(BASE + "/athletes/new", { waitUntil: "networkidle" });
await fillAthlete(b, {
  name: "Nome Digitado Por B",
  birth: "1995-03-10",
  gender: "Masculino",
  cpf: CPF_F,
  email: "b.invade@exemplo.com",
});
await b.getByRole("button", { name: "Cadastrar atleta" }).click();
ok(
  "outra organização com o mesmo CPF recebe o aviso",
  await vis(b.getByText("Este CPF já tem cadastro")),
);
const alertText = (await b.getByRole("alert").first().textContent()) || "";
ok(
  "o aviso mostra só o nome abreviado (Matheus S.)",
  alertText.includes("Matheus S.") &&
    !alertText.includes("Souza") &&
    !alertText.includes("matheus@exemplo.com"),
  alertText.replace(/\s+/g, " ").slice(0, 140),
);
ok(
  "nada foi criado ainda (continua 1 atleta com esse CPF)",
  sql(`select count(*) from athletes where cpf='${CPF_D}'`) === "1",
);
await b.getByRole("button", { name: "Usar este cadastro" }).click();
await b.waitForURL(isDetail);
ok(
  "vincular leva ao cadastro existente, sem duplicar",
  path(b).split("/").pop() === athleteId &&
    sql(`select count(*) from athletes where cpf='${CPF_D}'`) === "1" &&
    sql(
      `select count(*) from organization_athletes where "athleteId"='${athleteId}'`,
    ) === "2",
);
ok(
  "o nome digitado por B não sobrescreveu nada",
  sql(`select name from athletes where id='${athleteId}'`) ===
    "Matheus de Souza",
);
ok(
  "B vê o atleta somente leitura",
  (await vis(b.getByText("Somente leitura"))) &&
    (await b.getByRole("button", { name: "Salvar alterações" }).count()) ===
      0 &&
    (await b.locator('input[name="name"]').isDisabled()),
);
await b.getByRole("link", { name: "Atletas" }).first().click();
await b.waitForURL((u) => new URL(u).pathname === "/athletes");
ok(
  "lista de B marca 'De outra organização'",
  await vis(b.getByText("De outra organização")),
);
await b.goto(BASE + `/athletes/${minorId}`, { waitUntil: "networkidle" });
ok(
  "B não vê atleta de A que não está vinculado (404)",
  (await vis(b.getByText(/could not be found/i).first())) &&
    (await b.getByText("Joana Lima").count()) === 0,
);

// A edits
await a.goto(BASE + `/athletes/${athleteId}`, { waitUntil: "networkidle" });
ok(
  "CPF não é editável",
  (await a.locator('input[name="cpf"]').isDisabled()) &&
    (await a.locator('input[name="cpf"]').inputValue()) === CPF_F,
);
await a.locator('input[name="name"]').fill("Matheus de Souza Filho");
await a.getByRole("button", { name: "Salvar alterações" }).click();
await a.waitForURL((u) => new URL(u).search.includes("saved=1"));
ok(
  "A edita e vê 'Dados salvos'",
  (await vis(a.getByText("Dados salvos"))) &&
    sql(`select name from athletes where id='${athleteId}'`) ===
      "Matheus de Souza Filho",
);
ok(
  "a edição vale para B (mesmo cadastro)",
  await (async () => {
    await b.goto(BASE + `/athletes/${athleteId}`, { waitUntil: "networkidle" });
    return vis(b.getByRole("heading", { name: "Matheus de Souza Filho" }));
  })(),
);

// teams
await a.getByRole("link", { name: "Times" }).first().click();
await a.waitForURL((u) => new URL(u).pathname === "/teams");
ok("times: estado vazio", await vis(a.getByText("Nenhum time ainda")));
await a.getByRole("link", { name: "Cadastrar time" }).click();
await a.waitForURL((u) => new URL(u).pathname === "/teams/new");
await a.getByRole("button", { name: "Cadastrar time" }).click();
ok(
  "time sem nome é recusado",
  await vis(a.getByText("Informe o nome do time.")),
);
await a.waitForTimeout(700);
await a.locator('input[name="name"]').fill("Águias FC " + T);
await a.locator('input[name="shortName"]').fill("agu");
await a.locator('input[name="color"]').fill("azul");
await a.getByRole("button", { name: "Cadastrar time" }).click();
ok(
  "cor inválida é recusada",
  await vis(a.getByText("Use uma cor no formato #RRGGBB.")),
);
await a.waitForTimeout(700);
await a.locator('input[name="color"]').fill("#187CFA");
await a.locator('input[name="city"]').fill("Belo Horizonte");
await a.locator('select[name="state"]').selectOption("MG");
await a.getByRole("button", { name: "Cadastrar time" }).click();
await a.waitForURL((u) => new URL(u).pathname === "/teams");
ok(
  "time criado aparece na lista",
  await vis(a.getByRole("link", { name: "Águias FC " + T, exact: true })),
);
ok(
  "banco: sigla em maiúsculas, cor em minúsculas, UF",
  sql(
    `select "shortName"||'|'||color||'|'||state from teams where name='Águias FC ${T}'`,
  ) === "AGU|#187cfa|MG",
);
await a.getByRole("link", { name: "Novo time" }).click();
await a.waitForURL((u) => new URL(u).pathname === "/teams/new");
await a.locator('input[name="name"]').fill("  águias fc " + T + " ");
await a.getByRole("button", { name: "Cadastrar time" }).click();
ok(
  "nome repetido (caixa e espaços) é recusado",
  await vis(a.getByText("Já existe um time com esse nome na sua organização.")),
);
await b.goto(BASE + "/teams/new", { waitUntil: "networkidle" });
await b.locator('input[name="name"]').fill("Águias FC " + T);
await b.getByRole("button", { name: "Cadastrar time" }).click();
await b.waitForURL((u) => new URL(u).pathname === "/teams");
ok(
  "o mesmo nome em outra organização é permitido",
  sql(`select count(*) from teams where name='Águias FC ${T}'`) === "2",
);
await a.goto(BASE + "/teams", { waitUntil: "networkidle" });
await a.getByRole("switch", { name: /Desativar Águias FC/ }).click();
await a
  .getByRole("switch", { name: /Ativar Águias FC/ })
  .waitFor({ timeout: 8000 })
  .then(() => ok("desativar time", true))
  .catch(() => ok("desativar time", false));
ok(
  "banco: time desativado, não apagado",
  sql(
    `select count(*) from teams where name='Águias FC ${T}' and active=false`,
  ) === "1",
);
const teamAId = sql(
  `select t.id from teams t join organizations o on o.id=t."organizationId" where t.name='Águias FC ${T}' and o.name like 'Pessoas A %' limit 1`,
);
await b.goto(BASE + `/teams/${teamAId}`, { waitUntil: "networkidle" });
ok(
  "B não abre o time de A (404)",
  await vis(b.getByText(/could not be found/i).first()),
);
await a.goto(BASE + `/teams/${teamAId}`, { waitUntil: "networkidle" });
await a.locator('input[name="name"]').fill("Águias Azuis");
await a.getByRole("button", { name: "Salvar alterações" }).click();
await a.waitForURL((u) => new URL(u).pathname === "/teams");
ok(
  "editar time renomeia",
  await vis(a.getByRole("link", { name: "Águias Azuis", exact: true })),
);

// referees
await a.getByRole("link", { name: "Árbitros" }).first().click();
await a.waitForURL((u) => new URL(u).pathname === "/referees");
ok("árbitros: estado vazio", await vis(a.getByText("Nenhum árbitro ainda")));
await a.getByRole("link", { name: "Cadastrar árbitro" }).click();
await a.waitForURL((u) => new URL(u).pathname === "/referees/new");
await a.getByRole("button", { name: "Cadastrar", exact: true }).click();
ok(
  "árbitro vazio pede nome e função",
  (await vis(a.getByText("Informe o nome."))) &&
    (await vis(a.getByText("Escolha a função."))),
);
await a.waitForTimeout(700);
await a.locator('input[name="name"]').fill("Carlos Reis " + T);
await a.locator('select[name="role"]').selectOption("REFEREE");
await a.locator('input[name="cpf"]').fill("111.444.777-35");
await a.locator('input[name="licenseNumber"]').fill("A-123");
await a.locator('input[name="licenseEntity"]').fill("Federação Mineira");
const sportSel = a
  .locator("select")
  .filter({ has: a.locator("option", { hasText: "Escolha uma modalidade" }) });
await sportSel.selectOption({ label: "Futsal" });
await a.getByRole("button", { name: "Adicionar" }).click();
await sportSel.selectOption({ label: "Basquete" });
await a.getByRole("button", { name: "Adicionar" }).click();
ok(
  "modalidades escolhidas aparecem como etiquetas",
  (await vis(a.getByLabel("Modalidades escolhidas").getByText("Futsal"))) &&
    (await a
      .getByLabel("Modalidades escolhidas")
      .getByText("Basquete", { exact: true })
      .isVisible()),
);
await a.getByRole("button", { name: "Remover Basquete" }).click();
await a.getByRole("button", { name: "Cadastrar", exact: true }).click();
await a.waitForURL((u) => new URL(u).pathname === "/referees");
ok(
  "árbitro criado com função e 1 modalidade",
  (await vis(a.getByRole("link", { name: "Carlos Reis " + T, exact: true }))) &&
    sql(
      `select r.role||'|'||count(rs."sportId") from referees r left join referee_sports rs on rs."refereeId"=r.id where r.name='Carlos Reis ${T}' group by r.role`,
    ) === "REFEREE|1",
);
ok(
  "lista mostra função e modalidade",
  (await a.getByText("Árbitro", { exact: true }).first().isVisible()) &&
    (await a.getByText("Futsal", { exact: true }).first().isVisible()),
);
await a.getByRole("switch", { name: /Desativar Carlos Reis/ }).click();
await a
  .getByRole("switch", { name: /Ativar Carlos Reis/ })
  .waitFor({ timeout: 8000 })
  .then(() => ok("desativar árbitro", true))
  .catch(() => ok("desativar árbitro", false));
const refId = sql(`select id from referees where name='Carlos Reis ${T}'`);
await b.goto(BASE + `/referees/${refId}`, { waitUntil: "networkidle" });
ok(
  "B não abre o árbitro de A (404)",
  await vis(b.getByText(/could not be found/i).first()),
);

// admin has no access
const adCtx = await browser.newContext();
const ad = await adCtx.newPage();
ad.setDefaultTimeout(12000);
await ad.goto(BASE + "/admin/login");
await ad.getByLabel("E-mail").fill(env.ADMIN_EMAIL);
await ad.getByLabel("Senha", { exact: true }).fill(env.ADMIN_PASSWORD);
await ad.getByRole("button", { name: /^Entrar/ }).click();
await ad.waitForURL((u) => new URL(u).pathname === "/admin");
for (const r of ["/athletes", "/teams", "/referees"]) {
  await ad.goto(BASE + r);
  await ad
    .waitForURL((u) => new URL(u).pathname === "/admin")
    .then(() => ok(`admin em ${r} vai para /admin`, true))
    .catch(() => ok(`admin em ${r} vai para /admin`, false, path(ad)));
}

await a.screenshot({ path: "shots/people-referees.png" });
await a.goto(BASE + "/athletes", { waitUntil: "networkidle" });
await a.screenshot({ path: "shots/people-athletes.png" });
await browser.close();
ok(
  "sem erros no console/página",
  errors.length === 0,
  errors.join(" | ").slice(0, 300),
);
process.exit(res.includes(false) ? 1 : 0);
