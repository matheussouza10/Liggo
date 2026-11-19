# Motores de competição: especificação e plano

Objetivo: todas as modalidades e formatos do catálogo (271 modalidades, 17 categorias, ~70 formatos) funcionando de ponta a ponta. As modalidades se reduzem a famílias, e cada família é um motor.

| Família | Exemplos | Estado |
|---|---|---|
| A. Confronto por gols/pontos | futebol, futsal, basquete, handebol | Pronta |
| B. Confronto por sets | vôlei, tênis, beach tennis, padel, tênis de mesa, badminton | **Fase 1: pronta** |
| C. Luta e duelo | judô, boxe, MMA, esgrima | **Fase 4: pronta** (ver limites) |
| D. Formatos de chave | ida e volta, melhor de N, dupla eliminação, suíço | **Fase 2: pronta** (ver limites) |
| E. Prova por desempenho | atletismo, natação, ciclismo, tiro, ginástica | **Fase 3: pronta** (ver limites) |
| F. Circuito e ranking | etapas, pontos por colocação, descarte do pior | **Fase 5: pronta** |
| G. Estratégia e e-sports | xadrez, e-sports | depende de D |

Fase 6 (em andamento): auditoria com `unit/audit-presets.ts`. Matriz "modalidade × formato" testada automaticamente.

## Fase 1: sets (decisões)
- `Match.homeScore/awayScore` guardam os **sets ganhos**; a tabela `match_sets` guarda o placar de cada set. O avanço, o vencedor e a tabela de pontos por placar (3-0, 3-1, 3-2...) continuam valendo.
- Regras do set (`src/lib/competition/sets.ts`): alvo de pontos, set decisivo com alvo próprio, diferença de 2 opcional (prolongamento termina exatamente com 2 de diferença), parada quando alguém chega aos sets para vencer.
- Classificação: colunas Sets (ganhos:perdidos) e Pontos (marcados:sofridos); desempates SET_RATIO e POINT_RATIO. W.O. segue as regras do evento e não grava sets.
- Resultado: diálogo set a set com validação por set. Ao vivo: ponto a ponto na mesa, o set fecha sozinho, desfazer ponto, confirmar resultado. Lances que pontuam (gol) ficam bloqueados em esporte de sets.
- Fora da Fase 1: tie-break por pontos corridos em tênis (games), pontuação por games/aces, tempo de set.

## Fase 2: formatos de chave (decisões)
- **Séries no mata-mata** (melhor de N e ida e volta): o confronto continua sendo uma partida da chave e seus jogos ficam em `match_games`. Melhor de N: placar do confronto = jogos vencidos, sem empate. Ida e volta: agregado de gols, depois gol fora (se ligado nas regras), depois pênaltis. Salvar jogo a jogo: o confronto só vira resultado quando decidido; antes disso guarda o andamento. Série não é lançada ao vivo.
- **Dupla eliminação** (`double-elim.ts`): de 3 a 64 participantes (campos que não são potência de 2 recebem folgas: os melhores cabeças pulam a 1ª rodada e todo jogo sem adversário, nas duas chaves, é removido, mantendo sempre 2n-2 jogos); final única ou com jogo extra; chave superior, chave inferior e final. Deve ser a última fase. Sem desenho em árvore (lista de jogos com rótulos da chave).
- **Suíço** (`swiss.ts`): número par de participantes; rodada 1 por metades (1ª metade contra 2ª); próximas rodadas geradas uma a uma, depois de todos os resultados, pareando por pontos sem repetir adversário (com retrocesso). Máximo de rodadas = participantes − 1. Desempates Buchholz, Buchholz cortado, mediano e Sonneborn-Berger.
- Limites: final com jogo extra (RESET) na dupla eliminação; campo ímpar (bye) no suíço; dupla eliminação com número de participantes que não seja potência de 2; árvore visual da dupla eliminação; série ao vivo; série em esportes de sets.

## Fase 3: provas por desempenho (decisões)
- Modelo: `performance_attempts` (por participante, número, situação OK/NM/DNF/DNS/DQ e valor em segundos, metros ou pontos). A prova não tem partidas: "Iniciar prova" apenas abre os resultados.
- Núcleo puro `performance.ts`: leitura e formatação de tempo (1:23.45), distância/altura (7,85 m) e pontos; agregação (melhor, soma, média); ranking com desempate por contagem regressiva (COUNTBACK_BEST_ATTEMPT) e sorteio (DRAW_LOTS); o que continua igual divide a posição (1, 2, 2, 4). Ordem: válidos, aguardando, sem marca, DNF, DNS, DQ.
- Finalistas: depois que todos fazem as tentativas iniciais, só os N melhores (com os empatados no corte) liberam as tentativas extras. O servidor recusa extras de quem não é finalista.
- Concluir exige todas as tentativas (incluindo extras dos finalistas) e a prova deve ser a última fase. Mostra o vencedor. Página pública mostra o ranking.
- Limites: salto em altura com barra progressiva (JUMPS_AT_FINAL_HEIGHT, TOTAL_FAILURES) não existe, vale só a melhor marca; baterias e séries eliminatórias; relevo de equipes (revezamento por soma de tempos); prova como fase intermediária (circuitos vêm na Fase 5).

