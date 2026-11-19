import { chromium } from "playwright-core";
import { execSync } from "node:child_process";
const DB = "postgresql://postgres:admin@localhost:5432/liggo";
const sql = (q) =>
  execSync(`psql "${DB}" -At -c "${q.replace(/"/g, '\\"')}"`)
    .toString()
    .trim();
const BASE = "http://localhost:3000",
  PASS = "Senha-de-teste-123",
  NEW = "Outra-senha-456",
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
const errors = [];
const ctxPage = async (w = 1440) => {
  const ctx = await browser.newContext({
    viewport: { width: w, height: 1200 },
  });
  const p = await ctx.newPage();
  p.setDefaultTimeout(12000);
  p.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  return p;
};
const email = (l) => `ac.${l}.${T}@example.com`;
const signup = async (p, l) => {
  await p.goto(BASE + "/signup", { waitUntil: "networkidle" });
  await p.getByLabel("Nome da organização").fill(`Conta ${l} ${T}`);
  await p.getByLabel("Nome do responsável").fill(`Dono ${l}`);
  await p.getByLabel("E-mail").fill(email(l));
  await p.getByLabel("Senha", { exact: true }).fill(PASS);
  await p.getByLabel("Confirmar senha").fill(PASS);
  await p.getByRole("checkbox").check();
  await p.getByRole("button", { name: /Criar conta/ }).click();
  await p.waitForURL((u) => new URL(u).pathname === "/dashboard");
};
const login = async (p, mail, pw) => {
  await p.goto(BASE + "/login", { waitUntil: "networkidle" });
  await p.getByLabel("E-mail").fill(mail);
  await p.getByLabel("Senha", { exact: true }).fill(pw);
  await p.getByRole("button", { name: "Entrar" }).click();
};
const mailLink = (to, kind) => {
  const t = sql(
    `select text from outbound_emails where "toEmail"='${to}' and text like '%${kind}%' order by "createdAt" desc limit 1`,
  );
  const m = t.match(
    new RegExp(`http://localhost:3000/${kind}\\?token=[^\\s]+`),
  );
  return m ? m[0] : null;
};
const mails = (to) =>
  Number(sql(`select count(*) from outbound_emails where "toEmail"='${to}'`));

// ================= terms & privacy (public)
const pub = await ctxPage();
await pub.goto(BASE + "/terms", { waitUntil: "networkidle" });
ok(
  "/terms abre sem login, com título, versão e aviso de rascunho",
  (await vis(pub.getByRole("heading", { name: "Termos de uso" }))) &&
    (await vis(pub.getByText("Versão preliminar"))) &&
    (await vis(pub.getByText(/Versão 2026-11/))),
);
await pub.goto(BASE + "/privacy", { waitUntil: "networkidle" });
ok(
  "/privacy abre sem login e cita a LGPD e os direitos do titular",
  (await vis(pub.getByRole("heading", { name: "Política de privacidade" }))) &&
    (await vis(pub.getByText(/Lei 13.709/))) &&
    (await vis(pub.getByRole("heading", { name: "8. Seus direitos" }))),
);
await pub.goto(BASE + "/signup", { waitUntil: "networkidle" });
ok(
  "o cadastro tem links para os termos e a política",
  (await pub
    .getByRole("link", { name: "termos de uso" })
    .first()
    .getAttribute("href")) === "/terms" &&
    (await pub
      .getByRole("link", { name: "política de privacidade" })
      .first()
      .getAttribute("href")) === "/privacy",
);
await pub.goto(BASE + "/login", { waitUntil: "networkidle" });
ok(
  "a tela de login tem os links no rodapé",
  (await vis(pub.getByRole("link", { name: "Termos" }).first())) &&
    (await vis(pub.getByRole("link", { name: "Privacidade" }).first())),
);

// ================= sign up records the acceptance
const u1 = await ctxPage();
await signup(u1, "u1");
ok(
  "o cadastro grava o aceite dos termos (data e versão)",
  sql(
    `select ("termsAcceptedAt" is not null)||'|'||"termsVersion" from users where email='${email("u1")}'`,
  ) === "true|2026-11" ||
    sql(
      `select ("termsAcceptedAt" is not null)||'|'||"termsVersion" from users where email='${email("u1")}'`,
    ) === "t|2026-11",
);

