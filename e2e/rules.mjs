import { chromium } from "playwright-core";
import fs from "node:fs";
import { execSync } from "node:child_process";
const env = Object.fromEntries(fs.readFileSync("/Users/matheus/Documents/Projetos/Liggo/.env","utf8").split("\n").filter(l=>l.includes("=")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i),l.slice(i+1).replace(/^"|"$/g,"")]}));
const DB="postgresql://postgres:admin@localhost:5432/liggo"; const sql=q=>execSync(`psql "${DB}" -At -c "${q.replace(/"/g,'\\"')}"`).toString().trim();
const BASE="http://localhost:3000", PASS="Senha-de-teste-123", T=Date.now();
const res=[]; const ok=(n,c,d="")=>{res.push(c);console.log(c?"PASS":"FAIL",n,d?`(${d})`:"")};
const vis=async(loc,t=8000)=>loc.waitFor({timeout:t}).then(()=>true).catch(()=>false);
const browser=await chromium.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:true});
const errors=[];
async function user(label){
  const ctx=await browser.newContext({viewport:{width:1440,height:1000}}); const p=await ctx.newPage(); p.setDefaultTimeout(12000);
  p.on("pageerror",e=>errors.push(String(e).slice(0,160))); p.on("console",m=>{if(m.type()==="error")errors.push(m.text().slice(0,160))});
  await p.goto(BASE+"/signup",{waitUntil:"networkidle"});
  await p.getByLabel("Nome da organização").fill(`Regras ${label} ${T}`); await p.getByLabel("Nome do responsável").fill(`Pessoa ${label}`);
  await p.getByLabel("E-mail").fill(`rl.${label}.${T}@example.com`); await p.getByLabel("Senha",{exact:true}).fill(PASS); await p.getByLabel("Confirmar senha").fill(PASS);
  await p.getByRole("checkbox").check(); await p.getByRole("button",{name:/Criar conta/}).click(); await p.waitForURL(u=>new URL(u).pathname==="/dashboard");
  return p;
}
const a=await user("A"), b=await user("B");
const path=p=>new URL(p.url()).pathname;

await a.goto(BASE+"/events/new",{waitUntil:"networkidle"});
await a.getByLabel("Nome do evento").fill("Copa Regras E2E"); await a.getByLabel("Início",{exact:true}).fill("2026-08-01"); await a.getByLabel("Fim",{exact:true}).fill("2026-08-30");
await a.getByLabel("Tipo",{exact:true}).selectOption({label:"Copa"}); await a.getByLabel("Modalidade",{exact:true}).selectOption({label:"Futsal"}); await a.getByLabel("Formato",{exact:true}).selectOption({label:"Pontos Corridos"});
await a.getByRole("radio",{name:"Equipe"}).check(); await a.getByLabel("Local",{exact:true}).fill("Ginásio Regras");
await a.getByRole("button",{name:"Criar evento"}).click(); await a.waitForURL(u=>/^\/events\/[a-z0-9]+$/.test(new URL(u).pathname)&&new URL(u).pathname!=="/events/new");
const eid=path(a).split("/").pop();
ok("evento sem regras mostra o convite para configurar", await vis(a.getByText("As regras ainda não foram definidas")) && await a.getByRole("link",{name:"Configurar regras"}).first().isVisible());
await a.getByRole("link",{name:"Configurar regras"}).first().click(); await a.waitForURL(u=>new URL(u).pathname===`/events/${eid}/rules`);
await a.getByRole("heading",{name:"Regras do evento"}).waitFor();

ok("predefinição sugerida para Futsal é 'Futebol e futsal'", (await a.getByLabel("Predefinição").inputValue())==="football");
ok("mostra o selo de confiança e a fonte", await vis(a.getByText("Convenção",{exact:true}).first()) && await a.getByText(/IFAB Law 10/).isVisible());
ok("pontos sugeridos 3 / 1 / 0", (await a.getByLabel("Vitória",{exact:true}).inputValue())==="3" && (await a.getByLabel("Empate",{exact:true}).inputValue())==="1" && (await a.getByLabel("Derrota",{exact:true}).inputValue())==="0");
ok("indica que ainda não foi salvo", await a.getByText("Nada salvo ainda").isVisible());
await a.screenshot({path:"shots/rules-scoring.png",fullPage:true});

