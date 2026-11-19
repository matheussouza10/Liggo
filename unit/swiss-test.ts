import { pairSwiss, maxSwissRounds, type SwissPlayer } from "../src/lib/competition/swiss";
import { computeStandings } from "../src/lib/competition/standings";
let f=0; const ok=(n:string,c:boolean)=>{ if(!c) f++; console.log(c?"PASS":"FAIL",n) };
const mk=(n:number,pts:number[]=[]):SwissPlayer[]=>Array.from({length:n},(_,i)=>({id:`p${i+1}`,points:pts[i]??0,rank:i+1,played:new Set<string>()}));
let r:any=pairSwiss(mk(8));
ok("rodada 1: metade de cima contra a de baixo (1x5, 2x6, 3x7, 4x8)",r.pairs.map((p:any)=>p.home+p.away).join()==="p1p5,p2p6,p3p7,p4p8");
const odd:any=pairSwiss(mk(5)); ok("campo ímpar: o último colocado folga e o resto é pareado por metades",odd.bye==="p5"&&odd.pairs.map((p:any)=>p.home+p.away).join()==="p1p3,p2p4");
ok("máximo de rodadas sem repetir: par n-1, ímpar n",maxSwissRounds(8)===7&&maxSwissRounds(7)===7&&maxSwissRounds(5)===5);
// simulate a full swiss: favorite wins; no repeats; everyone plays each round
for (const n of [4,6,8,10,16]) {
  const players=mk(n); let bad=false; const seen=new Set<string>();
  for(let round=1;round<=n-1;round++){
    const res:any=pairSwiss(players); if(res.error){ ok(`${n} jogadores, rodada ${round}: ${res.error}`,false); bad=true; break; }
    const ids=res.pairs.flatMap((p:any)=>[p.home,p.away]);
    if(new Set(ids).size!==n) bad=true;
    for(const p of res.pairs){ const key=[p.home,p.away].sort().join("-"); if(seen.has(key)) bad=true; seen.add(key);
      const h=players.find(x=>x.id===p.home)!, a=players.find(x=>x.id===p.away)!; h.played=new Set([...h.played,a.id]); a.played=new Set([...a.played,h.id]);
      const w=h.rank<a.rank?h:a; w.points+=1; }
  }
  ok(`${n} jogadores: ${n-1} rodadas sem repetir adversário nem deixar ninguém de fora`,!bad&&seen.size===n*(n-1)/2);
}
for (const n of [3,5,7,9]) {
  const players=mk(n); let bad=false; const seen=new Set<string>(); const byes=new Set<string>();
  for(let round=1;round<=n;round++){
    const res:any=pairSwiss(players); if(res.error){ ok(`${n} jogadores (ímpar), rodada ${round}: ${res.error}`,false); bad=true; break; }
    const ids=[...res.pairs.flatMap((p:any)=>[p.home,p.away]),res.bye];
    if(new Set(ids).size!==n) bad=true;
    if(byes.has(res.bye)) bad=true; byes.add(res.bye); const bp=players.find(x=>x.id===res.bye)!; bp.hadBye=true; bp.points+=1;
    for(const p of res.pairs){ const key=[p.home,p.away].sort().join("-"); if(seen.has(key)) bad=true; seen.add(key);
      const h=players.find(x=>x.id===p.home)!, a=players.find(x=>x.id===p.away)!; h.played=new Set([...h.played,a.id]); a.played=new Set([...a.played,h.id]);
      const w=h.rank<a.rank?h:a; w.points+=1; }
  }
  ok(`${n} jogadores (ímpar): ${n} rodadas, cada um folga uma vez, ninguém repete adversário`,!bad&&byes.size===n&&seen.size===n*(n-1)/2);
}
// pairing by points
const players=mk(4,[1,1,0,0]); players[0].played=new Set(["p3"]); players[2].played=new Set(["p1"]);
r=pairSwiss(players); ok("rodada 2: 1 ponto contra 1 ponto, 0 contra 0",r.pairs.map((p:any)=>[p.home,p.away].sort().join("")).sort().join()==="p1p2,p3p4");
// backtracking: p1 has played everyone except p4... force
const t=mk(4,[2,1,1,0]); t[0].played=new Set(["p2","p3"]); t[1].played=new Set(["p1"]); t[2].played=new Set(["p1"]);
r=pairSwiss(t); ok("emparelha mesmo quando o melhor par seria repetido",!!r.pairs&&r.pairs.length===2&&r.pairs.some((p:any)=>[p.home,p.away].includes("p1")&&[p.home,p.away].includes("p4")));
const stuck=mk(4,[1,1,0,0]); for(const p of stuck) p.played=new Set(stuck.filter(x=>x.id!==p.id).map(x=>x.id));
ok("sem saída sem repetir: erro explicativo",!!(pairSwiss(stuck) as any).error);
// buchholz in standings: x and y both have 1 point; x beat the strong s, y beat the weak z1
const rules={winPoints:1,drawPoints:0.5,lossPoints:0,pointsTable:null,woPointsAwarded:1,woPointsPenalty:0,tiebreakers:[{key:"POINTS",scope:"OVERALL" as const},{key:"BUCHHOLZ",scope:"OVERALL" as const},{key:"DRAW_LOTS",scope:"OVERALL" as const}]};
const g=(h:string,a:string)=>({homeId:h,awayId:a,homeScore:1,awayScore:0,walkover:false,winnerId:null});
const ms=[g("s","z1"),g("s","z2"),g("x","s"),g("y","z1")];
let always=true; for(const seed of [1,2,3,4,5,6,7,8]){ const st=computeStandings(["x","y","s","z1","z2"],ms,rules,{lotsSeed:seed}); const pos=(id:string)=>st.rows.find(r=>r.id===id)!.position; if(!(pos("x")<pos("y"))) always=false; }
ok("Buchholz desempata x (venceu o forte) sobre y (venceu o fraco), em qualquer sorteio",always);
const sb=computeStandings(["x","y","s","z1","z2"],ms,{...rules,tiebreakers:[{key:"POINTS",scope:"OVERALL"},{key:"SONNEBORN_BERGER",scope:"OVERALL"},{key:"DRAW_LOTS",scope:"OVERALL"}]},{lotsSeed:3});
ok("Sonneborn-Berger também coloca x acima de y",sb.rows.find(r=>r.id==="x")!.position<sb.rows.find(r=>r.id==="y")!.position);
ok("BUCHHOLZ, CUT1, MEDIAN e SONNEBORN não são mais ignorados",computeStandings(["a","b"],[],{...rules,tiebreakers:[{key:"BUCHHOLZ_CUT1",scope:"OVERALL"},{key:"MEDIAN_BUCHHOLZ",scope:"OVERALL"},{key:"SONNEBORN_BERGER",scope:"OVERALL"}]}).ignored.length===0);
console.log(f===0?"TODOS PASSARAM":`${f} FALHAS`);