// ================= forgot password
const f = await ctxPage();
await f.goto(BASE + "/forgot-password", { waitUntil: "networkidle" });
await f.getByLabel("E-mail").fill(`naoexiste.${T}@example.com`);
await f.getByRole("button", { name: /Enviar link/ }).click();
const msg = "Se existir uma conta com esse e-mail";
ok(
  "e-mail que não existe recebe a MESMA mensagem de sucesso (não revela contas)",
  await vis(f.getByText(msg)),
);
ok(
  "e nenhum e-mail é gerado para ele",
  mails(`naoexiste.${T}@example.com`) === 0,
);
await f.goto(BASE + "/forgot-password", { waitUntil: "networkidle" });
await f.getByLabel("E-mail").fill(email("u1"));
await f.getByRole("button", { name: /Enviar link/ }).click();
ok("e-mail existente recebe a mesma mensagem", await vis(f.getByText(msg)));
const link1 = mailLink(email("u1"), "reset-password");
ok(
  "o e-mail com o link de redefinição foi gerado (assunto e link)",
  !!link1 &&
    sql(
      `select subject from outbound_emails where "toEmail"='${email("u1")}' order by "createdAt" desc limit 1`,
    ).includes("nova senha"),
  link1?.slice(0, 60),
);
ok(
  "só o hash do token fica no banco (o token não aparece em nenhuma coluna)",
  !!link1 &&
    Number(
      sql(
        `select count(*) from password_reset_tokens where "tokenHash"='${link1.split("token=")[1]}'`,
      ),
    ) === 0,
);
await f.getByRole("button", { name: /Enviar de novo/ }).click();
ok(
  "pedir de novo logo em seguida é limitado (1 por minuto)",
  await vis(f.getByText(/Você já pediu um link há pouco/)),
);
ok("o pedido limitado não gerou outro e-mail", mails(email("u1")) === 1);

// a second signed-in device of u1 (to prove sessions die with the reset)
const u1b = await ctxPage();
await login(u1b, email("u1"), PASS);
await u1b.waitForURL((u) => new URL(u).pathname === "/dashboard");

// ================= reset page
const r = await ctxPage();
await r.goto(link1, { waitUntil: "networkidle" });
ok(
  "o link abre a página 'Crie uma nova senha'",
  await vis(r.getByRole("heading", { name: "Crie uma nova senha" })),
);
await r.getByLabel("Nova senha", { exact: true }).fill("1234567");
await r.getByLabel("Repita a nova senha").fill("1234567");
await r.getByRole("button", { name: "Salvar nova senha" }).click();
ok(
  "senha curta é recusada",
  await vis(r.getByText(/pelo menos 8 caracteres/).first()),
);
await r.getByLabel("Nova senha", { exact: true }).fill(NEW);
await r.getByLabel("Repita a nova senha").fill(NEW + "x");
await r.getByRole("button", { name: "Salvar nova senha" }).click();
ok(
  "confirmação diferente é recusada",
  await vis(r.getByText("As senhas não coincidem.")),
);
await r.getByLabel("Nova senha", { exact: true }).fill(NEW);
await r.getByLabel("Repita a nova senha").fill(NEW);
await r.getByRole("button", { name: "Salvar nova senha" }).click();
await r.waitForURL((u) => new URL(u).pathname === "/login");
ok(
  "depois de salvar volta ao login com o aviso 'Senha alterada'",
  new URL(r.url()).search === "?reset=1" &&
    (await vis(r.getByText("Senha alterada. Entre com a nova senha."))),
);
await login(r, email("u1"), PASS);
ok(
  "a senha antiga não funciona mais",
  await vis(r.getByText("E-mail ou senha incorretos.")),
);
await login(r, email("u1"), NEW);
await r.waitForURL((u) => new URL(u).pathname === "/dashboard");
ok("a senha nova funciona", true);
await u1b.goto(BASE + "/dashboard", { waitUntil: "networkidle" });
ok(
  "o outro aparelho que estava conectado foi desconectado pela redefinição",
  new URL(u1b.url()).pathname === "/login",
);
await r.context().clearCookies();
const r2 = await ctxPage();
await r2.goto(link1, { waitUntil: "networkidle" });
ok(
  "o mesmo link não pode ser usado duas vezes ('Link expirado')",
  (await vis(r2.getByRole("heading", { name: "Link expirado" }))) &&
    (await vis(r2.getByRole("link", { name: "Pedir um novo link" }))),
);
await r2.goto(BASE + "/reset-password?token=lixo", {
  waitUntil: "networkidle",
});
ok(
  "token inventado também mostra 'Link expirado'",
  await vis(r2.getByRole("heading", { name: "Link expirado" })),
);

