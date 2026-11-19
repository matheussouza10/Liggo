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
function cpf() {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  if (new Set(n).size === 1) n[0] = (n[0] + 1) % 10;
  const dv = (arr) => {
    let s = 0;
    arr.forEach((x, i) => (s += x * (arr.length + 1 - i)));
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = dv(n),
    d2 = dv([...n, d1]);
  const all = [...n, d1, d2].join("");
  return all.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}
const digits = (c) => c.replace(/\D/g, "");
const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const errors = [];
const poll = async (fn, t = 8000) => {
  const end = Date.now() + t;
  while (Date.now() < end) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
};
const wrap = (p) => {
  const o = p.getByLabel.bind(p);
  p.getByLabel = (l, x) => o(l, x).filter({ visible: true });
  p.setDefaultTimeout(12000);
  p.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  return p;
};
async function owner(label) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1500 },
  });
  const p = wrap(await ctx.newPage());
  await p.goto(BASE + "/signup", { waitUntil: "networkidle" });
  await p.getByLabel("Nome da organização").fill(`Pub ${label} ${T}`);
  await p.getByLabel("Nome do responsável").fill(`Dono ${label}`);
  await p.getByLabel("E-mail").fill(`pr.${label}.${T}@example.com`);
  await p.getByLabel("Senha", { exact: true }).fill(PASS);
  await p.getByLabel("Confirmar senha").fill(PASS);
  await p.getByRole("checkbox").check();
  await p.getByRole("button", { name: /Criar conta/ }).click();
  await p.waitForURL((u) => new URL(u).pathname === "/dashboard");
  return p;
}
let ipn = 0;
async function visitor() {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 1600 },
    extraHTTPHeaders: {
      "x-forwarded-for": `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${++ipn}`,
    },
  });
  return wrap(await ctx.newPage());
}
const A = await owner("a"),
  B = await owner("b");
const em = (l) => `pr.${l}.${T}@example.com`;
const orgA = sql(`select "organizationId" from users where email='${em("a")}'`),
  orgB = sql(`select "organizationId" from users where email='${em("b")}'`),
  uA = sql(`select id from users where email='${em("a")}'`);

// event (Futsal, TEAM) with a general category (roster 2..3) and Sub-13
await A.goto(BASE + "/events/new", { waitUntil: "networkidle" });
await A.getByLabel("Nome do evento").fill(`Copa Pública ${T}`);
await A.getByLabel("Início", { exact: true }).fill("2026-12-05");
await A.getByLabel("Fim", { exact: true }).fill("2026-12-06");
await A.getByLabel("Tipo", { exact: true }).selectOption({ label: "Copa" });
await A.getByLabel("Modalidade", { exact: true }).selectOption({
  label: "Futsal",
});
await A.getByLabel("Formato", { exact: true }).selectOption({
  label: "Pontos Corridos",
});
await A.getByRole("radio", { name: "Equipe" }).check();
await A.getByLabel("Local", { exact: true }).fill("Ginásio Público");
await A.getByRole("button", { name: "Criar evento" }).click();
await A.waitForURL(
  (u) =>
    /^\/events\/[a-z0-9]+$/.test(new URL(u).pathname) &&
    new URL(u).pathname !== "/events/new",
);
const E = new URL(A.url()).pathname.split("/").pop();
const cat = sql(`select id from event_categories where "eventId"='${E}'`);
sql(
  `update event_categories set "rosterMin"=2, "rosterMax"=3 where id='${cat}'`,
);
const cat13 = rid("cg");
sql(
  `insert into event_categories(id,"eventId",name,gender,"maxAge","rosterMin","sortOrder","updatedAt") values('${cat13}','${E}','Sub-13','MIXED',13,1,1,now())`,
);

