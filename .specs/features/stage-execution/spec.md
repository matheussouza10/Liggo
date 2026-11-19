# Execução das fases: especificação

## Problema
O evento tem regras, fases configuradas e participantes inscritos, mas nada acontece: não há sorteio, jogos, resultados nem classificação.

## Decisões
| # | Decisão |
|---|---|
| E1 | Cada categoria é uma competição própria. A execução de uma fase é por categoria (`StageRun` = fase x categoria). |
| E2 | Tipos suportados agora: pontos corridos, grupos e mata-mata. Dupla eliminação, suíço e desempenho aparecem como "ainda não disponível". |
| E3 | Mata-mata: só jogo único. Ida e volta e melhor de N ficam bloqueados com aviso, em vez de gerar errado em silêncio. |
| E4 | Sorteio reproduzível: a semente do sorteio fica gravada. Aleatório, potes por cabeça de chave, serpentina e manual. Depois do sorteio dá para mover times de grupo até o primeiro resultado. |
| E5 | Participantes da 1ª fase = inscrições da categoria. Das fases seguintes = classificados da fase anterior, cruzados para evitar repetir o confronto do grupo (1A x 2B). |
| E6 | Classificação calculada na hora a partir dos jogos, com o desempate do evento. Confronto direto recalcula só entre os empatados. Critérios sem dado (cartões, sets detalhados, suíço) são ignorados e avisados na tela. |
| E7 | W.O. usa o placar e os pontos das regras. Limite de W.O. que elimina e anular resultados ainda não são aplicados (avisado). |
| E8 | Mata-mata não aceita empate: exige pênaltis quando as regras os permitem. O vencedor segue para o próximo jogo e o perdedor para a disputa de 3º. Corrigir um resultado só é possível se o jogo seguinte ainda não foi disputado. |
| E9 | Calendário: data e hora, local e árbitro por jogo, com agendamento automático por quadras e horários. Não permite o mesmo árbitro ou o mesmo local no mesmo horário. |
| E11 | Mata-mata em fases separadas (Quartas, Semi, Final): um mata-mata seguido de outro joga uma rodada só; os vencedores e quem tem bye seguem na ordem da chave, e o pareamento seguinte é adjacente para manter a chave. Disputa de 3º só na rodada de 2 jogos. |
| E12 | Sorteio ao vivo: a equipe, o grupo e a posição são sorteados de forma aleatória e revelados um a um (pular, acelerar, respeita movimento reduzido). A posição dentro do grupo também é sorteada no servidor; a animação só mostra o resultado já gravado. |
| E10 | O primeiro resultado trava as regras do evento (`rulesLockedAt`). Salvar regras nunca apaga fases que já têm sorteio. |

## Histórias
1. Sortear e distribuir os participantes (grupos ou chave) e ajustar a mão.
2. Gerar os jogos da fase.
3. Lançar resultado, W.O. e pênaltis; ver a classificação.
4. Concluir a fase e avançar os classificados para a próxima.
5. Agendar jogos (manual e automático) e ver o calendário.
| E13 | Confrontos do mata-mata escolhidos pelo organizador: na fase ainda sem jogos, cada jogo recebe dois times descritos pela origem ("1º do Grupo A", "Vencedor do jogo 2 (Quartas de final)"). Ao trocar um time de lugar, quem estava ali vai para o lugar dele. O automático é o cruzamento padrão e dá para voltar a ele. Só com 2, 4, 8, 16... participantes (sem byes). Fica gravado na fase (`manualPairing`) e vale também quando as regras já estão travadas. |
| E14 | Os confrontos também são definidos na configuração, por origem ("1º do Grupo A × 2º do Grupo B", "Vencedor do jogo 1 × Vencedor do jogo 3"), no editor de regras ou na própria fase enquanto ela não começou (vale com as regras travadas). Ao terminar a fase anterior, o sistema resolve a origem para os times que se classificaram e já cria a fase com esses confrontos. Se o modelo deixar de combinar com a fase anterior, o salvamento é recusado com a explicação; sem modelo, vale o automático. |