// expired link (second user)
const u2 = await ctxPage();
await signup(u2, "u2");
await u2.context().clearCookies();
await f.goto(BASE + "/forgot-password", { waitUntil: "networkidle" });
await f.getByLabel("E-mail").fill(email("u2"));
await f.getByRole("button", { name: /Enviar link/ }).click();
await vis(f.getByText(msg));
const link2 = mailLink(email("u2"), "reset-password");
sql(
  `update password_reset_tokens set "expiresAt"=now()-interval '1 minute' where "userId"=(select id from users where email='${email("u2")}')`,
);
await r2.goto(link2, { waitUntil: "networkidle" });
ok(
  "link com mais de 1 hora (vencido) é recusado",
  await vis(r2.getByRole("heading", { name: "Link expirado" })),
);
// a newer link replaces the older one
await f.goto(BASE + "/forgot-password", { waitUntil: "networkidle" });

// ================= login throttle
const u3 = await ctxPage();
await signup(u3, "u3");
await u3.context().clearCookies();
const t3 = await ctxPage();
for (let i = 0; i < 5; i++) {
  await login(t3, email("u3"), "errada-" + i);
  await vis(t3.getByText("E-mail ou senha incorretos."));
}
await login(t3, email("u3"), PASS);
ok(
  "depois de 5 falhas, até a senha CERTA é bloqueada por um tempo",
  await vis(t3.getByText(/Muitas tentativas de entrada/)),
);
await login(t3, email("u1"), NEW);
await t3.waitForURL((u) => new URL(u).pathname === "/dashboard");
ok("o bloqueio é por e-mail: outra conta entra normalmente", true);

// ================= settings: profile / security / organization
await u1.context().clearCookies();
await login(u1, email("u1"), NEW);
await u1.waitForURL((u) => new URL(u).pathname === "/dashboard");
await u1.goto(BASE + "/settings", { waitUntil: "networkidle" });
ok(
  "Configurações abre o perfil (e não 'em desenvolvimento')",
  (await vis(u1.getByRole("heading", { name: "Perfil" }))) &&
    (await u1.getByText("Esta área ainda está em desenvolvimento").count()) ===
      0,
);
ok(
  "o e-mail é só leitura e aparece o aceite dos termos",
  (await u1.getByLabel("E-mail").isDisabled()) &&
    (await vis(u1.getByText(/Termos aceitos em .* \(versão 2026-11\)/))),
);
await u1.getByLabel("Nome", { exact: true }).fill("A");
await u1.getByRole("button", { name: "Salvar perfil" }).click();
ok("nome curto é recusado", await vis(u1.getByText("Informe o seu nome.")));
await u1.getByLabel("Nome", { exact: true }).fill("Dono Renomeado");
await u1.getByRole("button", { name: "Salvar perfil" }).click();
ok(
  "perfil atualizado",
  (await vis(u1.getByText("Perfil atualizado."))) &&
    sql(`select name from users where email='${email("u1")}'`) ===
      "Dono Renomeado",
);
// security
await u1.goto(BASE + "/settings/security", { waitUntil: "networkidle" });
const other = await ctxPage();
await login(other, email("u1"), NEW);
await other.waitForURL((u) => new URL(u).pathname === "/dashboard");
await u1.reload({ waitUntil: "networkidle" });
const liveSessions = Number(
  sql(
    `select count(*) from sessions where "userId"=(select id from users where email='${email("u1")}') and "expiresAt">now()`,
  ),
);
ok(
  "mostra quantos aparelhos estão conectados (o mesmo número do banco)",
  (await u1.getByTestId("session-count").innerText()).includes(
    `${liveSessions} aparelhos`,
  ) && liveSessions >= 2,
  `${liveSessions} no banco`,
);
await u1.getByLabel("Senha atual").fill("errada-errada");
await u1.getByLabel("Nova senha", { exact: true }).fill("Terceira-senha-789");
await u1.getByLabel("Repita a nova senha").fill("Terceira-senha-789");
await u1.getByRole("button", { name: "Trocar senha" }).click();
ok(
  "senha atual errada é recusada",
  await vis(u1.getByText("A senha atual não confere.")),
);
await u1.getByLabel("Senha atual").fill(NEW);
await u1.getByLabel("Nova senha", { exact: true }).fill(NEW);
await u1.getByLabel("Repita a nova senha").fill(NEW);
await u1.getByRole("button", { name: "Trocar senha" }).click();
ok(
  "nova senha igual à atual é recusada",
  await vis(u1.getByText("A nova senha precisa ser diferente da atual.")),
);
await u1.getByLabel("Senha atual").fill(NEW);
await u1.getByLabel("Nova senha", { exact: true }).fill("Terceira-senha-789");
await u1.getByLabel("Repita a nova senha").fill("Terceira-senha-789");
await u1.getByRole("button", { name: "Trocar senha" }).click();
ok(
  "trocar a senha avisa quantos outros aparelhos foram desconectados",
  await vis(
    u1.getByText(
      new RegExp(
        `Senha alterada\\. ${liveSessions - 1 === 1 ? "1 outro aparelho foi desconectado" : `${liveSessions - 1} outros aparelhos foram desconectados`}`,
      ),
    ),
  ),
);
ok(
  "só a sessão deste aparelho sobrou",
  sql(
    `select count(*) from sessions where "userId"=(select id from users where email='${email("u1")}')`,
  ) === "1",
);
await other.goto(BASE + "/dashboard", { waitUntil: "networkidle" });
ok(
  "o outro aparelho foi mesmo desconectado",
  new URL(other.url()).pathname === "/login",
);
await u1.goto(BASE + "/dashboard", { waitUntil: "networkidle" });
ok(
  "este aparelho continua conectado",
  new URL(u1.url()).pathname === "/dashboard",
);
await u1.goto(BASE + "/settings/security", { waitUntil: "networkidle" });
await u1.getByRole("button", { name: "Sair de todos os aparelhos" }).click();
await u1.waitForURL((u) => new URL(u).pathname === "/login");
ok(
  "'Sair de todos os aparelhos' encerra todas as sessões, inclusive esta",
  sql(
    `select count(*) from sessions where "userId"=(select id from users where email='${email("u1")}')`,
  ) === "0",
);
const PW3 = "Terceira-senha-789";
await login(u1, email("u1"), PW3);
await u1.waitForURL((u) => new URL(u).pathname === "/dashboard");
// organization
await u1.goto(BASE + "/settings/organization", { waitUntil: "networkidle" });
await u1.getByLabel("Nome da organização").fill("Org Renomeada " + T);
await u1.getByRole("button", { name: "Salvar organização" }).click();
ok(
  "proprietário altera o nome da organização",
  (await vis(u1.getByText("Dados da organização atualizados."))) &&
    sql(
      `select o.name from organizations o join users u on u."organizationId"=o.id where u.email='${email("u1")}'`,
    ) ===
      "Org Renomeada " + T,
);