// ===== 1. closed by default
const v0 = await visitor();
await v0.goto(`${BASE}/register/${E}`, { waitUntil: "networkidle" });
ok(
  "por padrão as inscrições estão fechadas, sem formulário",
  (await vis(v0.getByText("As inscrições deste evento não estão abertas."))) &&
    (await v0.getByRole("button", { name: /Enviar pedido/ }).count()) === 0,
);
// ===== 2. owner opens
await A.goto(`${BASE}/events/${E}`, { waitUntil: "networkidle" });
ok(
  "a página do evento tem a seção Inscrições públicas",
  await vis(A.getByRole("heading", { name: "Inscrições públicas" })),
);
await A.getByRole("switch", {
  name: "Receber pedidos de inscrição pela página pública",
}).click();
await A.getByLabel("Instruções para quem vai se inscrever (opcional)").fill(
  "Leve documento com foto. Taxa de R$ 100 no dia.",
);
await A.getByRole("button", { name: "Salvar", exact: true }).click();
ok(
  "salvar abre as inscrições e mostra o link",
  (await vis(A.getByLabel("Link do formulário de inscrição"))) &&
    sql(
      `select "registrationOpen"::text||'|'||"registrationNotes" from events where id='${E}'`,
    ) === "true|Leve documento com foto. Taxa de R$ 100 no dia.",
);
ok(
  "o link mostrado aponta para o formulário",
  (await A.getByLabel("Link do formulário de inscrição").innerText()).endsWith(
    `/register/${E}`,
  ),
);

// ===== 3. visitor form
const V = await visitor();
await V.goto(`${BASE}/register/${E}`, { waitUntil: "networkidle" });
ok(
  "o formulário público mostra evento, modalidade, instruções e as categorias",
  (await vis(V.getByRole("heading", { name: `Copa Pública ${T}` }))) &&
    (await vis(V.getByText("Leve documento com foto."))) &&
    (await V.getByLabel("Categoria").locator("option").allInnerTexts()).some(
      (t) => t.includes("Sub-13"),
    ),
);
await V.getByRole("button", { name: /Enviar pedido/ }).click();
ok(
  "enviar vazio aponta os campos (categoria, time, contato, declaração)",
  (await vis(V.getByText("Escolha a categoria."))) &&
    (await vis(V.getByText("Informe o nome do time."))) &&
    (await vis(V.getByText("Informe o seu nome."))) &&
    (await vis(V.getByText("Marque a declaração para enviar."))),
);
const adultCpf = cpf(),
  adult2Cpf = cpf(),
  guardCpf = cpf();
const aName = `Atleta Adulta ${T}`,
  bName = `Jovem Atleta ${T}`;
const fillMember = async (p, i, m) => {
  const li = p.getByRole("listitem", { name: `Atleta ${i}` });
  await li.getByLabel("Nome completo").fill(m.name);
  await li.getByLabel("Data de nascimento").fill(m.birth);
  await li.getByLabel("Sexo").selectOption(m.gender);
  if (m.cpf) await li.getByLabel(/^CPF/, { exact: false }).first().fill(m.cpf);
  if (m.gname) {
    await li.getByLabel("Nome do responsável").fill(m.gname);
    await li.getByLabel("CPF do responsável").fill(m.gcpf);
  }
  if (m.shirt) await li.getByLabel("Camisa (opcional)").fill(m.shirt);
  if (m.captain) await li.getByRole("checkbox").check();
};
const fillCommon = async (
  p,
  { team, email, category, name = "Contato Teste" },
) => {
  await p.getByLabel("Categoria").selectOption(category);
  await p.getByLabel("Nome do time").fill(team);
  await p.getByLabel("Seu nome").fill(name);
  await p.getByLabel("Seu e-mail").fill(email);
  await p.getByLabel("Telefone com DDD (opcional)").fill("(31) 99999-1234");
};
// 8. too few athletes
await fillCommon(V, {
  team: `Time Teste ${T}`,
  email: em("v1"),
  category: cat,
});
await fillMember(V, 1, {
  name: aName,
  birth: "1990-05-10",
  gender: "FEMALE",
  cpf: adultCpf,
});
await V.getByRole("checkbox", { name: "Declaração de autorização" }).check();
await V.getByRole("button", { name: /Enviar pedido/ }).click();
ok(
  "elenco abaixo do mínimo da categoria é recusado",
  await vis(
    V.getByText("O elenco precisa de pelo menos 2 atletas nesta categoria."),
  ),
);
// add the minor: guardian fields appear only for minors
await V.getByRole("button", { name: "Adicionar atleta" }).click();
const li2 = V.getByRole("listitem", { name: "Atleta 2" });
await li2.getByLabel("Data de nascimento").fill("2012-03-04");
ok(
  "para menor aparecem os campos do responsável e o CPF vira opcional",
  (await vis(li2.getByLabel("Nome do responsável"))) &&
    (await vis(li2.getByLabel("CPF do atleta (opcional)"))),
);
await li2.getByLabel("Nome completo").fill(bName);
await li2.getByLabel("Sexo").selectOption("MALE");
await V.getByRole("button", { name: /Enviar pedido/ }).click();
ok(
  "menor sem responsável é recusado, apontando o campo",
  await vis(V.getByText("Menor de idade: informe o nome do responsável.")),
);
await li2.getByLabel("Nome do responsável").fill("Pai do Jovem");
await li2.getByLabel("CPF do responsável").fill(guardCpf);
await li2.getByLabel("Camisa (opcional)").fill("7");
await V.getByRole("listitem", { name: "Atleta 1" })
  .getByLabel("Camisa (opcional)")
  .fill("7");
