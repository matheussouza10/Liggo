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
    .first()
    .waitFor({ timeout: t })
    .then(() => true)
    .catch(() => false);
const b = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const errors = [];
const A = await (
  await b.newContext({ viewport: { width: 1440, height: 1500 } })
).newPage();
A.setDefaultTimeout(12000);
A.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
const o = A.getByLabel.bind(A);
A.getByLabel = (l, x) => o(l, x).filter({ visible: true });
await A.goto(BASE + "/signup", { waitUntil: "networkidle" });
await A.getByLabel("Nome da organização").fill(`Sets ${T}`);
await A.getByLabel("Nome do responsável").fill("Dono Sets");
await A.getByLabel("E-mail").fill(`st.${T}@example.com`);
await A.getByLabel("Senha", { exact: true }).fill(PASS);
await A.getByLabel("Confirmar senha").fill(PASS);
await A.getByRole("checkbox").check();
await A.getByRole("button", { name: /Criar conta/ }).click();
await A.waitForURL((u) => new URL(u).pathname === "/dashboard");
const org = sql(
    `select "organizationId" from users where email='st.${T}@example.com'`,
  ),
  u = sql(`select id from users where email='st.${T}@example.com'`);
const sport = sql(
    `select id from sports where name ilike '%futsal%' and active limit 1`,
  ),
  type = sql(`select id from event_types limit 1`),
  fmt = sql(`select id from competition_formats limit 1`);
const E = rid("ev");
sql(
  `insert into events(id,"organizationId","createdById",name,"startDate","endDate","eventTypeId","formatId","sportId","participationType","locationName","publicVisible","updatedAt") values('${E}','${org}','${u}','Copa Vôlei ${T}','2026-12-05','2026-12-06','${type}','${fmt}','${sport}','TEAM','Ginásio',true,now())`,
);
const cat = rid("c");
sql(
  `insert into event_categories(id,"eventId",name,gender,"rosterMin","sortOrder","updatedAt") values('${cat}','${E}','Geral','MIXED',1,0,now())`,
);
const FORMAT = process.argv[2] || "BEST_OF";
const tb = JSON.stringify([
  { key: "POINTS", scope: "OVERALL" },
  { key: "DRAW_LOTS", scope: "OVERALL" },
]);
sql(
  `insert into event_rules(id,"eventId","scoringModel","winPoints","drawPoints","lossPoints","allowDraw",tiebreakers,"woScoreFor","woScoreAgainst","woPointsAwarded","matchFormat","bestOf","awayGoals",penalties,"updatedAt") values('${rid("r")}','${E}','POINTS',3,1,0,false,'${tb}'::jsonb,3,0,3,'${FORMAT}',${FORMAT === "BEST_OF" ? 3 : "null"},${FORMAT === "HOME_AWAY" ? "true" : "false"},true,now())`,
);
const st = rid("s");
sql(
  `insert into event_stages(id,"eventId","order",name,type,"roundRobinLegs","thirdPlaceMatch","grandFinalMode",seeding,"updatedAt") values('${st}','${E}',1,'Dupla eliminação','DOUBLE_ELIM',1,false,'RESET','RANDOM',now())`,
);
const run = rid("ru");
sql(
  `insert into stage_runs(id,"stageId","categoryId",status,"drawSeed","drawMode","updatedAt") values('${run}','${st}','${cat}','DRAWN',1,'RANDOM',now())`,
);
const names = ["Time A", "Time B", "Time C", "Time D"],
  en = [];
for (const [i, n] of names.entries()) {
  const t = rid("tm"),
    r = rid("rg"),
    e = rid("en");
  en.push(e);
  sql(
    `insert into teams(id,"organizationId",name,"updatedAt") values('${t}','${org}','${n} ${T}',now())`,
  );
  sql(
    `insert into registrations(id,"eventId","categoryId","teamId","createdById","updatedAt") values('${r}','${E}','${cat}','${t}','${u}',now())`,
  );
  sql(
    `insert into stage_entries(id,"stageRunId","registrationId",position,seed) values('${e}','${run}','${r}',${i},${i + 1})`,
  );
}
const poll = async (fn, t = 8000) => {
  const end = Date.now() + t;
  while (Date.now() < end) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
};
const dlg = () => A.getByRole("dialog");
const nm = (l) => `Time ${l} ${T}`;
const go = async () => {
  await A.goto(`${BASE}/events/${E}/stages/${st}`, {
    waitUntil: "networkidle",
  });
};
const play = async (h, a, sh, sa, last = false) => {
  await go();
  const btn = A.getByRole("button", {
    name: new RegExp(`^Resultado de Time ${h} .* x Time ${a} `),
  });
  await (last ? btn.last() : btn.first()).click();
  await dlg().waitFor();
  await dlg().locator("#score-home").fill(String(sh));
  await dlg().locator("#score-away").fill(String(sa));
  await dlg().getByRole("button", { name: "Salvar resultado" }).click();
  await dlg().waitFor({ state: "detached" });
};
const count = () =>
  sql(`select count(*) from matches where "stageRunId"='${run}'`);
