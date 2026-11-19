# Motores de competição: especificação e plano

Objetivo: todas as modalidades e formatos do catálogo (271 modalidades, 17 categorias, ~70 formatos) funcionando de ponta a ponta. As modalidades se reduzem a famílias, e cada família é um motor.

| Família | Exemplos | Estado |
|---|---|---|
| A. Confronto por gols/pontos | futebol, futsal, basquete, handebol | Pronta |
| B. Confronto por sets | vôlei, tênis, beach tennis, padel, tênis de mesa, badminton | **Fase 1: pronta** |
| C. Luta e duelo | judô, boxe, MMA, esgrima | Fase 4 |
| D. Formatos de chave | ida e volta, melhor de N, dupla eliminação, suíço | **Fase 2: pronta** (ver limites) |
| E. Prova por desempenho | atletismo, natação, ciclismo, tiro, ginástica | Fase 3 |
| F. Circuito e ranking | etapas, pontos por colocação, descarte do pior | Fase 5 |
| G. Estratégia e e-sports | xadrez, e-sports | depende de D |

Fase 6: matriz "modalidade × formato" testada automaticamente.

## Fase 1: sets (decisões)
- `Match.homeScore/awayScore` guardam os **sets ganhos**; a tabela `match_sets` guarda o placar de cada set. O avanço, o vencedor e a tabela de pontos por placar (3-0, 3-1, 3-2...) continuam valendo.
- Regras do set (`src/lib/competition/sets.ts`): alvo de pontos, set decisivo com alvo próprio, diferença de 2 opcional (prolongamento termina exatamente com 2 de diferença), parada quando alguém chega aos sets para vencer.
- Classificação: colunas Sets (ganhos:perdidos) e Pontos (marcados:sofridos); desempates SET_RATIO e POINT_RATIO. W.O. segue as regras do evento e não grava sets.
- Resultado: diálogo set a set com validação por set. Ao vivo: ponto a ponto na mesa, o set fecha sozinho, desfazer ponto, confirmar resultado. Lances que pontuam (gol) ficam bloqueados em esporte de sets.
- Fora da Fase 1: tie-break por pontos corridos em tênis (games), pontuação por games/aces, tempo de set.

## Fase 2: formatos de chave (decisões)
- **Séries no mata-mata** (melhor de N e ida e volta): o confronto continua sendo uma partida da chave e seus jogos ficam em `match_games`. Melhor de N: placar do confronto = jogos vencidos, sem empate. Ida e volta: agregado de gols, depois gol fora (se ligado nas regras), depois pênaltis. Salvar jogo a jogo: o confronto só vira resultado quando decidido; antes disso guarda o andamento. Série não é lançada ao vivo.
- **Dupla eliminação** (`double-elim.ts`): 4, 8, 16 ou 32 participantes, com final única; chave superior, chave inferior e final. Deve ser a última fase. Sem desenho em árvore (lista de jogos com rótulos da chave).
- **Suíço** (`swiss.ts`): número par de participantes; rodada 1 por metades (1ª metade contra 2ª); próximas rodadas geradas uma a uma, depois de todos os resultados, pareando por pontos sem repetir adversário (com retrocesso). Máximo de rodadas = participantes − 1. Desempates Buchholz, Buchholz cortado, mediano e Sonneborn-Berger.
- Limites: final com jogo extra (RESET) na dupla eliminação; campo ímpar (bye) no suíço; dupla eliminação com número de participantes que não seja potência de 2; árvore visual da dupla eliminação; série ao vivo; série em esportes de sets.