await a.getByRole("tab",{name:"Desempate"}).click();
const items=()=>a.locator("ol > li").filter({visible:true});
ok("football tem 7 critérios de desempate", (await items().count())===7);
const firstLabel=async()=> (await items().first().locator("p").first().textContent())||"";
await a.getByRole("button",{name:"Subir Saldo (gols, pontos)"}).first().click();
ok("subir um critério muda a ordem", (await firstLabel()).includes("Saldo"), await firstLabel());
await a.locator("select[aria-label='Critério para adicionar']").selectOption({label:"Fair play"}); await a.getByRole("button",{name:"Adicionar critério"}).click();
ok("adicionar critério (8 no total)", (await items().count())===8);
await a.getByRole("button",{name:"Remover Fair play"}).click();
ok("remover critério (7 no total)", (await items().count())===7);
await items().nth(1).getByRole("button",{name:"Geral"}).click();
ok("trocar escopo para Geral", await items().nth(1).getByRole("button",{name:"Geral"}).getAttribute("aria-pressed")==="true");
await a.screenshot({path:"shots/rules-tiebreakers.png",fullPage:true});

await a.getByRole("tab",{name:"W.O."}).click(); ok("aba W.O. mostra placar 3 a 0", (await a.getByLabel("Placar de quem ganha").inputValue())==="3" && (await a.getByLabel("Placar de quem dá W.O.").inputValue())==="0");
await a.getByRole("tab",{name:"Confrontos"}).click(); await a.getByRole("radio",{name:/Melhor de N/}).click();
ok("melhor de N mostra seletor (3 por padrão)", (await a.getByLabel("Melhor de",{exact:true}).inputValue())==="3");
await a.getByRole("radio",{name:/Jogo único/}).click();
await a.getByRole("tab",{name:"Fases"}).click();
ok("football tem 1 fase: pontos corridos", (await a.locator("ol > li").filter({visible:true}).count())===1 && await a.getByLabel("Nome da fase").inputValue()==="Pontos corridos");

await a.getByRole("tab",{name:"Pontuação"}).click();
await a.getByLabel("Vitória",{exact:true}).fill("");
await a.getByRole("button",{name:"Salvar regras"}).click();
ok("erro de validação do servidor aparece no campo", await vis(a.getByText("Informe um número.").first()));
ok("alerta geral de falha", await vis(a.getByText("Revise os campos destacados.")));
await a.getByLabel("Vitória",{exact:true}).fill("3");
await a.getByRole("tab",{name:"Fases"}).click();
await a.locator("select[id^=stage-type-]").first().selectOption({label:"Fase de grupos"});
await a.getByLabel("Avançam por grupo").fill("9");
await a.getByRole("button",{name:"Salvar regras"}).click();
ok("grupos: avançam mais que o tamanho é recusado", await vis(a.getByText("Não pode passar do tamanho do grupo.")));
await a.getByLabel("Avançam por grupo").fill("2");
await a.locator("select[id^=stage-type-]").first().selectOption({label:"Pontos corridos"});

await a.getByRole("button",{name:"Salvar regras"}).click(); await a.waitForURL(u=>new URL(u).pathname===`/events/${eid}`);
const body1=(await a.locator("main").textContent()).replace(/\s+/g," ");
ok("resumo no evento: pontuação, desempate, W.O., confronto e fase", ["Vitória 3, empate 1, derrota 0","1. Saldo (gols, pontos)","W.O. vale 3 a 0","Jogo único","Pontos corridos"].every(t=>body1.includes(t)), body1.slice(body1.indexOf("Regras"),body1.indexOf("Regras")+200));
ok("botão agora é Editar regras", await a.getByRole("link",{name:"Editar regras"}).isVisible());
ok("banco: 1 linha de regras e 1 fase", sql(`select count(*) from event_rules where "eventId"='${eid}'`)==="1" && sql(`select count(*) from event_stages where "eventId"='${eid}'`)==="1");

await a.goto(BASE+`/events/${eid}/rules`,{waitUntil:"networkidle"});
await a.getByRole("tab",{name:"Desempate"}).click();
ok("ao reabrir, a ordem editada foi mantida", (await firstLabel()).includes("Saldo"));
ok("ao reabrir, mostra 'Tudo salvo'", await a.getByText("Tudo salvo").isVisible());

