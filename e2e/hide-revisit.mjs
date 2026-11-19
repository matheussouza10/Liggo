import { chromium } from "playwright-core";
import { execSync } from "node:child_process";
const DB = "postgresql://postgres:admin@localhost:5432/liggo";
const rows = execSync(
  `psql "${DB}" -At -c "select distinct u.email, e.id from events e join users u on u.\\"organizationId\\"=e.\\"organizationId\\" where e.\\"publicVisible\\" and (u.email like 'rv.%@example.com' or u.email like 'rv2.%@example.com' or u.email like 'rg.%@example.com' or u.email like 'hs.%@example.com' or u.email like 'pk.%@example.com' or u.email like 'pr.%@example.com' or u.email like 'dbg.%@example.com' or u.email like 'gv.%@example.com')"`,
)
  .toString()
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((l) => l.split("|"));
// one entry per event (an organization can have several test users)
const seen = new Set();
const uniq = rows.filter(([e, id]) =>
  seen.has(id) ? false : (seen.add(id), true),
);
rows.length = 0;
rows.push(...uniq);
console.log("eventos de teste visíveis a esconder:", rows.length);
const b = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
for (const [email, id] of rows) {
  const p = await (await b.newContext()).newPage();
  p.setDefaultTimeout(12000);
  await p.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await p.getByLabel("E-mail").fill(email);
  await p.getByLabel("Senha", { exact: true }).fill("Senha-de-teste-123");
  await p.getByRole("button", { name: /Entrar/ }).click();
  await p.waitForURL((u) => new URL(u).pathname === "/dashboard");
  await p.goto(`http://localhost:3000/events/${id}`, {
    waitUntil: "networkidle",
  });
  await p
    .getByRole("switch", { name: "Divulgar este evento na página pública" })
    .click();
  await p.waitForTimeout(900);
  await p.context().close();
}
await b.close();
const left = execSync(
  `psql "${DB}" -At -c "select count(*) from events e join users u on u.\\"organizationId\\"=e.\\"organizationId\\" where e.\\"publicVisible\\" and (u.email like 'rv.%@example.com' or u.email like 'rv2.%@example.com' or u.email like 'rg.%@example.com' or u.email like 'hs.%@example.com' or u.email like 'pk.%@example.com' or u.email like 'pr.%@example.com' or u.email like 'dbg.%@example.com' or u.email like 'gv.%@example.com')"`,
)
  .toString()
  .trim();
console.log("ainda visíveis:", left);
