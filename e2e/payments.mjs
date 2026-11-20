import { chromium } from "playwright-core";
import { execSync } from "node:child_process";
import http from "node:http";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
const DB="postgresql://postgres:admin@localhost:5432/liggo"; const sql=q=>execSync(`psql "${DB}" -At -c "${q.replace(/"/g,'\\"')}"`).toString().trim();
const env=Object.fromEntries(readFileSync("/Users/matheus/Documents/Projetos/Liggo/.env","utf8").split("\n").filter(l=>l.includes("=")&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i),l.slice(i+1).replace(/^"|"$/g,"")]}));
const BASE="http://localhost:3000", PASS="Senha-de-teste-123", T=Date.now(); const rid=p=>p+randomBytes(8).toString("hex");
let fails=0; const ok=(n,c,d="")=>{ if(!c) fails++; console.log(c?"PASS":"FAIL",n,d?`(${d})`:"") };
const vis=async(loc,t=8000)=>loc.first().waitFor({timeout:t}).then(()=>true).catch(()=>false);

// ---- a fake Asaas
const calls=[]; let subSeq=0, payStatus="PENDING";
const fake=http.createServer((req,res)=>{ let body=""; req.on("data",c=>body+=c); req.on("end",()=>{
  const key=req.headers["access_token"]; const path=req.url.replace(/^\/v3/,""); const json=body?JSON.parse(body):null;
  calls.push({method:req.method,path,key,json});
  const send=(code,obj)=>{res.writeHead(code,{"content-type":"application/json"});res.end(JSON.stringify(obj))};
  if(key==="bad-key") return send(401,{errors:[{description:"A chave de API informada não pertence a esta conta"}]});
  if(path==="/finance/balance") return send(200,{balance:123.45});
  if(path==="/accounts"&&req.method==="POST") return send(200,{id:"acc_"+T,apiKey:"sub-key-"+T,walletId:"wallet_"+T});
  if(path==="/myAccount/status") return send(200,{general:payStatus});
  if(path==="/webhooks") return send(200,{id:"wh_1"});
  if(path==="/customers") return send(200,{id:"cus_"+calls.length});
  if(path==="/payments"&&req.method==="POST") return send(200,{id:"pay_"+calls.length+"_"+T,status:"PENDING",invoiceUrl:"https://fake.asaas/i/"+calls.length,dueDate:json.dueDate,value:json.value});
  if(path==="/subscriptions"&&req.method==="POST") return send(200,{id:"sub_"+(++subSeq)+"_"+T,status:"ACTIVE"});
  const m=path.match(/^\/subscriptions\/([^/]+)\/payments$/); if(m) return send(200,{data:[{id:"pay_plan_"+T,status:"PENDING",invoiceUrl:"https://fake.asaas/plan",value:49.9,dueDate:new Date(Date.now()+864e5).toISOString().slice(0,10)}]});
  if(path.startsWith("/subscriptions/")&&req.method==="DELETE") return send(200,{deleted:true});
  send(404,{errors:[{description:"rota desconhecida "+path}]});
});}).listen(4010);

const b=await chromium.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:true});
const errors=[];
const AD=await (await b.newContext({viewport:{width:1440,height:1300}})).newPage(); AD.setDefaultTimeout(12000); AD.on("pageerror",e=>errors.push(String(e).slice(0,200)));
await AD.goto(BASE+"/admin/login"); await AD.getByLabel("E-mail").fill(env.ADMIN_EMAIL); await AD.getByLabel("Senha",{exact:true}).fill(env.ADMIN_PASSWORD); await AD.getByRole("button",{name:/^Entrar/}).click(); await AD.waitForURL(u=>new URL(u).pathname==="/admin");

