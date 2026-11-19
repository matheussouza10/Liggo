import { aggregate, isCumulative, rankPerformance, rowStatus, type Attempt, type PerfConfig } from "../src/lib/competition/performance";
let f=0; const ok=(n:string,c:boolean)=>{ if(!c) f++; console.log(c?"PASS":"FAIL",n) };
const relay:PerfConfig={metric:"TIME",bestIs:"LOWEST",attempts:4,finalists:null,extraAttempts:null,aggregation:"SUM"};
const L=(n:number,v:number|null,s:Attempt["status"]="OK"):Attempt=>({number:n,status:s,value:v});
ok("revezamento reconhecido (tempo, soma, menor vence); corrida comum não",isCumulative(relay)&&!isCumulative({...relay,aggregation:"BEST"})&&!isCumulative({...relay,metric:"DISTANCE"}));
const full=[L(1,50),L(2,51.5),L(3,49),L(4,50.5)];
ok("soma das 4 pernas: 201",aggregate(relay,full)===201);
ok("com pernas faltando não há resultado e a equipe aguarda",aggregate(relay,[L(1,50),L(2,51)])===null&&rowStatus(relay,[L(1,50),L(2,51)])==="PENDING");
ok("equipe completa fica OK",rowStatus(relay,full)==="OK");
ok("perna DNF anula a equipe (DNF)",rowStatus(relay,[L(1,50),L(2,null,"DNF"),L(3,49),L(4,50)])==="DNF"&&aggregate(relay,[L(1,50),L(2,null,"DNF")])===null);
ok("perna DNS = DNS; qualquer perna DQ = desclassificada",rowStatus(relay,[L(1,50),L(2,null,"DNS")])==="DNS"&&rowStatus(relay,[L(1,50),L(2,null,"DQ")])==="DQ");
const r=rankPerformance(relay,[
 {id:"a",attempts:full},
 {id:"b",attempts:[L(1,49),L(2,50),L(3,49),L(4,50)]},
 {id:"c",attempts:[L(1,40),L(2,41)]},
 {id:"d",attempts:[L(1,40),L(2,null,"DNF"),L(3,40),L(4,40)]},
]);
ok("ranking: B (198), A (201), depois quem ainda aguarda (C), depois DNF (D); parcial rápido não passa à frente",r.map(x=>x.id).join("")==="bacd"&&r[0].value===198&&r[2].status==="PENDING");
ok("posições: 1, 2, 3 e 4",r.map(x=>x.position).join("")==="1234");
const e=rankPerformance(relay,[{id:"x",attempts:full},{id:"y",attempts:full}],{tiebreakers:[]});
ok("soma igual sem critério: empate",e[0].position===1&&e[1].position===1&&e[0].tied);
console.log(f===0?"TODOS PASSARAM":`${f} FALHAS`);