## Fase 4: luta e duelo (decisões)
- Final com jogo extra na dupla eliminação (RESET): a "Final decisiva" só nasce se o campeão da chave inferior vencer a 1ª final; some ao corrigir ou limpar essa final; o campeão sai da decisiva. (O preset de e-sports usa isso.)
- Método da vitória (`matches.winMethod`: pontos, decisão, finalização, nocaute, nocaute técnico, ippon, desclassificação, abandono), pedido só em modalidades da categoria "lutas/artes marciais" (`isCombatSport`). Aparece na lista de jogos e na página pública do jogo; limpar o resultado apaga.
- Pódio dos mata-matas (`podiumOf`): campeão, vice, 3º (disputa de 3º, ou o perdedor da final da chave inferior; em lutas sem disputa de 3º, os dois perdedores das semifinais dividem o bronze).
- Categorias de peso: use uma categoria por peso (cada uma tem a sua chave). Pesagem e elegibilidade por peso não são impostas.
- Limites: repescagem do judô (perdedores para o bronze) e controle de peso no cadastro.

## Fase 5: circuito e ranking (decisões)
- Circuito é um modo da prova por desempenho: quando as regras têm tabela de pontos por colocação (`placePoints`), cada tentativa é uma **etapa** e o valor é a **posição** (1, 2, 3...). Pontos vêm da tabela (0 fora dela), as etapas sem resultado valem 0, os `dropWorst` piores são descartados, o ranking é por pontos (maior primeiro) e o desempate COUNTBACK_PLACES compara quantos 1º, 2º, 3º lugares cada um teve. Sem tentativas extras nem finalistas.
- Preset "Circuito por etapas" passou a 6 etapas (ajustável).

## Fase 6: auditoria (andamento)
`unit/audit-presets.ts` valida todos os presets contra o esquema e confere se cada fase pedida tem motor. Correção feita: suíço aceita número ímpar (folga/bye: o último colocado que ainda não folgou descansa e recebe os pontos de W.O.; a folga não conta como resultado).
Dupla eliminação agora aceita 3 a 64 times (testada por simulação de 3 a 40 times, 240 chaves aleatórias e jogada inteira pela interface com 3, 5, 6 e 7 times). `unit/audit-matrix.ts` mostra, para cada preset e tamanho de campo (2 a 40), se a fase inicial roda; as recusas restantes são legítimas e explicadas (campo pequeno demais, ex.: xadrez com 7 rodadas pede 8 jogadores, vôlei 4x4 pede 8).
Lacunas conhecidas: repescagem; série ao vivo; desenho em árvore da dupla eliminação; relevo/equipe por soma de tempos; salto em altura com barra progressiva; baterias; matriz modalidade × formato completa.

## Fase 6: matriz por modalidade (feita)
A sugestão de preset (`suggestPresetKey`) era grosseira: só raquete, lutas, e-sports, xadrez, atletismo, aquáticos/ciclismo, basquete, vôlei e futebol tinham regra própria; tudo o mais caía em "genérico" (confronto por pontos), errado para modalidades julgadas, de precisão, de força e motorizadas. Agora há 5 presets novos e a sugestão é em camadas (categoria e nome, com exceções para jogos de equipe dentro de categorias de prova):
- `judged_score` (nota dos juízes: ginástica e dança, natação artística, saltos ornamentais, patinação artística, skate park/street, BMX freestyle, adestramento, fisiculturismo, surfe...), `precision_score` (tiro, arco, boliche), `precision_low` (golfe, minigolfe, disc golf), `strength_lifts` (powerlifting, levantamento, halterofilismo paralímpico), `points_total` (decatlo, heptatlo, pentatlo moderno, CrossFit, strongman...), `circuit_points` para todas as modalidades motorizadas, `race_time` para provas por tempo (incluindo Hyrox e corrida fitness).
- `unit/audit-sports.ts` confere as 271 modalidades (expectativas para ~85 modalidades-chave, distribuição por categoria) e lista as 40 que ficam no genérico, todas disputas entre dois lados (handebol, rugby, bocha, sinuca, curling, goalball...).
Pendente: encadeamentos (grupos para mata-mata com qualquer número de classificados) e os limites listados acima.