// ================= team & invitations
await u1.goto(BASE + "/settings/team", { waitUntil: "networkidle" });
ok(
  "Equipe mostra o proprietário (você) e o formulário de convite",
  (await vis(u1.getByTestId(`member-${email("u1")}`))) &&
    (await vis(
      u1.getByRole("button", { name: "Enviar convite", exact: true }),
    )),
);
await u1.getByLabel("E-mail da pessoa").fill("invalido");
await u1.getByRole("button", { name: "Enviar convite", exact: true }).click();
ok(
  "e-mail inválido é recusado",
  await vis(u1.getByText("Informe um e-mail válido.")),
);
await u1.getByLabel("E-mail da pessoa").fill(email("u2"));
await u1.getByRole("button", { name: "Enviar convite", exact: true }).click();
ok(
  "convidar quem já tem conta é recusado com explicação",
  await vis(u1.getByText(/já tem uma conta/)),
);
const guest = `convidado.${T}@example.com`;
await u1.getByLabel("E-mail da pessoa").fill(guest);
await u1.getByRole("button", { name: "Enviar convite", exact: true }).click();
ok(
  "convite enviado: aviso e linha em 'Convites pendentes'",
  (await vis(u1.getByText(`Convite enviado para ${guest}.`))) &&
    (await vis(u1.getByTestId(`invite-${guest}`))),
);
const inv1 = mailLink(guest, "invite");
ok(
  "o e-mail do convite foi gerado com o nome da organização",
  !!inv1 &&
    sql(
      `select subject from outbound_emails where "toEmail"='${guest}' order by "createdAt" desc limit 1`,
    ).includes("Org Renomeada"),
);
await u1.getByLabel("E-mail da pessoa").fill(guest);
await u1.getByRole("button", { name: "Enviar convite", exact: true }).click();
ok(
  "convite repetido para o mesmo e-mail é recusado (use Reenviar)",
  await vis(u1.getByText(/Já existe um convite pendente/)),
);
// resend: the old link dies, the new one works
await u1
  .getByRole("button", { name: `Reenviar convite para ${guest}` })
  .click();