// 3 participants now work (a bye); generate, check, then undo and restore the 4th
const gone = en[3];
const goneReg = sql(
  `select "registrationId" from stage_entries where id='${gone}'`,
);
sql(`delete from stage_entries where id='${gone}'`);
await go();
await A.getByRole("button", { name: "Gerar jogos" }).click();
await vis(A.getByRole("tab", { name: "Jogos" }));
ok(
  "com 3 participantes a dupla eliminação gera 4 jogos (2n-2), com folga para o cabeça 1",
  count() === "4",
);
await go();
await A.getByRole("button", { name: "Desfazer jogos" }).click();
await poll(async () => count() === "0");
sql(
  `insert into stage_entries(id,"stageRunId","registrationId",position,seed) values('${gone}','${run}','${goneReg}',3,4)`,
);
await go();
await A.getByRole("button", { name: "Gerar jogos" }).click();
await vis(A.getByRole("tab", { name: "Jogos" }));
ok(
  "com a final com jogo extra, gerar cria 6 jogos (a decisiva só nasce se for preciso)",
  count() === "6",
);
ok(
  "os rótulos distinguem as chaves",
  sql(
    `select count(*) from matches where "stageRunId"='${run}' and label ilike '%chave superior%'`,
  ) === "3" &&
    sql(
      `select count(*) from matches where "stageRunId"='${run}' and label ilike '%chave inferior%'`,
    ) === "2" &&
    sql(
      `select count(*) from matches where "stageRunId"='${run}' and label='Final'`,
    ) === "1",
);
await go();
await A.getByRole("tab", { name: "Chave" }).click();
ok(
  "a aba Chave mostra a árvore em três seções: chave superior, chave inferior e final",
  (await vis(A.getByRole("region", { name: "Chave superior", exact: true }))) &&
    (await vis(
      A.getByRole("region", { name: "Chave inferior", exact: true }),
    )) &&
    (await vis(A.getByRole("region", { name: "Final", exact: true }))),
);
ok(
  "a chave superior lista os confrontos com os times (A x D e B x C)",
  (
    await A.getByRole("region", {
      name: "Chave superior",
      exact: true,
    }).innerText()
  ).includes("Time A") &&
    (
      await A.getByRole("region", {
        name: "Chave superior",
        exact: true,
      }).innerText()
    ).includes("Time C"),
);
await A.getByRole("tab", { name: "Jogos" }).click();
ok(
  "1ª rodada: cabeça 1 contra 4 e 2 contra 3",
  (await vis(
    A.getByRole("button", {
      name: new RegExp(`^Resultado de Time A .* x Time D `),
    }),
  )) &&
    (await vis(
      A.getByRole("button", {
        name: new RegExp(`^Resultado de Time B .* x Time C `),
      }),
    )),
);
await play("A", "D", 2, 0);
await play("B", "C", 2, 0);
ok(
  "os perdedores da 1ª rodada vão para a chave inferior (D x C) e os vencedores para a final da superior (A x B)",
  (await vis(
    A.getByRole("button", {
      name: new RegExp(`^Resultado de Time D .* x Time C `),
    }),
  )) &&
    (await vis(
      A.getByRole("button", {
        name: new RegExp(`^Resultado de Time A .* x Time B `),
      }),
    )),
);
await play("A", "B", 1, 0);
ok(
  "o perdedor da final da superior (B) cai para a final da inferior, esperando o vencedor de D x C",
  sql(
    `select count(*) from matches where "stageRunId"='${run}' and label='Final da chave inferior' and "awayEntryId"='${en[1]}'`,
  ) === "1",
);
await play("D", "C", 0, 1);
ok(
  "C vence D e segue para a final da inferior contra B",
  await vis(
    A.getByRole("button", {
      name: new RegExp(`^Resultado de Time C .* x Time B `),
    }),
  ),
);
ok(
  "D foi eliminado (2 derrotas): não aparece em jogos pendentes",
  sql(
    `select count(*) from matches where "stageRunId"='${run}' and status='SCHEDULED' and ("homeEntryId"='${en[3]}' or "awayEntryId"='${en[3]}')`,
  ) === "0",
);
await play("C", "B", 1, 2);
const decisive = () =>
  sql(
    `select count(*) from matches where "stageRunId"='${run}' and label='Final decisiva'`,
  );
