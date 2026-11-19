# Execução das fases: tarefas

| ID | Tarefa |
|---|---|
| S1 | Schema e migração (StageRun, StageGroup, StageEntry, Match); proteger o salvamento das regras |
| S2 | Núcleo puro: PRNG, sorteio, rodízio, chave, classificação, horários, com testes |
| S3 | Queries e ações (sortear, mover, gerar jogos, resultado, avançar, agendar) |
| S4 | Telas: visão das fases, sorteio/participantes, jogos, classificação, chave |
| S5 | Calendário da organização |
| S6 | Verificação Playwright, build, docs e memória |

Status: S1 a S6 concluídas. Verificação: 60 casos do núcleo (sorteio, rodízio, chave, classificação, horários), 12 do cruzamento de classificados, 11 do planejamento de rodada única, 45 checagens Playwright do ciclo completo (grupos, mata-mata, W.O., pênaltis, agendamento, travas, isolamento), 14 da cadeia Grupos, Quartas, Semi e Final e 14 da animação do sorteio, regressão das suítes de regras (34) e inscrições (23), lint e build.

Não coberto: dupla eliminação, suíço, desempenho, ida e volta e melhor de N no mata-mata (bloqueado com aviso), limite de W.O. que elimina e anulação de resultados, critérios de desempate sem dado (cartões, sets, Buchholz).