await V.getByRole("button", { name: /Enviar pedido/ }).click();
ok(
  "camisa repetida é recusada",
  await vis(V.getByText("Há camisas repetidas.")),
);
await V.getByRole("listitem", { name: "Atleta 1" })
  .getByLabel("Camisa (opcional)")
  .fill("10");
await V.getByRole("listitem", { name: "Atleta 1" })
  .getByRole("checkbox")
  .check();
// 5. ineligible: adult in Sub-13
await V.getByLabel("Categoria").selectOption(cat13);
await V.getByRole("button", { name: /Enviar pedido/ }).click();
ok(
  "atleta fora da idade da categoria é recusado, citando o nome",
  await vis(
    V.getByText(
      new RegExp(
        `${aName} não pode jogar esta categoria: Idade máxima 13 anos`,
      ),
    ),
  ),
);
await V.getByLabel("Categoria").selectOption(cat);
await V.getByRole("button", { name: "Adicionar pessoa" }).click();
await V.getByRole("group", { name: "Comissão 1" })
  .getByLabel("Nome")
  .fill("Técnico Zé");
await V.getByRole("button", { name: /Enviar pedido/ }).click();
await V.waitForURL((u) => new URL(u).pathname.startsWith("/register/status/"));
const token = new URL(V.url()).pathname.split("/").pop();
ok(
  "enviar leva à página de acompanhamento, pendente",
  (await vis(V.getByRole("heading", { name: "Aguardando a organização" }))) &&
    (await vis(V.getByText(aName))) &&
    (await vis(V.getByText(bName))),
);
ok(
  "a página de acompanhamento não mostra CPF nem e-mail",
  !/\d{3}\.\d{3}\.\d{3}-\d{2}/.test(await V.locator("body").innerText()) &&
    !(await V.locator("body").innerText()).includes("@example.com"),
);
const R1 = sql(
  `select id from registration_requests where "eventId"='${E}' and "contactEmail"='${em("v1")}'`,
);
ok(
  "banco: pedido pendente com 2 atletas, comissão e declaração registrada",
  sql(
    `select status||'|'||"teamName"||'|'||(select count(*) from registration_request_members where "requestId"=r.id)||'|'||(select count(*) from registration_request_staff where "requestId"=r.id)||'|'||("consentAt" is not null) from registration_requests r where id='${R1}'`,
  ) ===
    "PENDING|Time Teste " + T + "|2|1|true",
);
ok(
  "banco: só o hash do segredo é guardado",
  sql(
    `select "tokenHash" <> '${token}' and length("tokenHash")=64 from registration_requests where id='${R1}'`,
  ) === "t",
);
ok(
  "nenhum atleta, time ou inscrição nasceu antes da aprovação",
  sql(
    `select (select count(*) from athletes where cpf='${digits(adultCpf)}')+(select count(*) from teams where "organizationId"='${orgA}' and name='Time Teste ${T}')+(select count(*) from registrations where "eventId"='${E}')`,
  ) === "0",
);
ok(
  "e-mails: recebimento para o solicitante e aviso para o proprietário",
  sql(
    `select count(*) from outbound_emails where "toEmail"='${em("v1")}' and subject like 'Recebemos%'`,
  ) === "1" &&
    sql(
      `select count(*) from outbound_emails where "toEmail"='${em("a")}' and subject like 'Novo pedido%'`,
    ) === "1",
);
// 7. duplicate pending
const V2 = await visitor();
await V2.goto(`${BASE}/register/${E}`, { waitUntil: "networkidle" });
await fillCommon(V2, {
  team: `Outro Time ${T}`,
  email: em("v1"),
  category: cat,
});
await fillMember(V2, 1, {
  name: `Fulana ${T}`,
  birth: "1991-01-01",
  gender: "FEMALE",
  cpf: cpf(),
});
await V2.getByRole("button", { name: "Adicionar atleta" }).click();
await fillMember(V2, 2, {
  name: `Ciclana ${T}`,
  birth: "1992-01-01",
  gender: "FEMALE",
  cpf: cpf(),
});
await V2.getByRole("checkbox", { name: "Declaração de autorização" }).check();
await V2.getByRole("button", { name: /Enviar pedido/ }).click();
ok(
  "segundo pedido pendente do mesmo e-mail e categoria é recusado",
  await vis(V2.getByText(/Já existe um pedido pendente deste e-mail/)),
);
// 6. honeypot
await V2.getByLabel("Seu e-mail").fill(em("bot"));
await V2.locator('input[type="text"][tabindex="-1"]').evaluate((el) => {
  const s = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  ).set;
  s.call(el, "http://spam");
  el.dispatchEvent(new Event("input", { bubbles: true }));
});
await V2.getByRole("button", { name: /Enviar pedido/ }).click();
await V2.waitForURL((u) => new URL(u).pathname.startsWith("/register/status/"));
ok(
  "a isca preenchida parece sucesso, mas não guarda nada",
  sql(
    `select count(*) from registration_requests where "contactEmail"='${em("bot")}'`,
  ) === "0" &&
    (await poll(async () =>
      /could not be found/i.test(await V2.locator("body").innerText()),
    )),
);
// 9. throttle per e-mail
sql(
  `insert into auth_attempts(id,kind,key,"createdAt") select 'th'||g||'${T}','REGISTRATION_REQUEST','email:${em("flood")}',(now() at time zone 'utc') from generate_series(1,5) g`,
);
const V3 = await visitor();
await V3.goto(`${BASE}/register/${E}`, { waitUntil: "networkidle" });
await fillCommon(V3, { team: `Flood ${T}`, email: em("flood"), category: cat });
await fillMember(V3, 1, {
  name: `Flood A ${T}`,
  birth: "1991-01-01",
  gender: "FEMALE",
  cpf: cpf(),
});
await V3.getByRole("button", { name: "Adicionar atleta" }).click();
await fillMember(V3, 2, {
  name: `Flood B ${T}`,
  birth: "1992-01-01",
  gender: "FEMALE",
  cpf: cpf(),
});
await V3.getByRole("checkbox", { name: "Declaração de autorização" }).check();
await V3.getByRole("button", { name: /Enviar pedido/ }).click();
ok(
  "muitos pedidos com o mesmo e-mail são barrados",
  await vis(V3.getByText(/Muitos pedidos com este e-mail/)),
);