ok("antes da final, a final decisiva não existe", decisive() === "0");
// B (losers bracket champion, away) wins the first grand final
await play("A", "B", 0, 1, true);
ok(
  "o campeão da chave inferior vence a 1ª final: nasce a Final decisiva com os dois times",
  (await poll(async () => decisive() === "1")) &&
    sql(
      `select count(*) from matches where "stageRunId"='${run}' and label='Final decisiva' and "homeEntryId"='${en[0]}' and "awayEntryId"='${en[1]}'`,
    ) === "1",
);
ok("ainda não há campeão", (await A.getByText(/Campeão:/).count()) === 0);
await go();
await A.getByRole("button", { name: "Concluir fase" })
  .isDisabled()
  .then((d) => ok("concluir fica desabilitado com a decisiva pendente", d));
// correcting the first final removes the extra game
await go();
await A.getByRole("button", {
  name: new RegExp(`^Resultado de Time A .* x Time B `),
})
  .nth(1)
  .click();
await dlg().waitFor();
await dlg().getByRole("button", { name: "Limpar resultado" }).click();
await dlg().waitFor({ state: "detached" });
ok("limpar o resultado da 1ª final apaga a decisiva", decisive() === "0");
await play("A", "B", 3, 0, true);
ok(
  "se o campeão da chave superior vence a 1ª final, não há decisiva e ele é campeão",
  decisive() === "0" && (await vis(A.getByText(/Campeão: Time A/))),
);
// reopen and let B win again, then A wins the decisive
await go();
await A.getByRole("button", {
  name: new RegExp(`^Resultado de Time A .* x Time B `),
})
  .last()
  .click();
await dlg().waitFor();
await dlg().locator("#score-home").fill("1");
await dlg().locator("#score-away").fill("2");
await dlg().getByRole("button", { name: "Salvar resultado" }).click();
await dlg().waitFor({ state: "detached" });
ok(
  "corrigir para vitória do B cria a decisiva e tira o campeão",
  (await poll(async () => decisive() === "1")) &&
    (await A.getByText(/Campeão:/).count()) === 0,
);
await go();
const dec = A.getByRole("region", { name: "Final decisiva" }).getByRole(
  "button",
  { name: /^Resultado de/ },
);
await dec.click();
await dlg().waitFor();
await dlg().locator("#score-home").fill("2");
await dlg().locator("#score-away").fill("1");
await dlg().getByRole("button", { name: "Salvar resultado" }).click();
await dlg().waitFor({ state: "detached" });
ok(
  "A vence a final decisiva e é o campeão",
  await vis(A.getByText(/Campeão: Time A/)),
);
const blocked = await (async () => {
  await go();
  await A.getByRole("button", {
    name: new RegExp(`^Resultado de Time A .* x Time B `),
  })
    .nth(1)
    .click();
  await dlg().waitFor();
  await dlg().locator("#score-home").fill("3");
  await dlg().locator("#score-away").fill("0");
  await dlg().getByRole("button", { name: "Salvar resultado" }).click();
  return await vis(dlg().getByText(/A final decisiva já foi disputada/));
})();
ok("com a decisiva jogada, não dá para corrigir a 1ª final", blocked);
await dlg().getByRole("button", { name: "Cancelar" }).click();
await dlg().waitFor({ state: "detached" });
await go();
await A.getByRole("button", { name: "Concluir fase" }).click();
ok(
  "concluir a fase encerra a dupla eliminação com final com jogo extra",
  await poll(
    async () =>
      sql(`select status from stage_runs where id='${run}'`) === "DONE",
  ),
);
sql(`update events set "publicVisible"=false where id='${E}'`);
ok("sem erros de JavaScript", errors.length === 0, errors.join(" | "));
console.log(fails === 0 ? "TODOS PASSARAM" : `${fails} FALHAS`);
await b.close();