await a.getByLabel("Predefinição").selectOption({label:"Vôlei (FIVB)"}); await a.getByRole("button",{name:"Aplicar predefinição"}).click();
ok("trocar predefinição pede confirmação", await vis(a.getByText("Substituir as regras atuais?")));
await a.getByRole("button",{name:"Manter as atuais"}).click();
ok("cancelar mantém as regras", (await firstLabel()).includes("Saldo"));
await a.getByRole("button",{name:"Aplicar predefinição"}).click(); await a.getByRole("button",{name:"Substituir"}).click();
await a.getByRole("tab",{name:"Pontuação"}).click();
ok("vôlei: sets 3 / 25 / 15", (await a.getByLabel("Sets para vencer").inputValue())==="3" && (await a.getByLabel("Pontos por set",{exact:true}).inputValue())==="25" && (await a.getByLabel("Pontos do set decisivo").inputValue())==="15");
ok("vôlei: tabela de pontos por placar com 6 faixas", (await a.getByText(/^Vitória por|^Derrota por/).count())===6);
await a.screenshot({path:"shots/rules-volleyball.png",fullPage:true});
await a.getByRole("tab",{name:"Confrontos"}).click(); ok("vôlei: melhor de 5", (await a.getByLabel("Melhor de",{exact:true}).inputValue())==="5");
await a.getByRole("tab",{name:"Fases"}).click(); ok("vôlei: 2 fases (grupos e mata-mata)", (await a.locator("ol > li:has(input[id^='stage-name'])").count())===2);
await a.screenshot({path:"shots/rules-stages.png",fullPage:true});
await a.getByRole("button",{name:"Salvar regras"}).click(); await a.waitForURL(u=>new URL(u).pathname===`/events/${eid}`);
ok("banco: regras de vôlei com 2 fases em ordem", sql(`select "scoringModel"||' '||"bestOf" from event_rules where "eventId"='${eid}'`)==="SETS 5" && sql(`select string_agg(type::text,',' order by "order") from event_stages where "eventId"='${eid}'`)==="GROUPS,SINGLE_ELIM");
ok("banco: tabela de pontos por placar guardada como JSON", sql(`select jsonb_array_length("pointsTable") from event_rules where "eventId"='${eid}'`)==="6");

await a.goto(BASE+`/events/${eid}/rules`,{waitUntil:"networkidle"});
await a.getByLabel("Predefinição").selectOption({label:"Atletismo: saltos e lançamentos"}); await a.getByRole("button",{name:"Aplicar predefinição"}).click(); await a.getByRole("button",{name:"Substituir"}).click();
ok("desempenho: mostra tentativas, finalistas e resultado final", await vis(a.getByLabel("Tentativas por atleta")) && (await a.getByLabel("Quantos avançam").inputValue())==="8" && await a.getByText("Ranking por etapas").isVisible());
await a.getByRole("tab",{name:"Desempate"}).click(); ok("desempenho: critério 'Melhores tentativas'", await a.getByText("Melhores tentativas").first().isVisible());

await b.goto(BASE+`/events/${eid}/rules`,{waitUntil:"networkidle"});
ok("outra organização recebe 404 nas regras", await vis(b.getByText(/could not be found/i).first()) && (await b.getByText("Regras do evento").count())===0);
const ctxAdmin=await browser.newContext(); const ad=await ctxAdmin.newPage(); ad.setDefaultTimeout(12000);
await ad.goto(BASE+"/admin/login"); await ad.getByLabel("E-mail").fill(env.ADMIN_EMAIL); await ad.getByLabel("Senha",{exact:true}).fill(env.ADMIN_PASSWORD); await ad.getByRole("button",{name:/^Entrar/}).click(); await ad.waitForURL(u=>new URL(u).pathname==="/admin");
await ad.goto(BASE+`/events/${eid}/rules`); await ad.waitForURL(u=>new URL(u).pathname==="/admin").then(()=>ok("admin em /events/[id]/rules vai para /admin",true)).catch(()=>ok("admin em /events/[id]/rules vai para /admin",false,path(ad)));

await browser.close();
ok("sem erros no console/página", errors.length===0, errors.join(" | ").slice(0,300));
process.exit(res.includes(false)?1:0);
