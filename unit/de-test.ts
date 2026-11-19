import { buildDoubleElimination, canBuildDoubleElimination } from "../src/lib/competition/double-elim";
let f=0; const ok=(n:string,c:boolean,d="")=>{ if(!c) f++; console.log(c?"PASS":"FAIL",n,d?`(${d})`:"") };
ok("aceita de 3 a 64 participantes",canBuildDoubleElimination(3)&&canBuildDoubleElimination(64)&&!canBuildDoubleElimination(2)&&!canBuildDoubleElimination(65));
ok("tamanho inválido retorna vazio",buildDoubleElimination(["a","b"]).length===0);
let allOk=true; const failed:number[]=[];
for(let n=3;n<=40;n++){
  const order=Array.from({length:n},(_,i)=>`t${i+1}`); const plan=buildDoubleElimination(order);
  let bad="";
  if(plan.length!==2*n-2) bad+=` jogos=${plan.length}(esperado ${2*n-2})`;
  const byKey=new Map(plan.map(m=>[m.key,m]));
  const slots=new Map<string,number>();
  for(const m of plan){ for(const t of [m.next,m.loser]) if(t){ if(!byKey.has(t.key)) bad+=` destino-inexistente:${t.key}`; const k=t.key+":"+t.slot; slots.set(k,(slots.get(k)??0)+1); } }
  if([...slots.values()].some(v=>v>1)) bad+=" vaga-duplicada";
  // every slot of every match is either a seeded team or fed exactly once
  for(const m of plan){ for(const s of ["HOME","AWAY"] as const){ const seeded=(s==="HOME"?m.home:m.away); const fed=slots.has(m.key+":"+s); if(!!seeded===fed) bad+=` vaga-sem-origem:${m.key}:${s}`; } }
  // simulate: favorite (lower seed number) always wins
  const home=new Map<string,string|null>(), away=new Map<string,string|null>(); plan.forEach(m=>{home.set(m.key,m.home);away.set(m.key,m.away)});
  const losses=new Map<string,number>(order.map(t=>[t,0])); let champion="";
  for(const m of [...plan].sort((a,b)=>a.round-b.round||a.position-b.position)){
    const h=home.get(m.key), a=away.get(m.key); if(!h||!a){ bad+=` jogo-incompleto:${m.key}`; continue; }
    const w=Number(h.slice(1))<Number(a.slice(1))?h:a, l=w===h?a:h; losses.set(l,(losses.get(l)??0)+1);
    if(m.next) (m.next.slot==="HOME"?home:away).set(m.next.key,w); else champion=w;
    if(m.loser) (m.loser.slot==="HOME"?home:away).set(m.loser.key,l);
  }
  if(champion!=="t1") bad+=` campeão=${champion}`;
  if(![...losses.entries()].every(([t,v])=>t==="t1"?v===0:v===2)) bad+=" derrotas-irregulares";
  if(bad){ allOk=false; failed.push(n); console.log("   n="+n+bad); }
}
ok("de 3 a 40 times: 2n-2 jogos, destinos válidos, todas as vagas alimentadas, campeão t1 sem derrotas e os demais com exatamente 2",allOk,failed.join(","));
// upsets: random results must never leave a game incomplete nor produce a team with more than 2 losses
let upsetsOk=true;
for(let n of [3,5,6,7,9,11,13,17,23,31,33,40]){
  for(let seed=1;seed<=20;seed++){
    let x=seed*7919; const rnd=()=>{ x=(x*1103515245+12345)&0x7fffffff; return x/0x7fffffff; };
    const order=Array.from({length:n},(_,i)=>`t${i+1}`); const plan=buildDoubleElimination(order);
    const home=new Map<string,string|null>(), away=new Map<string,string|null>(); plan.forEach(m=>{home.set(m.key,m.home);away.set(m.key,m.away)});
    const losses=new Map<string,number>(order.map(t=>[t,0])); let champion="";
    for(const m of [...plan].sort((a,b)=>a.round-b.round||a.position-b.position)){
      const h=home.get(m.key), a=away.get(m.key); if(!h||!a){ upsetsOk=false; break; }
      const w=rnd()<0.5?h:a, l=w===h?a:h; losses.set(l,(losses.get(l)??0)+1);
      if(m.next) (m.next.slot==="HOME"?home:away).set(m.next.key,w); else champion=w;
      if(m.loser) (m.loser.slot==="HOME"?home:away).set(m.loser.key,l);
    }
    if(!champion||[...losses.values()].some(v=>v>2)) upsetsOk=false;
  }
}
ok("resultados aleatórios (240 chaves): sempre há campeão e ninguém perde mais de 2 vezes",upsetsOk);
const p6=buildDoubleElimination(["a","b","c","d","e","f"]);
ok("6 times: os cabeças 1 e 2 pulam a 1ª rodada (só 2 jogos na chave superior inicial)",p6.filter(m=>m.round===1).length===2&&p6.filter(m=>m.round===1).every(m=>!["a","b"].includes(m.home!)&&!["a","b"].includes(m.away!)));
const p3=buildDoubleElimination(["a","b","c"]);
ok("3 times: 4 jogos (a, 2 x 3, final da superior, final da inferior, final) = 2n-2",p3.length===4&&p3.filter(m=>m.label==="Final").length===1);
console.log(f===0?"TODOS PASSARAM":`${f} FALHAS`);