await u1.waitForTimeout(1200);
const inv2 = mailLink(guest, "invite");
ok("reenviar gera um link novo", inv2 && inv2 !== inv1 && mails(guest) === 2);
const g = await ctxPage();
await g.goto(inv1, { waitUntil: "networkidle" });
ok(
  "o link antigo deixa de valer depois de reenviar",
  await vis(g.getByRole("heading", { name: "Convite expirado" })),
);
await g.goto(inv2, { waitUntil: "networkidle" });
ok(
  "o link novo mostra a organização, o papel e o e-mail",
  (await vis(g.getByRole("heading", { name: "Você foi convidado" }))) &&
    (await vis(g.getByText(/como membro/))) &&
    (await vis(g.getByText(guest))),
);
await g.getByLabel("Seu nome").fill("Pessoa Convidada");
await g.getByLabel("Senha", { exact: true }).fill(PASS);
await g.getByLabel("Repita a senha").fill(PASS);
await g.getByRole("button", { name: /Criar conta e entrar/ }).click();
ok(
  "sem aceitar os termos o convite não cria a conta",
  await vis(g.getByText("Aceite os termos para criar a conta.")),
);
await g.getByRole("checkbox").check();
await g.getByLabel("Senha", { exact: true }).fill("curta");
await g.getByLabel("Repita a senha").fill("curta");
await g.getByRole("button", { name: /Criar conta e entrar/ }).click();
ok(
  "senha curta é recusada no convite",
  await vis(g.getByText(/pelo menos 8 caracteres/).first()),
);
await g.getByLabel("Senha", { exact: true }).fill(PASS);
await g.getByLabel("Repita a senha").fill(PASS);
await g.getByRole("button", { name: /Criar conta e entrar/ }).click();
await g.waitForURL((u) => new URL(u).pathname === "/dashboard");
ok(
  "aceitar o convite cria a conta como MEMBRO, na organização certa, com o aceite dos termos",
  sql(
    `select u.role||'|'||(o.name like 'Org Renomeada%')||'|'||(u."termsAcceptedAt" is not null)||'|'||u.name from users u join organizations o on o.id=u."organizationId" where u.email='${guest}'`,
  )
    .replace(/t\|/g, "true|")
    .startsWith("MEMBER|true|true|Pessoa Convidada"),
);
ok(
  "o convite sai da lista de pendentes e não pode ser usado de novo",
  sql(
    `select count(*) from invitations where email='${guest}' and "acceptedAt" is null and "revokedAt" is null`,
  ) === "0",
);
const g2 = await ctxPage();
await g2.goto(inv2, { waitUntil: "networkidle" });
ok(
  "link de convite já usado mostra 'Convite expirado'",
  await vis(g2.getByRole("heading", { name: "Convite expirado" })),
);
// a pending invitation whose e-mail already has an account (created before the account existed)
{
  const { createHash, randomBytes } = await import("node:crypto");
  const tk = randomBytes(32).toString("base64url");
  const h = createHash("sha256").update(tk).digest("hex");
  sql(
    `insert into invitations(id,"organizationId",email,role,"tokenHash","invitedById","expiresAt") values('dup${T}',(select "organizationId" from users where email='${email("u1")}'),'${email("u2")}','MEMBER','${h}',(select id from users where email='${email("u1")}'),now()+interval '7 days')`,
  );
  await g2.goto(`${BASE}/invite?token=${tk}`, { waitUntil: "networkidle" });
  ok(
    "convite pendente para e-mail que já tem conta mostra 'Você já tem conta'",
    (await vis(g2.getByRole("heading", { name: "Você já tem conta" }))) &&
      (await vis(
        g2.getByRole("link", { name: "Entrar", exact: true }).first(),
      )),
  );
}
// member view
await g.goto(BASE + "/settings/team", { waitUntil: "networkidle" });
ok(
  "membro vê a equipe, mas sem convidar nem ações",
  (await vis(g.getByText("Só o proprietário pode convidar pessoas"))) &&
    (await g
      .getByRole("button", { name: "Enviar convite", exact: true })
      .count()) === 0 &&
    (await g.getByRole("button", { name: /Desativar/ }).count()) === 0,
);
await g.goto(BASE + "/settings/organization", { waitUntil: "networkidle" });
ok(
  "membro não edita a organização (campo e botão desabilitados)",
  (await g.getByLabel("Nome da organização").isDisabled()) &&
    (await g.getByRole("button", { name: "Salvar organização" }).isDisabled()),
);
// owner manages: role, last-owner guard, disable/enable
await u1.reload({ waitUntil: "networkidle" });
const gRow = u1.getByTestId(`member-${guest}`);
await gRow.getByRole("button", { name: "Tornar proprietário" }).click();
await u1.waitForTimeout(900);
ok(
  "proprietário promove o membro a proprietário",
  sql(`select role from users where email='${guest}'`) === "OWNER",
);
await gRow.getByRole("button", { name: "Tornar membro" }).click();
await u1.waitForTimeout(900);
ok(
  "e volta a membro",
  sql(`select role from users where email='${guest}'`) === "MEMBER",
);
await u1
  .getByTestId(`member-${email("u1")}`)
  .getByRole("button", { name: "Tornar membro" })
  .click();