// ===== 11. organizer approves
await A.goto(`${BASE}/events/${E}`, { waitUntil: "networkidle" });
ok(
  "a página do evento mostra 1 pedido pendente",
  await vis(A.getByText("1 pendente").first()),
);
await A.getByRole("link", { name: /Pedidos/ }).click();
await A.waitForURL((u) => new URL(u).pathname === `/events/${E}/requests`);
ok(
  "a fila lista o pedido pendente",
  await vis(A.getByRole("link", { name: `Pedido de Time Teste ${T}` })),
);
await A.getByRole("link", { name: `Pedido de Time Teste ${T}` }).click();
await A.waitForURL(
  (u) => new URL(u).pathname === `/events/${E}/requests/${R1}`,
);
ok(
  "o detalhe mostra atletas como novo cadastro e o time que será criado",
  (await vis(A.getByText("(será criado)").first())) &&
    (await poll(async () => (await A.getByText("Novo cadastro").count()) >= 2)),
);
ok(
  "sem problemas, o botão Aprovar está liberado",
  !(await A.getByRole("button", { name: "Aprovar e inscrever" }).isDisabled()),
);
// organizer cannot approve below the minimum after removing an athlete
await A.getByLabel("Tirar um atleta do pedido").selectOption({ label: bName });
await vis(
  A.getByText(
    "O elenco precisa de pelo menos 2 atletas nesta categoria (a solicitação tem 1).",
  ),
);
ok(
  "tirar um atleta abaixo do mínimo bloqueia a aprovação com o aviso",
  (await vis(A.getByText(/a solicitação tem 1/))) &&
    (await A.getByRole("button", { name: "Aprovar e inscrever" }).isDisabled()),
);
// put him back through SQL (the UI only removes), then approve
sql(
  `insert into registration_request_members(id,"requestId",name,"birthDate",gender,"guardianName","guardianCpf","shirtNumber") values('${rid("rm")}','${R1}','${bName}','2012-03-04','MALE','Pai do Jovem','${digits(guardCpf)}',7)`,
);
await A.reload({ waitUntil: "networkidle" });
await A.getByRole("button", { name: "Aprovar e inscrever" }).click();
await vis(A.getByText(/Aprovado\. A inscrição foi criada/));
ok(
  "aprovar cria a inscrição e o pedido vira Aprovado",
  (await vis(A.getByText(/Aprovado\. A inscrição foi criada/))) &&
    sql(
      `select status||'|'||("registrationId" is not null)||'|'||("decidedById"='${uA}') from registration_requests where id='${R1}'`,
    ) === "APPROVED|true|true",
);
const REG = sql(
  `select "registrationId" from registration_requests where id='${R1}'`,
);
ok(
  "banco: time criado, atletas criados e vinculados à organização, elenco com capitão e camisa",
  sql(
    `select (select count(*) from teams where "organizationId"='${orgA}' and name='Time Teste ${T}')||'|'||(select count(*) from athletes a join organization_athletes oa on oa."athleteId"=a.id where oa."organizationId"='${orgA}' and a."createdByOrganizationId"='${orgA}' and a.name in ('${aName}','${bName}'))||'|'||(select count(*) from registration_members where "registrationId"='${REG}')||'|'||(select count(*) from registration_members where "registrationId"='${REG}' and "isCaptain" and "shirtNumber"=10)||'|'||(select count(*) from registration_staff where "registrationId"='${REG}' and name='Técnico Zé')`,
  ) === "1|2|2|1|1",
);
ok(
  "o menor ficou com responsável e sem CPF próprio",
  sql(
    `select "guardianName"||'|'||coalesce(cpf,'sem')||'|'||"guardianCpf" from athletes where name='${bName}'`,
  ) ===
    "Pai do Jovem|sem|" + digits(guardCpf),
);
await A.goto(`${BASE}/events/${E}/registrations`, { waitUntil: "networkidle" });
ok(
  "a inscrição aparece na lista de inscrições do evento",
  await vis(A.getByText(`Time Teste ${T}`).first()),
);
ok(
  "e-mail de aprovação enviado ao solicitante",
  sql(
    `select count(*) from outbound_emails where "toEmail"='${em("v1")}' and subject like 'Inscrição aprovada%'`,
  ) === "1",
);
await V.goto(`${BASE}/register/status/${token}`, { waitUntil: "networkidle" });
ok(
  "o solicitante vê Aprovado e já não pode cancelar",
  (await vis(V.getByRole("heading", { name: "Aprovado" }))) &&
    (await V.getByRole("button", { name: "Cancelar pedido" }).count()) === 0,
);

