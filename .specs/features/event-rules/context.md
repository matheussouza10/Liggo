# Decisões adotadas: regras da competição

O usuário pediu para começar a aplicar o roadmap sem responder às 5 perguntas da pesquisa (`docs/research/regras-de-competicao.md`). Foram adotadas as recomendações abaixo. **Todas são ajustáveis; confirmar com o usuário.**

| # | Pergunta | Decisão adotada |
|---|---|---|
| D1 | Regras livres ou predefinidas? | Predefinições por modalidade que **copiam** valores para o evento; o organizador edita tudo depois |
| D2 | Quantas fases na primeira versão? | O modelo guarda uma lista ordenada de fases; a tela deixa montar até 4 fases de tipos já suportados |
| D3 | Placar final ou parciais? | Esta feature só guarda a CONFIGURAÇÃO (ex.: sets para vencer). O registro de placar e parciais vem com as partidas (feature 5) |
| D4 | Travar regras após o 1º jogo? | A coluna `rulesLockedAt` existe; o travamento automático depende das partidas (feature 5). Hoje as regras ficam sempre editáveis |
| D5 | Descarte do pior resultado | Campo `dropWorst` em circuitos, tratado como requisito de produto (sem fonte oficial) |

Visual: componentes shadcn e acabamento premium (pedido do usuário).
Fontes: apenas regras CONFIRMADAS na pesquisa viram valores de predefinição com citação; o resto é marcado como "convenção".