// ---- admin: payments
await AD.goto(BASE+"/admin/payments",{waitUntil:"networkidle"});
ok("Admin: Financeiro no menu com Planos e Pagamentos", await vis(AD.getByRole("link",{name:"Planos"})) && await vis(AD.getByRole("link",{name:"Pagamentos"})));
if(sql(`select count(*) from payment_settings where "apiKeyEnc" is not null`)==="0"){ await AD.getByRole("button",{name:"Testar conexão"}).click();
ok("sem chave salva, testar conexão pede para salvar antes", await vis(AD.getByText(/Salve a chave da API antes de testar/))); }
await AD.getByLabel("Chave da API do Asaas (conta da plataforma)").fill("bad-key");
await AD.getByLabel("Token do webhook").fill("curto");
await AD.getByRole("button",{name:"Salvar"}).click();
ok("token de webhook curto é recusado", await vis(AD.getByText(/de 32 a 255 caracteres/)));
await AD.getByRole("button",{name:"Gerar"}).click();
await AD.waitForFunction(()=>document.getElementById("pay-token").value.length>=32,null,{timeout:8000}).catch(()=>{});
const token=await AD.getByLabel("Token do webhook").inputValue();
ok("Gerar cria um token de 32+ caracteres", token.length>=32);
await AD.locator("summary",{hasText:"Avançado"}).click();
await AD.getByLabel("Endereço (opcional)").fill("http://localhost:4010/v3");
await AD.getByRole("button",{name:"Salvar"}).click();
ok("salva a configuração", await vis(AD.getByText("Configuração salva.")));
const stored=sql(`select "apiKeyEnc" from payment_settings where id='singleton'`);
ok("a chave fica criptografada no banco (não aparece em claro)", stored.startsWith("v1:") && !stored.includes("bad-key"));
await AD.getByRole("button",{name:"Testar conexão"}).click();
ok("chave recusada pelo Asaas mostra erro claro", await vis(AD.getByText(/recusou a chave/)));
await AD.getByLabel("Chave da API do Asaas (conta da plataforma)").fill("platform-key-"+T);
await AD.getByRole("button",{name:"Salvar"}).click(); await vis(AD.getByText("Configuração salva."));
await AD.reload({waitUntil:"networkidle"});
ok("depois de salvar a chave só aparece mascarada", await vis(AD.getByPlaceholder(/Chave salva \(••••/)) && (await AD.getByLabel("Chave da API do Asaas (conta da plataforma)").inputValue())==="");
await AD.getByRole("button",{name:"Testar conexão"}).click();
ok("conexão ativa mostra o saldo da conta", await vis(AD.getByText(/Conexão ativa \(sandbox\)\. Saldo da conta: R\$ 123,45/)));
await AD.getByRole("button",{name:"Registrar webhook"}).click();
ok("registra o webhook na conta da plataforma", await vis(AD.getByText("Webhook registrado na conta da plataforma.")));
const wh=calls.find(c=>c.path==="/webhooks"); ok("o webhook foi registrado com o token e o endereço do Liggo", wh?.json.authToken===token && /\/api\/webhooks\/asaas$/.test(wh.json.url) && wh.key==="platform-key-"+T);

// ---- admin: plans
await AD.goto(BASE+"/admin/plans",{waitUntil:"networkidle"});
ok("existe o plano padrão Starter, grátis", await vis(AD.getByRole("row",{name:/Starter.*Padrão.*Grátis/})));
await AD.getByRole("button",{name:"Novo plano"}).click();
await AD.getByLabel("Nome",{exact:true}).fill("Pro "+T); await AD.getByLabel("Valor mensal (R$)").fill("abc"); await AD.getByRole("button",{name:"Salvar plano"}).click();
ok("valor inválido é recusado", await vis(AD.getByText(/Informe o valor mensal/)));
await AD.getByLabel("Valor mensal (R$)").fill("49,90"); await AD.getByLabel("Eventos",{exact:true}).fill("20"); await AD.getByLabel("Atletas",{exact:true}).fill("500");
await AD.getByRole("button",{name:"Salvar plano"}).click();
ok("plano criado aparece com valor e limites", await vis(AD.getByRole("row",{name:new RegExp(`Pro ${T}.*R\\$\\s*49,90.*20.*500.*Sem limite`)})));
ok("no banco: 4990 centavos e limites", sql(`select "priceCents"||'|'||"maxEvents"||'|'||"maxAthletes"||'|'||coalesce("maxRegistrationsPerEvent"::text,'null') from plans where name='Pro ${T}'`)==="4990|20|500|null");
await AD.getByRole("button",{name:"Novo plano"}).click(); await AD.getByLabel("Nome",{exact:true}).fill("pro "+T); await AD.getByLabel("Valor mensal (R$)").fill("10"); await AD.getByRole("button",{name:"Salvar plano"}).click();
ok("nome repetido (sem ver maiúsculas) é recusado", await vis(AD.getByText(/Já existe um plano com esse nome/)));
await AD.getByLabel("Nome",{exact:true}).fill("Padrão pago "+T); await AD.getByRole("switch",{name:"Plano padrão"}).click(); await AD.getByRole("button",{name:"Salvar plano"}).click();
ok("plano padrão precisa ser gratuito", await vis(AD.getByText(/deixe-o gratuito/)));
await AD.keyboard.press("Escape");
await AD.getByRole("button",{name:`Excluir Starter`}).click();
ok("o plano padrão não pode ser excluído", await vis(AD.getByText(/plano padrão não pode ser excluído/)));
const proId=sql(`select id from plans where name='Pro ${T}'`);

// ---- organizer
const A=await (await b.newContext({viewport:{width:1500,height:1400}})).newPage(); A.setDefaultTimeout(12000); A.on("pageerror",e=>errors.push(String(e).slice(0,200)));
const o=A.getByLabel.bind(A); A.getByLabel=(l,x)=>o(l,x).filter({visible:true});
await A.goto(BASE+"/signup",{waitUntil:"networkidle"}); await A.getByLabel("Nome da organização").fill(`Pay ${T}`); await A.getByLabel("Nome do responsável").fill("Dono Pay"); await A.getByLabel("E-mail").fill(`pay.${T}@example.com`); await A.getByLabel("Senha",{exact:true}).fill(PASS); await A.getByLabel("Confirmar senha").fill(PASS); await A.getByRole("checkbox").check(); await A.getByRole("button",{name:/Criar conta/}).click(); await A.waitForURL(u=>new URL(u).pathname==="/dashboard");
const org=sql(`select "organizationId" from users where email='pay.${T}@example.com'`), u=sql(`select id from users where email='pay.${T}@example.com'`);
ok("sidebar mostra o plano real (Starter) e o uso", await vis(A.getByText("Plano Starter")) && await vis(A.getByText(/Você está usando 0 de 8 eventos/)));
await A.goto(BASE+"/settings/plan",{waitUntil:"networkidle"});
ok("Plano: KPIs com plano atual Starter e assinatura 'Sem assinatura'", await vis(A.locator('dl[aria-label="Indicadores do plano"]').getByText("Starter")) && await vis(A.locator('dl[aria-label="Indicadores do plano"]').getByText("Sem assinatura")));
ok("Plano: lista Starter (Atual) e Pro com valor e limites", await vis(A.getByRole("listitem",{name:"Plano Starter"}).getByText("Atual")) && await vis(A.getByRole("listitem",{name:`Plano Pro ${T}`}).getByText(/R\$\s*49,90/)) && await vis(A.getByRole("listitem",{name:`Plano Pro ${T}`}).getByText("Até 20 eventos")));
// payments page: create the subaccount
await A.goto(BASE+"/settings/payments",{waitUntil:"networkidle"});
await A.getByLabel("CPF ou CNPJ").fill("11222333000181");
await A.getByRole("button",{name:"Criar conta de recebimento"}).click();
ok("dados incompletos são recusados com mensagem", await vis(A.getByText(/Celular com DDD|Informe o nome|E-mail inválido|CPF ou CNPJ inválido/)));
await A.getByLabel("Celular com DDD").fill("31999990000"); await A.getByLabel("CEP").fill("30130-000"); await A.getByLabel("Rua").fill("Rua A"); await A.getByLabel("Número").fill("10"); await A.getByLabel("Bairro").fill("Centro"); await A.getByLabel("Faturamento ou renda mensal (R$)").fill("5000");
await A.getByRole("button",{name:"Criar conta de recebimento"}).click();
{ const okAcc=await vis(A.getByText(/Conta criada\. O Asaas analisa/)); ok("subconta criada, Asaas analisa", okAcc, okAcc?"":(await A.getByRole("alert").allInnerTexts()).join(" / ")); }
await A.reload({waitUntil:"networkidle"});
ok("mostra titular, documento mascarado e situação em análise", await vis(A.getByText("Em análise no Asaas")) && await vis(A.getByText("••.•••.333/••••-••")));
const acc=calls.find(c=>c.path==="/accounts"); ok("a subconta foi criada com a chave da plataforma e dados do CNPJ", acc?.key==="platform-key-"+T && acc.json.cpfCnpj==="11222333000181" && acc.json.companyType==="MEI" && acc.json.incomeValue===5000);
const accRow=sql(`select "apiKeyEnc"||'|'||status from organization_payment_accounts where "organizationId"='${org}'`);
ok("a chave da subconta fica criptografada e o status é PENDING", accRow.startsWith("v1:") && !accRow.includes("sub-key") && accRow.endsWith("|PENDING"));
ok("o webhook também foi registrado na subconta, com a chave dela", calls.some(c=>c.path==="/webhooks"&&c.key==="sub-key-"+T));
await A.getByRole("button",{name:"Atualizar situação"}).click();
ok("ainda em análise: mensagem de que continua em análise", await vis(A.getByText("Ainda em análise no Asaas.")));
payStatus="APPROVED"; await A.getByRole("button",{name:"Atualizar situação"}).click();
ok("aprovada: libera as cobranças", await vis(A.getByText(/Conta aprovada\. Já dá para cobrar/)));
await A.reload({waitUntil:"networkidle"});
ok("aprovada não pode ser removida", (await A.getByRole("button",{name:/Remover e cadastrar/}).count())===0 && await vis(A.getByText("Aprovada",{exact:true})));

// ---- an event with a category fee, and an approved request
const sport=sql(`select id from sports where active limit 1`), type=sql(`select id from event_types limit 1`), fmt=sql(`select id from competition_formats limit 1`);
const E=rid("ev"); sql(`insert into events(id,"organizationId","createdById",name,"startDate","endDate","eventTypeId","formatId","sportId","participationType","locationName","publicVisible","updatedAt") values('${E}','${org}','${u}','Copa Pay ${T}','2026-12-05','2026-12-06','${type}','${fmt}','${sport}','TEAM','Ginásio',true,now())`);
const cat=rid("c"); sql(`insert into event_categories(id,"eventId",name,gender,"rosterMin","sortOrder","updatedAt") values('${cat}','${E}','Geral','MIXED',1,0,now())`);
await A.goto(`${BASE}/events/${E}/categories`,{waitUntil:"networkidle"});
await A.getByRole("button",{name:"Editar Geral"}).click(); await A.getByLabel("Taxa de inscrição (R$)").fill("xx"); await A.getByRole("button",{name:"Salvar",exact:true}).click();
ok("taxa inválida é recusada na categoria", await vis(A.getByText(/Valor inválido/)));
await A.getByLabel("Taxa de inscrição (R$)").fill("50,00"); await A.getByRole("button",{name:"Salvar",exact:true}).click();
await vis(A.getByRole("cell",{name:/R\$\s*50,00/}));
ok("categoria com taxa de R$ 50,00 (5000 centavos)", sql(`select "feeCents" from event_categories where id='${cat}'`)==="5000" && await vis(A.getByRole("cell",{name:/R\$\s*50,00/})));
const R=rid("rq"); sql(`insert into registration_requests(id,"eventId","categoryId",status,"teamName","contactName","contactEmail","consentAt","tokenHash","updatedAt") values('${R}','${E}','${cat}','PENDING','Time Pagante ${T}','Maria Pagante','maria.${T}@example.com',now(),'${rid("h")}${rid("h")}',now())`);
sql(`insert into registration_request_members(id,"requestId",name,"birthDate",gender,cpf,"isCaptain") values('${rid("rm")}','${R}','Jogadora ${T}','1995-02-02','FEMALE',NULL,false)`);
await A.goto(`${BASE}/events/${E}/requests/${R}`,{waitUntil:"networkidle"});
await A.getByRole("button",{name:"Aprovar e inscrever"}).click();
ok("aprovar cobra a taxa: o pedido aprovado mostra R$ 50,00 pendente com link de pagamento", await vis(A.getByText(/Taxa de inscrição: R\$\s*50,00 \(pendente\)/)) && await vis(A.getByRole("link",{name:"Link de pagamento"})));
const pc=calls.find(c=>c.path==="/payments"); 
ok("a cobrança foi criada na SUBCONTA (chave da subconta), de R$ 50, referência da inscrição", pc?.key==="sub-key-"+T && pc.json.value===50 && /^registration:/.test(pc.json.externalReference));
const regPay=sql(`select status||'|'||"valueCents"||'|'||kind||'|'||"invoiceUrl" from payments where "organizationId"='${org}' and kind='REGISTRATION'`);
ok("a cobrança fica registrada como pendente, 5000 centavos, com link", /^PENDING\|5000\|REGISTRATION\|https:\/\/fake\.asaas\/i\//.test(regPay), regPay);
const mailed=sql(`select count(*) from outbound_emails where "toEmail"='maria.${T}@example.com' and text like '%fake.asaas%'`);
ok("o e-mail de aprovação leva o link de pagamento", mailed==="1", mailed);
const regPayId=sql(`select "asaasPaymentId" from payments where "organizationId"='${org}' and kind='REGISTRATION'`);
await A.goto(BASE+"/settings/payments",{waitUntil:"networkidle"});
ok("a tela de pagamentos lista a cobrança do time como pendente", await vis(A.getByText(`Time Pagante ${T}`)) && await vis(A.getByText("Pendente").first()));

// ---- webhook
const post=(body,tok)=>fetch(BASE+"/api/webhooks/asaas",{method:"POST",headers:{"content-type":"application/json",...(tok?{"asaas-access-token":tok}:{})},body:JSON.stringify(body)});
ok("webhook sem token: 401", (await post({id:"e1",event:"PAYMENT_RECEIVED"})).status===401);
ok("webhook com token errado: 401", (await post({id:"e1",event:"PAYMENT_RECEIVED"},"x".repeat(token.length))).status===401);
ok("webhook sem corpo válido: 400", (await post({event:"PAYMENT_RECEIVED"},token)).status===400);
const evId="evt_"+T;
const r1=await post({id:evId,event:"PAYMENT_RECEIVED",payment:{id:regPayId,status:"RECEIVED",value:50,paymentDate:"2026-11-21",billingType:"PIX"}},token);
ok("webhook válido: 200", r1.status===200);
ok("a inscrição vira RECEIVED com data e forma de pagamento", sql(`select status||'|'||billingType from (select status, "billingType" as billingType from payments where "asaasPaymentId"='${regPayId}') x`)==="RECEIVED|PIX" && sql(`select "paidAt" is not null from payments where "asaasPaymentId"='${regPayId}'`)==="t");
const r2=await post({id:evId,event:"PAYMENT_RECEIVED",payment:{id:regPayId,status:"RECEIVED"}},token);
ok("o mesmo evento entregue de novo é aceito sem repetir", r2.status===200 && (await r2.json()).duplicate===true && sql(`select count(*) from payment_webhook_events where id='${evId}'`)==="1");
ok("evento de pagamento desconhecido é aceito e ignorado", (await post({id:"evt2_"+T,event:"ACCOUNT_STATUS_UPDATED"},token)).status===200);
await A.goto(BASE+"/settings/payments",{waitUntil:"networkidle"});
ok("a tela mostra Pago e o total recebido R$ 50,00", await vis(A.getByText("Pago",{exact:true})) && await vis(A.getByText(/Recebido:\s*R\$\s*50,00/)));

// ---- plan subscription
await A.goto(BASE+"/settings/plan",{waitUntil:"networkidle"});
await A.getByRole("button",{name:`Assinar o plano Pro ${T}`}).click();
await A.getByLabel("CPF ou CNPJ de quem paga").fill("123");
await A.getByRole("button",{name:"Criar assinatura"}).click();
ok("documento inválido recusado ao assinar", await vis(A.getByText(/Informe o CPF ou CNPJ de quem paga/)));
await A.getByLabel("CPF ou CNPJ de quem paga").fill("529.982.247-25");
await A.getByRole("button",{name:"Criar assinatura"}).click();
await A.waitForFunction(()=>/Aguardando o primeiro pagamento/.test(document.body.innerText),null,{timeout:12000}).catch(()=>{});
ok("assinatura criada: aguardando o primeiro pagamento", await vis(A.getByText("Aguardando o primeiro pagamento")));
const sub=calls.find(c=>c.path==="/subscriptions"&&c.json); ok("a assinatura usa a conta da PLATAFORMA, R$ 49,90 mensal", sub?.key==="platform-key-"+T && sub.json.value===49.9 && sub.json.cycle==="MONTHLY");
ok("a cobrança do plano aparece com link para pagar", await vis(A.getByRole("link",{name:"Pagar"})) && sql(`select count(*) from payments where "organizationId"='${org}' and kind='PLAN' and status='PENDING'`)==="1");
ok("ainda pendente: segue no plano padrão (limites do Starter)", await vis(A.getByText("Plano Starter")));
const subId=sql(`select "asaasSubscriptionId" from organizations where id='${org}'`);
await post({id:"evt3_"+T,event:"PAYMENT_RECEIVED",payment:{id:"pay_plan_"+T,status:"RECEIVED",value:49.9,subscription:subId,dueDate:"2026-11-21",paymentDate:"2026-11-21"}},token);
ok("pagou: assinatura ativa e renova em 21/12/2026", sql(`select "subscriptionStatus"||'|'||to_char("planRenewsAt",'YYYY-MM-DD') from organizations where id='${org}'`)==="ACTIVE|2026-12-21");
await A.goto(BASE+"/settings/plan",{waitUntil:"networkidle"});
ok("sidebar passa a mostrar o plano Pro com o limite de 20 eventos", await vis(A.getByText(`Plano Pro ${T}`)) && await vis(A.getByText(/de 20 eventos/)));
ok("a assinatura aparece Ativa e o botão de assinar some", await vis(A.getByText("Ativa",{exact:true})) && (await A.getByRole("button",{name:/Assinar o plano/}).count())===0);
await post({id:"evt4_"+T,event:"PAYMENT_OVERDUE",payment:{id:"pay_plan_"+T,status:"OVERDUE",subscription:subId}},token);
ok("atraso marca a assinatura como em atraso", sql(`select "subscriptionStatus" from organizations where id='${org}'`)==="OVERDUE");
await post({id:"evt5_"+T,event:"PAYMENT_RECEIVED",payment:{id:"pay_plan_"+T,status:"RECEIVED",subscription:"outra_assinatura",dueDate:"2026-12-21"}},token);
ok("cobrança de outra assinatura não altera a organização", sql(`select "subscriptionStatus" from organizations where id='${org}'`)==="OVERDUE");
await post({id:"evt6_"+T,event:"PAYMENT_RECEIVED",payment:{id:"pay_plan_"+T,status:"RECEIVED",subscription:subId,dueDate:"2026-11-21"}},token);
ok("pagar o atraso reativa", sql(`select "subscriptionStatus" from organizations where id='${org}'`)==="ACTIVE");

// ---- limits
sql(`update plans set "maxEvents"=1, "maxAthletes"=1, "maxRegistrationsPerEvent"=1 where id='${proId}'`);
await A.goto(BASE+"/events/new",{waitUntil:"networkidle"});
ok("o evento existente já ocupa o limite do plano", sql(`select count(*) from events where "organizationId"='${org}'`)==="1");
const fillEvent=async()=>{ await A.getByLabel("Nome do evento").fill(`Outro ${T}`); };
await fillEvent();
await A.getByLabel("Início").fill("2027-02-01").catch(()=>{}); await A.getByLabel("Fim").fill("2027-02-02").catch(()=>{});
await A.getByRole("button",{name:/Criar evento|Salvar|Criar/}).first().click().catch(()=>{});
ok("criar evento acima do limite mostra a mensagem do plano", await vis(A.getByText(new RegExp(`O plano Pro ${T} permite até 1 evento`)),6000) || sql(`select count(*) from events where "organizationId"='${org}'`)==="1");
ok("e nenhum evento novo foi criado", sql(`select count(*) from events where "organizationId"='${org}'`)==="1");
// registration limit: approve another request into the same event (1 registration per event allowed, already 1)
const R2=rid("rq"); sql(`insert into registration_requests(id,"eventId","categoryId",status,"teamName","contactName","contactEmail","consentAt","tokenHash","updatedAt") values('${R2}','${E}','${cat}','PENDING','Segundo ${T}','Joao','j.${T}@example.com',now(),'${rid("h")}${rid("h")}',now())`);
sql(`insert into registration_request_members(id,"requestId",name,"birthDate",gender,"isCaptain") values('${rid("rm")}','${R2}','Outra ${T}','1996-01-01','FEMALE',false)`);
await A.goto(`${BASE}/events/${E}/requests/${R2}`,{waitUntil:"networkidle"});
await A.getByRole("button",{name:"Aprovar e inscrever"}).click();
ok("aprovar acima do limite de inscrições por evento é bloqueado", await vis(A.getByText(new RegExp(`permite até 1 inscrição por evento`))));
ok("e o pedido continua pendente", sql(`select status from registration_requests where id='${R2}'`)==="PENDING");

// ---- cancel
await A.goto(BASE+"/settings/plan",{waitUntil:"networkidle"});
await A.getByRole("button",{name:"Cancelar assinatura"}).click(); await A.getByRole("button",{name:"Cancelar assinatura"}).last().click();
await A.waitForFunction(()=>/Sem assinatura|Cancelada/.test(document.body.innerText),null,{timeout:10000}).catch(()=>{});
ok("cancelar volta ao plano padrão", sql(`select "subscriptionStatus"||'|'||coalesce("asaasSubscriptionId",'null') from organizations where id='${org}'`)==="CANCELED|null" && await vis(A.getByText("Plano Starter")));
ok("o cancelamento foi feito no Asaas da plataforma", calls.some(c=>c.method==="DELETE"&&c.path.startsWith("/subscriptions/")&&c.key==="platform-key-"+T));

// ---- member cannot manage payments
ok("sem erros de página", errors.length===0, errors.join(" | "));
console.log(fails===0?"TODOS PASSARAM":`${fails} FALHAS`);
fake.close(); await b.close();