// ===== 12/13. clashes (requests inserted directly)
const mk = (id, team, email, members, catId = cat) => {
  sql(
    `insert into registration_requests(id,"eventId","categoryId",status,"teamName","contactName","contactEmail","consentAt","tokenHash","updatedAt") values('${id}','${E}','${catId}','PENDING','${team}','Contato','${email}',now(),'${rid("h")}${rid("h")}',now())`,
  );
  for (const m of members)
    sql(
      `insert into registration_request_members(id,"requestId",name,"birthDate",gender,cpf,"isCaptain") values('${rid("rm")}','${id}','${m.name}','${m.birth}','${m.g || "MALE"}',${m.cpf ? `'${m.cpf}'` : "null"},false)`,
    );
};
const R2 = rid("rq");
mk(R2, `Time Repetido ${T}`, em("c2"), [
  { name: aName, birth: "1990-05-10", cpf: digits(adultCpf), g: "FEMALE" },
  { name: `Nova Pessoa ${T}`, birth: "1993-01-01", cpf: digits(cpf()) },
]);
await A.goto(`${BASE}/events/${E}/requests/${R2}`, {
  waitUntil: "networkidle",
});
ok(
  "atleta já inscrito na categoria bloqueia a aprovação",
  (await vis(
    A.getByText(new RegExp(`${aName}: Já está inscrito nesta categoria`)),
  )) &&
    (await A.getByRole("button", { name: "Aprovar e inscrever" }).isDisabled()),
);
const R3 = rid("rq");
mk(
  R3,
  `Time Data ${T}`,
  em("c3"),
  [
    { name: aName, birth: "1985-01-01", cpf: digits(adultCpf), g: "FEMALE" },
    { name: `Outra Pessoa ${T}`, birth: "1993-01-01", cpf: digits(cpf()) },
  ],
  cat13,
);
// Sub-13 would also flag age; assert the CPF warning is present
await A.goto(`${BASE}/events/${E}/requests/${R3}`, {
  waitUntil: "networkidle",
});
ok(
  "CPF existente com outra data de nascimento gera aviso para conferir",
  await vis(A.getByText(/outra data de nascimento/)),
);
// existing athlete of another org is linked, not copied
const otherCpf = digits(cpf()),
  foreign = rid("at");