ok(
  "o único proprietário não pode virar membro (proteção do último proprietário)",
  (await vis(
    u1.getByText("A organização precisa de pelo menos um proprietário ativo."),
  )) && sql(`select role from users where email='${email("u1")}'`) === "OWNER",
);
ok(
  "não há botão para desativar a si mesmo",
  (await u1
    .getByTestId(`member-${email("u1")}`)
    .getByRole("button", { name: /Desativar/ })
    .count()) === 0,
);
await gRow
  .getByRole("button", { name: `Desativar ${"Pessoa Convidada"}` })
  .click();
await u1.waitForTimeout(1000);
ok(
  "desativar marca a pessoa e apaga as sessões dela",
  sql(`select ("disabledAt" is not null) from users where email='${guest}'`) ===
    "t" &&
    sql(
      `select count(*) from sessions where "userId"=(select id from users where email='${guest}')`,
    ) === "0" &&
    (await vis(u1.getByTestId(`member-${guest}`).getByText("Desativado"))),
);
await g.goto(BASE + "/dashboard", { waitUntil: "networkidle" });
ok(
  "a pessoa desativada perde o acesso na hora",
  new URL(g.url()).pathname === "/login",
);
await login(g, guest, PASS);
ok(
  "e não consegue entrar de novo ('conta desativada')",
  await vis(g.getByText(/Esta conta foi desativada/)),
);
await gRow
  .getByRole("button", { name: `Reativar ${"Pessoa Convidada"}` })
  .click();
await u1.waitForTimeout(1000);
await login(g, guest, PASS);
await g.waitForURL((u) => new URL(u).pathname === "/dashboard");
ok("reativada, a pessoa volta a entrar", true);
// revoke + expired invitations
const g3 = `cancelado.${T}@example.com`;
await u1.getByLabel("E-mail da pessoa").fill(g3);
await u1.getByRole("button", { name: "Enviar convite", exact: true }).click();
await vis(u1.getByTestId(`invite-${g3}`));
const inv3 = mailLink(g3, "invite");
await u1.getByRole("button", { name: `Cancelar convite de ${g3}` }).click();
await u1.waitForTimeout(1000);
await g2.goto(inv3, { waitUntil: "networkidle" });
ok(
  "convite cancelado sai da lista e o link deixa de valer",
  (await u1.getByTestId(`invite-${g3}`).count()) === 0 &&
    (await vis(g2.getByRole("heading", { name: "Convite expirado" }))),
);
const g4 = `vencido.${T}@example.com`;
await u1.getByLabel("E-mail da pessoa").fill(g4);
await u1.getByRole("button", { name: "Enviar convite", exact: true }).click();
await vis(u1.getByTestId(`invite-${g4}`));
const inv4 = mailLink(g4, "invite");
sql(
  `update invitations set "expiresAt"=now()-interval '1 minute' where email='${g4}'`,
);
await g2.goto(inv4, { waitUntil: "networkidle" });
ok(
  "convite vencido (mais de 7 dias) é recusado",
  await vis(g2.getByRole("heading", { name: "Convite expirado" })),
);
await u1.reload({ waitUntil: "networkidle" });
ok(
  "na lista o convite vencido aparece como 'Expirado' e dá para reenviar",
  (await vis(u1.getByTestId(`invite-${g4}`).getByText("Expirado"))) &&
    (await u1
      .getByRole("button", { name: `Reenviar convite para ${g4}` })
      .isVisible()),
);
await u1.screenshot({ path: "shots/settings-team.png", fullPage: true });
ok("sem erros de JavaScript", errors.length === 0, errors.join(" | "));
console.log(fails === 0 ? "TODOS PASSARAM" : `${fails} FALHAS`);
await browser.close();
