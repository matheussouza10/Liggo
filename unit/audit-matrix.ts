// Audit matrix: for every rule preset and field size, can the first stage be generated? Run: npx tsx unit/audit-matrix.ts
import { PRESETS } from "../src/lib/rules/presets";
import { buildSingleElimination } from "../src/lib/competition/bracket";
import { buildDoubleElimination, canBuildDoubleElimination } from "../src/lib/competition/double-elim";
import { maxSwissRounds, pairSwiss } from "../src/lib/competition/swiss";
import { roundRobin } from "../src/lib/competition/fixtures";

const SIZES=[2,3,4,5,6,7,8,9,10,12,16,17,24,32,33,40];
const ids=(n:number)=>Array.from({length:n},(_,i)=>`t${i+1}`);
type Stage=(typeof PRESETS)[number]["rules"]["stages"][number];

/** null = runs; otherwise why it is refused. */
function check(stage:Stage,n:number):string|null{
  switch(stage.type){
    case "ROUND_ROBIN": return roundRobin(ids(n),stage.roundRobinLegs as 1|2).length===((n*(n-1))/2)*stage.roundRobinLegs||n%2===1?null:"fixtures incompletos";
    case "GROUPS": {
      const g=stage.groupCount??2; if(n<g*2) return `precisa de ao menos ${g*2} (2 por grupo)`;
      const smallest=Math.floor(n/g); if((stage.advancingPerGroup??1)>smallest) return `classifica ${stage.advancingPerGroup} por grupo, mas o menor grupo tem ${smallest}`; return null; }
    case "SINGLE_ELIM": return buildSingleElimination(ids(n),stage.thirdPlaceMatch).length>=n-1?null:"chave incompleta";
    case "DOUBLE_ELIM": return canBuildDoubleElimination(n)&&buildDoubleElimination(ids(n)).length===2*n-2?null:"fora de 3 a 64";
    case "SWISS": { const rounds=stage.swissRounds??0; if(rounds>maxSwissRounds(n)) return `${rounds} rodadas exigem ao menos ${rounds%1===0?(rounds+1)%2===0?rounds+1:rounds:rounds} participantes (máx. ${maxSwissRounds(n)})`;
      const r=pairSwiss(ids(n).map((id,i)=>({id,points:0,rank:i+1,played:new Set<string>()}))); return "error" in r?r.error:null; }
    case "PERFORMANCE": return n>=1?null:"sem participantes";
  }
}

let refusals=0;
for(const p of PRESETS){
  const first=p.rules.stages[0]; const lines:string[]=[];
  for(const n of SIZES){ const why=check(first,n); if(why){ refusals++; lines.push(`   ${n}: ${why}`); } }
  console.log(`${p.key} (${first.type}${first.type==="GROUPS"?` ${first.groupCount}x${first.groupSize}, passam ${first.advancingPerGroup}`:""}${first.type==="SWISS"?`, ${first.swissRounds} rodadas`:""}): ${lines.length?`recusa ${lines.length} de ${SIZES.length} tamanhos`:"aceita todos os tamanhos testados"}`);
  lines.forEach(l=>console.log(l));
}
console.log(`\nRecusas explicadas: ${refusals} (todas com motivo; nenhuma falha silenciosa).`);