sql(
  `insert into athletes(id,cpf,name,birthDate_placeholder) values('x','x','x','x')`.replace(
    /insert.*/,
    "select 1",
  ),
);
sql(
  `insert into athletes(id,cpf,name,"birthDate",gender,"createdByOrganizationId","updatedAt") values('${foreign}','${otherCpf}','Nome Original Outra Org','1995-02-02','MALE','${orgB}',now())`,
);
sql(
  `insert into organization_athletes("organizationId","athleteId") values('${orgB}','${foreign}')`,
);
const R4 = rid("rq");
mk(R4, `Time Vinculo ${T}`, em("c4"), [
  { name: "Nome Diferente Digitado", birth: "1995-02-02", cpf: otherCpf },
  { name: `Colega ${T}`, birth: "1994-01-01", cpf: digits(cpf()) },
]);
await A.goto(`${BASE}/events/${E}/requests/${R4}`, {
  waitUntil: "networkidle",
});
ok(
  "atleta de outra organização aparece como já existente no sistema",
  await vis(A.getByText("Já existe no sistema")),
);
await A.getByRole("button", { name: "Aprovar e inscrever" }).click();
await vis(A.getByText(/Aprovado\. A inscrição foi criada/));
ok(
  "aprovar vincula o atleta existente sem copiar nem sobrescrever os dados",
  sql(
    `select (select count(*) from athletes where cpf='${otherCpf}')||'|'||(select name from athletes where cpf='${otherCpf}')||'|'||(select count(*) from organization_athletes where "athleteId"='${foreign}' and "organizationId"='${orgA}')`,
  ) === "1|Nome Original Outra Org|1",
);

// ===== 14. reject
const R5 = rid("rq");
mk(R5, `Time Recusado ${T}`, em("c5"), [
  {
    name: `Recusada Um ${T}`,
    birth: "1990-01-01",
    cpf: digits(cpf()),
    g: "FEMALE",
  },
  {
    name: `Recusada Dois ${T}`,
    birth: "1991-01-01",
    cpf: digits(cpf()),
    g: "FEMALE",
  },
]);
sql(
  `update registration_requests set "contactPhone"='31999990000', notes='obs' where id='${R5}'`,
);
await A.goto(`${BASE}/events/${E}/requests/${R5}`, {
  waitUntil: "networkidle",
});
await A.getByRole("button", { name: "Recusar" }).click();
await A.getByRole("dialog")
  .getByRole("button", { name: "Recusar pedido" })
  .click();
