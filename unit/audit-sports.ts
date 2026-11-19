// Audit: every active sport gets a sensible preset. Needs the local database. Run: npx tsx unit/audit-sports.ts
import { execSync } from "node:child_process";
import { PRESET_BY_KEY, suggestPresetKey } from "../src/lib/rules/presets";

const DB=process.env.DATABASE_URL?.replace(/\?.*$/,"")||"postgresql://postgres:admin@localhost:5432/liggo";
const rows=execSync(`psql "${DB}" -At -F '|' -c "select c.name, s.name from sports s join sport_categories c on c.id=s.\\"categoryId\\" where s.active order by c.name, s.name"`).toString().trim().split("\n").map(l=>l.split("|") as [string,string]);
let f=0; const ok=(n:string,c:boolean,d="")=>{ if(!c) f++; console.log(c?"PASS":"FAIL",n,d?`(${d})`:"") };

ok(`todas as ${rows.length} modalidades ativas têm sugestão de um preset existente`, rows.every(([c,s])=>!!PRESET_BY_KEY[suggestPresetKey(s,c)]));
const expect:Record<string,string>={
  "Natação":"race_time","Maratona":"race_time","Salto em Altura":"athletics_height","Salto com Vara":"athletics_height","Arremesso de Peso":"athletics_distance","Salto em Distância":"athletics_distance","Decatlo":"points_total","Heptatlo":"points_total",
  "Ginástica Artística":"judged_score","Ginástica Rítmica":"judged_score","Dança Esportiva":"judged_score","Saltos Ornamentais":"judged_score","Natação Artística":"judged_score","Patinação Artística":"judged_score","Skate Park":"judged_score","Adestramento":"judged_score","Surfe":"judged_score",
  "Golfe":"precision_low","Minigolfe":"precision_low","Disc Golf":"precision_low","Tiro Esportivo":"precision_score","Tiro com Arco":"precision_score","Boliche":"precision_score",
  "Powerlifting":"strength_lifts","Levantamento de Peso Olímpico":"strength_lifts","Halterofilismo Paralímpico":"strength_lifts","CrossFit":"points_total","Strongman":"points_total",
  "Fórmula":"circuit_points","Kart":"circuit_points","Rally":"circuit_points","Motocross":"circuit_points",
  "Futebol":"football","Futsal":"football","Futebol de Cegos":"football","Basquete":"basketball_fiba","Basquete em Cadeira de Rodas":"basketball_fiba","Vôlei":"volleyball_fivb","Vôlei de Praia":"volleyball_fivb","Vôlei Sentado":"volleyball_fivb",
  "Judô":"combat","Boxe":"combat","MMA":"combat","Esgrima em Cadeira de Rodas":"combat","Parataekwondo":"combat",
  "Tênis":"racket_sets","Tênis de Mesa":"racket_sets","Badminton":"racket_sets","Tênis em Cadeira de Rodas":"racket_sets","Parabadminton":"racket_sets",
  "Xadrez":"chess_swiss","Damas":"chess_swiss","Go":"chess_swiss","Dominó":"generic","Cubo Mágico (Speedcubing)":"race_time",
  "Polo Aquático":"generic","Roller Derby":"generic","Curling":"generic","Goalball":"generic","Polo Equestre":"generic","Handebol":"generic","Rugby":"generic","Hóquei no Gelo":"generic",
  "Esqui Alpino":"race_time","Biatlo":"race_time","Triatlo":"race_time","Ciclismo de Estrada":"race_time","Canoagem":"race_time","Corrida de Aventura":"race_time","Orientação":"race_time",
};
const byName=new Map(rows.map(([c,s])=>[s,c] as const));
for(const [sport,preset] of Object.entries(expect)){
  const cat=byName.get(sport); if(!cat){ ok(`modalidade "${sport}" existe no catálogo`,false); continue; }
  const got=suggestPresetKey(sport,cat); ok(`${cat} > ${sport}: ${preset}`,got===preset,got===preset?"":`recebeu ${got}`);
}
console.log("\nDistribuição por categoria (preset: quantidade):");
const dist=new Map<string,Map<string,number>>();
for(const [c,s] of rows){ const k=suggestPresetKey(s,c); const m=dist.get(c)??new Map(); m.set(k,(m.get(k)??0)+1); dist.set(c,m); }
for(const [c,m] of dist) console.log(` ${c}: ${[...m.entries()].map(([k,v])=>`${k} ${v}`).join(", ")}`);
const generic=rows.filter(([c,s])=>suggestPresetKey(s,c)==="generic").map(([c,s])=>`${s} (${c})`);
console.log(`\nModalidades no preset genérico (confronto por pontos; confira se são mesmo disputas entre dois lados): ${generic.length}`); console.log(" "+generic.join(", "));
console.log(f===0?"\nTODOS PASSARAM":`\n${f} FALHAS`);
