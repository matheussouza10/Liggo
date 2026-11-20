import { formatMoney, parseMoney, centsToInput } from "../src/lib/payments/money";
import { limitMessage, limitOf, usageText } from "../src/lib/payments/limits";
let f=0; const ok=(n:string,c:boolean)=>{ if(!c) f++; console.log(c?"PASS":"FAIL",n) };
ok("dinheiro em reais formatado",formatMoney(4990).replace(/\s/g," ")==="R$ 49,90"&&formatMoney(0).replace(/\s/g," ")==="R$ 0,00"&&formatMoney(123456).replace(/\s/g," ")==="R$ 1.234,56");
ok("leitura: 49,90 | 49.90 | R$ 1.234,56 | 50 | 1.500",parseMoney("49,90")===4990&&parseMoney("49.90")===4990&&parseMoney("R$ 1.234,56")===123456&&parseMoney("50")===5000&&parseMoney("1.500")===150000);
ok("leitura recusa lixo, negativo e centavos demais",parseMoney("")===null&&parseMoney("abc")===null&&parseMoney("-5")===null&&parseMoney("1,999")===null&&parseMoney("1.2.3")===null);
ok("zero é válido (plano grátis) e o limite é de R$ 1 milhão",parseMoney("0")===0&&parseMoney("1000000")===100000000&&parseMoney("1000001")===null);
ok("centavos voltam para o campo",centsToInput(4990)==="49,90"&&centsToInput(0)==="0,00");
const plan={name:"Starter",maxEvents:8,maxAthletes:200,maxRegistrationsPerEvent:null};
ok("limite não atingido: sem mensagem; sem limite: nunca bloqueia",limitMessage(plan,"events",7)===null&&limitMessage(plan,"registrations",99999)===null);
ok("limite atingido: mensagem com o nome do plano e o número",/O plano Starter permite até 8 eventos/.test(limitMessage(plan,"events",8)!)&&/até 200 atletas/.test(limitMessage(plan,"athletes",200)!));
ok("singular quando o limite é 1",/até 1 evento\./.test(limitMessage({...plan,maxEvents:1},"events",1)!));
ok("limitOf escolhe o campo certo",limitOf(plan,"events")===8&&limitOf(plan,"athletes")===200&&limitOf(plan,"registrations")===null);
ok("uso: '6 de 8' com 75%; sem limite mostra sem porcentagem",usageText(6,8).text==="6 de 8"&&usageText(6,8).percent===75&&usageText(6,null).percent===null&&usageText(9,8).percent===100);
console.log(f===0?"TODOS PASSARAM":`${f} FALHAS`);
import { documentKind, isValidCnpj, maskDocument } from "../src/lib/payments/documents";
{
  let g=0; const t=(n:string,c:boolean)=>{ if(!c) g++; console.log(c?"PASS":"FAIL",n) };
  t("CNPJ válido (11.222.333/0001-81) e inválidos",isValidCnpj("11.222.333/0001-81")&&!isValidCnpj("11.222.333/0001-82")&&!isValidCnpj("11111111111111")&&!isValidCnpj("123"));
  t("tipo do documento: CPF, CNPJ ou nenhum",documentKind("529.982.247-25")==="CPF"&&documentKind("11222333000181")==="CNPJ"&&documentKind("123")===null&&documentKind("111.111.111-11")===null);
  t("máscara não expõe o número",maskDocument("529.982.247-25")==="•••.982.247-••"&&maskDocument("11222333000181")==="••.•••.333/••••-••"&&!maskDocument("11222333000181").includes("11222"));
  if(g) f+=g;
}
console.log(f===0?"TODOS PASSARAM":`${f} FALHAS`);
import { isPaid, renewalAfter, statusFromEvent, subscriptionAfter, tokenMatches } from "../src/lib/payments/webhook";
{
  let g=0; const t=(n:string,c:boolean)=>{ if(!c) g++; console.log(c?"PASS":"FAIL",n) };
  t("eventos do Asaas viram status de cobrança",statusFromEvent("PAYMENT_RECEIVED")==="RECEIVED"&&statusFromEvent("PAYMENT_CONFIRMED")==="CONFIRMED"&&statusFromEvent("PAYMENT_OVERDUE")==="OVERDUE"&&statusFromEvent("PAYMENT_DELETED")==="CANCELED"&&statusFromEvent("PAYMENT_REFUNDED")==="REFUNDED");
  t("eventos que não acompanhamos viram nulo",statusFromEvent("ACCOUNT_STATUS_UPDATED")===null&&statusFromEvent("")===null);
  t("pago é confirmado ou recebido",isPaid("RECEIVED")&&isPaid("CONFIRMED")&&!isPaid("PENDING")&&!isPaid("OVERDUE"));
  t("token: igual passa; diferente, vazio e de tamanho diferente não",tokenMatches("abc","abc")&&!tokenMatches("abc","abd")&&!tokenMatches("","abc")&&!tokenMatches(null,"abc")&&!tokenMatches("abc","abcd"));
  t("renovação: mesmo dia do mês seguinte",renewalAfter(new Date("2026-11-20")).toISOString().slice(0,10)==="2026-12-20");
  t("renovação: 31/01 vira 28/02 e dezembro vira janeiro",renewalAfter(new Date("2026-01-31")).toISOString().slice(0,10)==="2026-02-28"&&renewalAfter(new Date("2026-12-15")).toISOString().slice(0,10)==="2027-01-15");
  t("pagamento ativa, atraso marca atraso, mas cancelado e sem plano não mudam",subscriptionAfter("PENDING","RECEIVED")==="ACTIVE"&&subscriptionAfter("ACTIVE","OVERDUE")==="OVERDUE"&&subscriptionAfter("OVERDUE","CONFIRMED")==="ACTIVE"&&subscriptionAfter("CANCELED","RECEIVED")==="CANCELED"&&subscriptionAfter("NONE","RECEIVED")==="NONE"&&subscriptionAfter("PENDING","PENDING")==="PENDING");
  if(g) f+=g;
}
console.log(f===0?"TODOS PASSARAM":`${f} FALHAS`);