ok(
  "recusar exige o motivo, mostrado uma vez só",
  (await vis(A.getByText(/Explique o motivo da recusa/).first())) &&
    (await A.getByText(/Explique o motivo da recusa/).count()) === 1,
);
await A.getByLabel("Motivo").fill("Time fora da faixa do evento.");
await A.getByRole("dialog")
  .getByRole("button", { name: "Recusar pedido" })
  .click();
await A.waitForURL((u) => new URL(u).pathname === `/events/${E}/requests`);
ok(
  "banco: recusado, com motivo, e CPFs, telefone e observações apagados",
  sql(
    `select status||'|'||"rejectionReason"||'|'||(select count(*) from registration_request_members where "requestId"='${R5}' and cpf is not null)||'|'||coalesce("contactPhone",'-')||'|'||coalesce(notes,'-') from registration_requests where id='${R5}'`,
  ) === "REJECTED|Time fora da faixa do evento.|0|-|-",
);
ok(
  "e-mail de recusa com o motivo foi enviado",
  sql(
    `select count(*) from outbound_emails where "toEmail"='${em("c5")}' and text like '%Time fora da faixa do evento.%'`,
  ) === "1",
);
ok(
  "a lista mostra o pedido em Respondidos como Recusado",
  (await vis(A.getByRole("link", { name: `Pedido de Time Recusado ${T}` }))) &&
    (await vis(A.getByText("Recusado").first())),
);

// ===== 15. withdraw by the requester
const V4 = await visitor();
await V4.goto(`${BASE}/register/${E}`, { waitUntil: "networkidle" });
await fillCommon(V4, {
  team: `Time Cancelado ${T}`,
  email: em("v4"),
  category: cat,
});
await fillMember(V4, 1, {
  name: `Cancel A ${T}`,
  birth: "1991-01-01",
  gender: "FEMALE",
  cpf: cpf(),
});
await V4.getByRole("button", { name: "Adicionar atleta" }).click();
await fillMember(V4, 2, {
  name: `Cancel B ${T}`,
  birth: "1992-01-01",
  gender: "FEMALE",
  cpf: cpf(),
});
await V4.getByRole("checkbox", { name: "Declaração de autorização" }).check();
await V4.getByRole("button", { name: /Enviar pedido/ }).click();
await V4.waitForURL((u) => new URL(u).pathname.startsWith("/register/status/"));
await V4.getByRole("button", { name: "Cancelar pedido" }).click();
await V4.getByRole("alertdialog")
  .getByRole("button", { name: "Cancelar pedido" })
  .click();
ok(
  "cancelar pelo link muda para Cancelado",
  await vis(V4.getByRole("heading", { name: "Cancelado", exact: true })),
);
ok(
  "banco: cancelado e dados pessoais apagados",
  sql(
    `select status||'|'||(select count(*) from registration_request_members m where m."requestId"=r.id and m.cpf is not null) from registration_requests r where "contactEmail"='${em("v4")}'`,
  ) === "WITHDRAWN|0",
);
// link with a wrong secret
const wrong = await visitor();
await wrong.goto(`${BASE}/register/status/${"x".repeat(43)}`, {
  waitUntil: "networkidle",
});
ok(
  "segredo errado dá 404",
  /could not be found/i.test(await wrong.locator("body").innerText()),
);

