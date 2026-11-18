# Liggo — Formatos de competição e disputa

> Cadastro de formatos da Liggo. Separe o formato principal das configurações de confrontos, provas e séries.

## Formatos principais
- Pontos Corridos
- Todos Contra Todos (Round Robin)
- Turno Único
- Turno e Returno
- Mata-mata (Eliminatória Simples)
- Eliminatória Dupla (Double Elimination)
- Fase de Grupos
- Grupos + Mata-mata
- Sistema Suíço
- Escada (Ladder)
- Chaves (Bracket)
- Ranking Acumulado
- Circuito por Etapas
- Classificatória + Final
- Repescagem
- Desafio Individual
- Desafio por Equipes

## Estrutura de grupos e chaves
- Grupo Único
- Múltiplos Grupos
- Chave Única
- Chave Superior e Inferior
- Cabeças de Chave
- Sorteio Livre
- Chaveamento por Ranking
- Cruzamento entre Grupos
- Rodízio de Confrontos

## Configurações de confrontos
- Partida Única
- Ida e Volta
- Melhor de 3 (Bo3)
- Melhor de 5 (Bo5)
- Melhor de 7 (Bo7)
- Série Personalizada
- Agregado de Pontos ou Gols
- Prorrogação
- Desempate por Pênaltis
- Golden Score / Morte Súbita

## Formatos de provas e desempenho
- Melhor Tempo
- Menor Tempo
- Maior Distância
- Maior Pontuação
- Menor Pontuação
- Melhor Marca
- Melhor de N Tentativas
- Soma de Tentativas
- Média de Tentativas
- Baterias Classificatórias
- Semifinais + Final
- Contrarrelógio
- Revezamento
- Séries por Categoria
- Pontuação por Etapa
- Descarte de Pior Resultado

## Configurações transversais
- Número de participantes por grupo
- Número de classificados por grupo
- Quantidade de fases
- Quantidade de rodadas
- Quantidade de confrontos por rodada
- Critérios de desempate
- Critérios de avanço
- Critérios de eliminação
- Pontuação por resultado
- Regras de W.O.
- Regras de repescagem
- Regras de classificação geral

---

## Campos sugeridos para o cadastro

- `codigo`
- `nome`
- `descricao`
- `categoria`
- `tipoParticipacao` (individual, dupla, equipe)
- `permiteGrupos`
- `permiteRepescagem`
- `ativo`
- `ordemExibicao`

**Observação:** opções como “Melhor de 3”, “Ida e Volta” e “Prorrogação” são regras de confrontos, não formatos principais. Modele-as separadamente para permitir combinações entre modalidades e eventos.
