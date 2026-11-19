# Jogo ao vivo, página pública, painel e chaveamento: tarefas

| ID | Tarefa | Estado |
|---|---|---|
| P1 | Modelo: lances (`MatchEvent`), jogo iniciado e placar ao vivo, evento público ou oculto | Concluída |
| P2 | Lógica pura dos lances (efeito no placar, descrição) | Concluída, 28 casos |
| P3 | Ações: iniciar, lançar, excluir, desfazer início, visibilidade; fim de jogo pelo resultado | Concluída |
| P4 | Tela do organizador para lançar lances (`/events/[id]/matches/[matchId]`) | Concluída |
| P5 | Chaveamento completo (`/events/[id]/stages/bracket`) | Concluída |
| P6 | Site público: `/watch`, evento, jogo em tempo real, rota JSON | Concluída |
| P7 | Painel com dados reais | Concluída |
| P8 | Verificação Playwright (48 checagens), regressão, lint, build | Concluída |

Não coberto: cronômetro automático, edição de lance (só excluir e lançar de novo), estatísticas por atleta, push, WebSocket (usa consulta a cada 3 segundos).
| P9 | Estatísticas: lance Falta, posse de bola, gráficos por jogo e gerais, páginas de estatísticas | Concluída, 21 casos de lógica e 31 checagens de navegador |