// ===== 10. deadline and ended
sql(
  `update events set "registrationDeadline"='2020-01-01T00:00:00Z' where id='${E}'`,
);
await V.goto(`${BASE}/register/${E}`, { waitUntil: "networkidle" });
ok(
  "depois do prazo o formulário some com aviso",
  (await vis(V.getByText("O prazo de inscrições deste evento terminou."))) &&
    (await V.getByRole("button", { name: /Enviar pedido/ }).count()) === 0,
);
sql(
  `update events set "registrationDeadline"=null, "endDate"='2020-01-02' where id='${E}'`,
);
await V.goto(`${BASE}/register/${E}`, { waitUntil: "networkidle" });
ok(
  "evento encerrado também fecha",
  await vis(V.getByText("Este evento já terminou.")),
);
sql(`update events set "endDate"='2026-12-06' where id='${E}'`);
// deadline UI round trip
await A.goto(`${BASE}/events/${E}`, { waitUntil: "networkidle" });
await A.getByLabel("Prazo (opcional)").fill("2026-12-01");
await A.getByRole("button", { name: "Salvar", exact: true }).click();
await vis(A.getByText("Configuração salva."));
ok(
  "o prazo salvo vale até o fim do dia (Brasil)",
  sql(`select "registrationDeadline" from events where id='${E}'`) ===
    "2026-12-02 02:59:59",
);
await A.reload({ waitUntil: "networkidle" });
ok(
  "e o campo volta com o mesmo dia",
  (await A.getByLabel("Prazo (opcional)").inputValue()) === "2026-12-01",
);

// ===== 16. change category
const R6 = rid("rq");
mk(
  R6,
  `Time Categoria ${T}`,
  em("c6"),
  [
    { name: `Cat A ${T}`, birth: "1990-01-01", cpf: digits(cpf()) },
    { name: `Cat B ${T}`, birth: "1991-01-01", cpf: digits(cpf()) },
  ],
  cat13,
);
await A.goto(`${BASE}/events/${E}/requests/${R6}`, {
  waitUntil: "networkidle",
});
ok(
  "categoria inadequada gera aviso por atleta",
  await vis(
    A.getByText(
      /Cat A .*: Não pode jogar esta categoria: Idade máxima 13 anos/,
    ),
  ),
);
await A.getByLabel("Categoria do pedido").selectOption({ label: "Geral" });
ok(
  "trocar a categoria resolve os avisos e libera a aprovação",
  (await vis(
    A.getByRole("button", { name: "Aprovar e inscrever" }).and(
      A.locator(":enabled"),
    ),
  )) &&
    sql(`select "categoryId" from registration_requests where id='${R6}'`) ===
      cat,
);

// ===== permissions
const memberCtx = await browser.newContext();
const Bp = B;
await Bp.goto(`${BASE}/events/${E}/requests/${R6}`, {
  waitUntil: "networkidle",
});
ok(
  "outra organização recebe 404 no pedido",
  /could not be found/i.test(await Bp.locator("body").innerText()),
);
await Bp.goto(`${BASE}/events/${E}/requests`, { waitUntil: "networkidle" });
ok(
  "e na fila do evento",
  /could not be found/i.test(await Bp.locator("body").innerText()),
);
await memberCtx.close();
const anon = await visitor();
await anon.goto(`${BASE}/events/${E}/requests`, { waitUntil: "networkidle" });
ok("sem login a fila pede entrada", new URL(anon.url()).pathname === "/login");

// ===== 18. deleting the event removes the requests
await A.goto(`${BASE}/events/${E}`, { waitUntil: "networkidle" });
await A.getByRole("button", { name: "Excluir" }).click();
await A.locator("#del-confirm").fill(`Copa Pública ${T}`);
await A.getByRole("button", { name: "Excluir definitivamente" }).click();
await A.waitForURL((u) => new URL(u).pathname === "/events");
ok(
  "excluir o evento apaga os pedidos (e as inscrições criadas por eles)",
  sql(
    `select (select count(*) from registration_requests where "eventId"='${E}')+(select count(*) from registrations where "eventId"='${E}')`,
  ) === "0",
);
await V.goto(`${BASE}/register/${E}`, { waitUntil: "networkidle" });
ok(
  "o formulário do evento excluído dá 404",
  /could not be found/i.test(await V.locator("body").innerText()),
);
ok("sem erros de JavaScript", errors.length === 0, errors.join(" | "));
console.log(fails === 0 ? "TODOS PASSARAM" : `${fails} FALHAS`);
await browser.close();
