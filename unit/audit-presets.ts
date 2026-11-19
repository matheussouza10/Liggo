// Audit: every rule preset must be valid, and each stage it asks for must be runnable. Run: npx tsx unit/audit-presets.ts
import { PRESETS } from "../src/lib/rules/presets";
import { rulesInputSchema } from "../src/lib/rules/schema";

let f=0; const ok=(n:string,c:boolean,d="")=>{ if(!c) f++; console.log(c?"PASS":"FAIL",n,d?`(${d})`:"") };
const RUNNABLE=new Set(["ROUND_ROBIN","GROUPS","SINGLE_ELIM","DOUBLE_ELIM","SWISS","PERFORMANCE"]);
for(const p of PRESETS){
  const r=rulesInputSchema.safeParse(p.rules);
  ok(`preset ${p.key}: regras válidas no esquema`,r.success,r.success?"":JSON.stringify(r.error.issues[0]));
  ok(`preset ${p.key}: todas as fases têm motor (${p.rules.stages.map(s=>s.type).join(" > ")})`,p.rules.stages.every(s=>RUNNABLE.has(s.type)));
}
console.log(f===0?"TODOS PASSARAM (presets válidos e com motor). Tamanhos de campo: veja unit/audit-matrix.ts; modalidades: unit/audit-sports.ts":`${f} FALHAS`);
