# Regras de competição configuráveis: pesquisa de fontes primárias

Data da pesquisa: 2026-11-18. Objetivo: embasar o modelo de dados de regras por evento do Liggo.
Legenda: **[CONFIRMADO]** = lido no texto da fonte primária. **[INCERTO]** = só fonte secundária ou não consegui abrir a fonte primária. **[NÃO VERIFICADO]** = não pesquisado a fundo ou bloqueado; não use como fato.

## Resumo executivo

1. Pontuação de tabela NÃO é universal: futebol (3-1-0 é convenção), basquete FIBA (2/1/0, W.O. = 0), vôlei FIVB (3/2/1/0 conforme o placar de sets), rúgbi (4/2/0 + bônus). O modelo precisa de uma "tabela de pontos por resultado" configurável, não só 3 colunas V/E/D.
2. Para vôlei e rúgbi os pontos dependem do PLACAR (sets ou tries/diferença), então a regra precisa de "faixas de resultado" (ex.: vitória por 3-2, derrota por 2-3), não apenas V/E/D.
3. Desempate é uma LISTA ORDENADA de critérios de um catálogo fechado. Toornament expõe ~40 identificadores, Challonge limita a 3 em `tie_breaks`. Critérios têm escopo "geral" ou "confronto direto".
4. W.O. tem 3 parâmetros independentes: placar atribuído (FIBA 20-0; FIVB 0-3 e 25-0 por set), pontos de tabela para quem deu W.O. (FIBA 0; FIVB 0) e limite que gera exclusão (FIBA: 2º W.O. no torneio = desclassificação e anulação dos resultados).
5. Formatos de confronto vêm de um conjunto pequeno: melhor de N, ida e volta (agregado), jogo único, sets fixos. Toornament: `no_sets`, `single_set`, `home_and_away`, `best_of`, `fixed_sets`, `fixed_sets_advanced`.
6. Desempate de mata-mata é cadeia ordenada (gol fora, prorrogação, pênaltis). O IFAB Law 10 só PERMITE esses três procedimentos e deixa a escolha para o regulamento da competição.
7. Provas por desempenho (World Athletics) usam: melhor resultado, nº de tentativas (3 + 3 adicionais para os 8 melhores), desempate por 2º/3º melhor resultado (saltos/lançamentos) ou contagem de falhas e barra (saltos verticais). Sentido do melhor valor (menor tempo vs. maior distância) é parâmetro obrigatório.
8. Plataformas (Challonge, Toornament, start.gg) separam "fase/estágio" de "formato da partida". Modelar o evento como lista ORDENADA de fases, cada uma com seu tipo e suas regras, é o padrão do mercado.
9. Ranking por etapas (F1) é tabela posição->pontos, possivelmente por faixa de distância cumprida, com desempate por contagem de 1º, 2º, 3º lugares. Descarte do pior resultado: **não confirmado** em fonte primária.
10. Recomendação: colunas relacionais para o que é comum e consultável; lista ordenada (JSON validado por zod) para desempate e tabelas de pontos; presets por modalidade.

## 1. Pontuação por resultado (pontos corridos e grupos)

| Modalidade | Regra | Fonte | Status |
|---|---|---|---|
| Basquete (FIBA) | 2 pontos de classificação por jogo ganho, 1 por jogo perdido (inclusive por "default"), 0 por jogo perdido por forfeit | FIBA Official Basketball Rules 2026, Apêndice D.1.1 (https://assets.fiba.basketball/image/upload/documents-corporate-fiba-official-rules-2026-v1-0.pdf) | CONFIRMADO |
| Vôlei (FIVB) | 3-0 ou 3-1 = 3 pts; 3-2 = 2 pts; derrota 2-3 = 1 pt; derrota 0-3 ou 1-3 = 0; W.O. = 0 pts (25-0, 25-0, 25-0) | FIVB Women's World Championship 2025, Competition Regulations v2, art. 2.4 (https://images.volleyballworld.com/image/upload/fl_attachment/fivb-prd/ke69yngfcqxfyj4t5ztp.pdf) e Men's (https://images.volleyballworld.com/image/upload/fl_attachment/fivb-prd/xygejzx5otwslijoycgj.pdf) | CONFIRMADO (regulamento da competição, não as Regras de Jogo) |
| Vôlei: regra de jogo | Set normal a 25 e 5º set a 15 pontos, com diferença mínima de 2 (partida ganha por quem vencer 3 sets) | FIVB Official Volleyball Rules 2025-2028 (versão FR), regra 6.3 (https://www.fivb.com/wp-content/uploads/2025/06/FIVB-Volleyball_Rules2025_2028-FR-v04.pdf). O texto lido menciona "5ème set décisif en 15 points" e diferença de 2; o "25" do set normal está em outra regra que não localizei | CONFIRMADO (5º set); 25 pts = INCERTO nesta leitura |
| Rúgbi (World Rugby, torneio U20 2025) | Vitória 4; empate 2; 4+ tries = +1; derrota por 7 ou menos = +1; derrota por mais de 7 = 0; não comparecimento = 0 | World Rugby U20 Championship 2025, Tournament Rules (https://resources.worldrugby-rims.pulselive.com/worldrugby/document/2025/07/07/915cd984-e226-4589-ab7e-e64dba0ffb5a/Tournament-Rules-2025.pdf) | CONFIRMADO (regulamento de UM torneio, não regra universal) |
| Futebol 3-1-0 | Vitória 3, empate 1, derrota 0 | Não consegui abrir fonte primária (FIFA/CBF/UEFA). A IFAB Law 10 só define que vence quem marca mais gols e que o empate é permitido (https://www.thefa.com/-/media/files/thefaportal/governance-docs/laws-of-the-game/2025-26/law-10---determining-the-outcome-of-a-match.ashx) | 3-1-0: NÃO VERIFICADO em fonte primária (é convenção amplamente conhecida) |
| Handebol, tênis de mesa, badminton | Pontos por resultado | IHF, ITTF e BWF não foram consultados | NÃO VERIFICADO |

### Como as plataformas configuram pontos

| Plataforma | Campos reais | Fonte |
|---|---|---|
| Challonge API v2.1 (`group_stage_options` e `round_robin_options`) | `pts_for_match_win` (padrão 1), `pts_for_match_tie` (padrão 0.5), `pts_for_game_win` (padrão 0), `pts_for_game_tie` (padrão 0), `pts_for_bye` (só suíço, padrão 1). Valem para suíço e para round robin com `ranked_by = "custom"`. Os `rr_pts_for_*` estão marcados como deprecated. NÃO existe campo de pontos por derrota | https://challonge.apidog.io/create-tournament-23619740e0.md |
| Toornament API v2 | Pontos são calculados por "calculators" no `settings.calculators` de `pools`, `league` e `swiss`. Identificadores documentados: `match_set_forfeit_penalty_points` (opção `forfeit`, inteiro, negativo = penalidade), `match_set_score_points`, `match_set_rank_points` (opção `scale`), `match_set_property_scale_points`, `match_set_property_factor_points`. A página lida NÃO documenta pontos por vitória/empate/derrota | https://developer.toornament.com/v2/core-concepts/match/formats e https://developer.toornament.com/v2/core-concepts/stages |
| start.gg | Não encontrei campo de pontos por vitória na API; ela expõe fase (`Phase`) com `bracketType`, `groupCount`, `numSeeds`, `phaseOrder`, `isExhibition` | https://smashgg-schema.netlify.app/reference/phase.doc | CONFIRMADO só para Phase |

## 2. Critérios de desempate

| Fonte | Ordem documentada | Status |
|---|---|---|
| FIBA, Apêndice D.1.3-D.1.4 (todas as competições round-robin) | 1) Confronto(s) direto(s) entre os empatados (campanha de V/D entre eles); 2) saldo de pontos nos jogos entre eles; 3) pontos marcados nos jogos entre eles; 4) saldo de pontos em todos os jogos do grupo; 5) pontos marcados em todos os jogos do grupo; 6) ranking FIBA (seleções) ou sorteio (demais). Se algum time já foi classificado em qualquer etapa, o procedimento recomeça do início para os restantes | CONFIRMADO (https://assets.fiba.basketball/image/upload/documents-corporate-fiba-official-rules-2026-v1-0.pdf) |
| FIVB, Mundial feminino 2025, art. 2.4/2.5 (ranking combinado) | Nº de vitórias; pontos de partida; quociente de sets (sets ganhos / sets perdidos); quociente de pontos; resultado da última partida entre os empatados (com 3+ times, considera só jogos entre eles); ranking mundial FIVB | CONFIRMADO |
| World Rugby U20 2025 | Pontos de partida; (a) confronto direto; (b) saldo de pontos; (c) saldo de tries; (d) mais pontos marcados; (e) mais tries marcados; (f) sorteio (moeda) | CONFIRMADO |
| FIA F1 2026, A2.1.4 (campeonato) | Maior número de 1º lugares, depois de 2º, de 3º etc.; se persistir, mesma regra nos resultados de classificação | CONFIRMADO (https://www.fia.com/system/files/documents/fia_2026_f1_regulations_-_section_a_general_provisions_-_iss_02_-_2026-02-27.pdf) |
| FIFA Copa 2026 | Confronto direto (pontos, saldo, gols) antes do saldo geral, depois fair play e ranking FIFA | INCERTO: só imprensa; não abri o regulamento FIFA |
| UEFA Champions 2025/26, art. 17 | Saldo, gols marcados, gols fora, vitórias... coeficiente | INCERTO: o site documents.uefa.com não abriu |
| FIDE, Tie-Break Regulations (vigentes desde 2024-08-01) | Catálogo, sem ordem recomendada: Buchholz (BH), Buchholz Cut-1, Sonneborn-Berger (SB), Direct Encounter (DE), Number of Wins (WIN), Number of Games Won (WON), Progressive Scores (PS), Koya System (KS), TPR etc. A ordem é escolhida pelo organizador (art. 4.1) | CONFIRMADO (https://handbook.fide.com/chapter/TieBreakRegulations082024) |

Observação para o modelo: as federações mostram DOIS escopos (confronto direto e geral) e a regra de **reinício do procedimento** (FIBA D.1.4, FIVB "somente jogos entre eles") que um catálogo de critérios deve suportar como flag.

### Como as plataformas expõem desempate

| Plataforma | Campo e valores | Fonte |
|---|---|---|
| Challonge | `ranked_by` (`match wins`, `game wins`, `game win percentage`, `points scored`, `points difference`, `custom`) e `tie_breaks` (lista, máximo 3, valores: `match wins`, `game wins`, `game win percentage`, `game w/l difference`, `points scored`, `points difference`, `match wins vs tied`, `median buchholz` só suíço) | https://challonge.apidog.io/create-tournament-23619740e0.md |
| Toornament | `settings.tiebreakers` (array) com identificadores: `points_overall`, `match_result_overall`, `match_forfeit_overall`, `match_score_for_overall`, `match_score_against_overall`, `match_score_difference_overall`, `match_set_result_win_overall`, `match_set_score_difference_overall` e demais variantes `match_set_*`; as mesmas com sufixo `_head_to_head`; suíço: `buchholz`, `median_buchholz`, `cumulative`, `cumulative_opponents`; outros: `played_least`, `played_most`, `manual`, `random` | https://developer.toornament.com/v2/core-concepts/structure/rankings/tiebreakers |
| start.gg | Não encontrei campo de tiebreak na página de Phase | https://smashgg-schema.netlify.app/reference/phase.doc |

## 3. W.O. (walkover/forfeit)

| Fonte | Regra | Status |
|---|---|---|
| FIBA art. 20 (forfeit) | Perde por forfeit o time que não tem 5 jogadores prontos 15 min após o horário, impede o jogo ou se recusa a jogar. Placar 20-0 para o adversário; 0 pontos de classificação. Em série ida e volta (agregado) e melhor de 3, forfeit em qualquer jogo perde a série. **2º forfeit no torneio = desclassificação e anulação de todos os jogos do time** | CONFIRMADO (rules 2026, mesma URL) |
| FIBA art. 21 (default, falta de jogadores durante o jogo) | Se o time beneficiado está à frente, vale o placar do momento; senão 2-0. O time em "default" recebe 1 ponto de classificação | CONFIRMADO |
| FIBA App. D.5.1 | Time que se retira ou dá 2º forfeit tem todos os resultados anulados em todas as fases; critérios de reclassificação: campanha V/D, saldo, pontos marcados, ranking | CONFIRMADO |
| FIVB regras de jogo 6.4.1 (FR) | Time que se recusa a jogar ou não comparece perde 0-3 no jogo e 0-25 em cada set (regra do vôlei) | CONFIRMADO (https://www.fivb.com/wp-content/uploads/2025/06/FIVB-Volleyball_Rules2025_2028-FR-v04.pdf) |
| FIVB Mundial 2025, 7.3 | Time sem 6 jogadores: W.O. automático 3-0; W.O. = 0 pontos | CONFIRMADO |
| World Rugby U20 2025 | "No show" = 0 pontos | CONFIRMADO (placar atribuído não consta no trecho) |
| Challonge | Não achei campo de W.O. no create-tournament (v2.1). O estado de partida é alterado em Change Match State (https://challonge.apidog.io/change-match-state-23619748e0.md); NÃO li a página | NÃO VERIFICADO |
| Toornament | Penalidade em pontos por forfeit (`match_set_forfeit_penalty_points` com `forfeit`) e critérios `match_forfeit_overall`, `match_set_forfeit_overall`. Em suíço, o help afirma que a desistência remove o participante das próximas rodadas | CONFIRMADO (API); help INCERTO (resultado de busca, não abri a página: https://help.toornament.com/structures/introducing-the-swiss-system) |

## 4. Formatos

### Elementos configuráveis encontrados

| Formato | Parâmetros documentados | Fonte |
|---|---|---|
| Pontos corridos / round robin | Challonge: `rr_iterations` (1 turno único, 2 turno e returno, 3 triplo); Toornament `league`/`pools`: `size`, `nb_groups`, `pairing_method` (`manual`, `standard`, `double_standard`) | Challonge e Toornament (URLs acima) |
| Fase de grupos + mata-mata | Challonge: `group_stage_enabled`, `group_stage_options.stage_type` (`round robin`, `single elimination`, `double elimination`, `swiss`), `group_size` (padrão 4), `participant_count_to_advance_per_group` (padrão 2). Toornament: `pools`, `bracket_groups` (`bracket_type` single/double), `arrival` e `departure` (`adjacent`, `sequential`, `snake`, `branch`, `mirror`) que definem como os times entram nos grupos e como saem para a fase seguinte (cruzamentos) | idem |
| Eliminatória simples | Toornament `single_elimination`: `size`, `third_decider` (disputa de 3º), `threshold`. Challonge: `consolation_matches_target_rank` (padrão 3) | idem |
| Dupla eliminação | Toornament `double_elimination`: `size`, `skip_round1`, `grand_final` (`none`, `simple`, `double` = jogo de reset se o vencedor da chave inferior vencer). Challonge `double_elimination_options`: `split_participants`, `grand_finals_modifier` (`""` = vencedor da inferior precisa vencer duas vezes, `skip`, `single match`) | idem |
| Suíço | Challonge `swiss_rounds` (0 ou omitido = mínimo para o tamanho do grupo), `pts_for_bye`, `median buchholz`; Toornament `swiss`: `pairing_method` (`manual`, `p_balanced`, `p_opposite`, `p_random`), tiebreakers `buchholz`, `median_buchholz`, `cumulative`. FIDE: ordem inicial por rating, depois título, depois alfabética (art. 2.2); número de rodadas NÃO está no documento lido; jogador que não joga uma rodada marcada previamente não é emparelhado e marca zero salvo regra do torneio (art. 3.3) | CONFIRMADO (https://handbook.fide.com/chapter/GeneralHandlingRulesForSwissTournaments202602) |
| Chaves customizadas | Toornament `custom_bracket` (`size`, `schema`) | Toornament |
| Duelos tipo "todos contra todos por pontos" (FFA) | Toornament `simple`, `ffa_single_elimination` (`match_size`, `match_winners`, `score_intent` highest/lowest, `score_type` points/duration), `ffa_league` | Toornament |
| Circuito/ranking por etapas | start.gg `BracketType` inclui `CIRCUIT`, `RACE`, `ROUND_ROBIN`, `SWISS`, `SINGLE_ELIMINATION`, `DOUBLE_ELIMINATION`, `EXHIBITION`, `CUSTOM_SCHEDULE`, `MATCHMAKING`, `ELIMINATION_ROUNDS` (sem descrições na página) | https://smashgg-schema.netlify.app/reference/brackettype.doc |
| Escada/ladder, repescagem, descarte do pior resultado | Não encontrei documentação de plataforma nem regulamento primário. Challonge tem consolation matches só para elim. simples/dupla | NÃO VERIFICADO |

### Seed e sorteio
- Challonge: `seeding_options.hide_seeds` e `sequential_pairings` ("quando true, regras de seed são ignoradas e participantes entram de cima para baixo"); endpoint "Randomize Participants" (https://challonge.apidog.io/randomize-participants-23619756e0.md). **CONFIRMADO** (lista do llms.txt + schema).
- Toornament: `auto_placement_enabled` (boolean) no estágio, colocação automática pela ordem de criação (https://developer.toornament.com/v2/doc/organizer_stages).
- start.gg: `Phase.numSeeds`, `seeds`, exemplo "update-phase-seeding" na documentação (https://developer.start.gg/docs/intro, só lista de links). **INCERTO** quanto aos campos.
- Rúgbi U20 2025: seeds da fase seguinte vêm da posição no grupo e depois de pontos de competição, com os mesmos desempates exceto confronto direto. **CONFIRMADO** (World Rugby, URL acima).
- FIDE: seed inicial por rating. **CONFIRMADO** (art. 2.2).

## 5. Confrontos em série e desempate de mata-mata

| Tema | Regra | Fonte | Status |
|---|---|---|---|
| Procedimentos de desempate no futebol | Quando o regulamento exige vencedor, só são permitidos: regra do gol fora, dois tempos iguais de prorrogação de até 15 min cada, e pênaltis; combinação permitida | IFAB Laws of the Game 2025/26, Law 10, seção 2 (URL acima) | CONFIRMADO |
| Pênaltis | Cinco cobranças por time e depois morte súbita, sorteio de moeda, só jogadores em campo ao fim do jogo, etc. Resumo: seção "Penalties" da Law 10; detalhes da contagem de cinco cobranças não conferi no texto | Law 10 | PARCIAL |
| Basquete | 4x10 min; empate = quantas prorrogações de 5 min forem necessárias; em série de 2 jogos por pontos agregados, o 2º jogo também vai à prorrogação se o agregado empatar | FIBA rules 2026, art. 8 | CONFIRMADO |
| Rúgbi, finais U20 2025 | Empate: morte súbita/prorrogação (intervalo de 5 min, 10 min por tempo, primeiro a pontuar vence), depois competição de chutes (5 chutadores, depois sudden death) | World Rugby U20 2025 | CONFIRMADO |
| Vôlei | Partida de 5 sets; 5º set a 15 pontos com 2 de diferença | FIVB regra 6.3 | CONFIRMADO |
| Melhor de N | Toornament `best_of` com `nb_match_sets` e `interrupt` (encerrar quando o resultado é matemático); `fixed_sets`; `home_and_away` (ida e volta); `single_set`. `calculation`: `none`, `score`, `outcome` | https://developer.toornament.com/v2/core-concepts/match/formats | CONFIRMADO |
| Basquete: forfeit em série | Em melhor de 5 e 7 o forfeit de um jogo não perde a série (art. 20.2.2) | FIBA | CONFIRMADO |
| Tênis (tie-break do set, super tie-break, melhor de 3/5) | Não consegui ler o PDF do ITF (https://www.world.tennis/media/7221/2026-rules-of-tennis-english.pdf redireciona e voltou vazio). Busca indicou que o match tie-break de 10 pontos está no Apêndice VI e o de 7 pontos no jogo de tie-break | ITF Rules of Tennis 2026 | NÃO VERIFICADO |
| Gol fora (UEFA) | A UEFA removeu a regra nas competições de clubes; não confirmei em fonte primária. Para o Liggo: tratar como opção do regulamento | - | INCERTO |

## 6. Provas por desempenho (individuais)

Fonte principal: World Athletics Competition and Technical Rules, 2026 Edition (https://worldathletics.org/download/download?filename=df5b2373-0019-4fab-9c1a-e8409ee99bef.pdf&urlslug=Competition%20and%20Technical%20Rules%20%E2%80%93%202026%20Edition), citada por regra abaixo. **CONFIRMADO** salvo indicação.

| Tema | Regra |
|---|---|
| Tentativas em provas de campo (exceto salto em altura e com vara) | Com mais de 8 atletas, cada um tem 3 tentativas e os 8 melhores resultados válidos fazem 3 adicionais (total 6). Com 8 ou menos, 6 tentativas desde o início, salvo regulamento específico (TR 25, texto de ordem de competição; numeração exata do parágrafo não anotada) |
| Resultado | Cada atleta recebe o melhor de todas as tentativas (TR 25.22 Result) |
| Desempate em saltos horizontais e lançamentos | O segundo melhor resultado dos empatados decide; depois o terceiro, e assim por diante; se persistir, o empate permanece, inclusive no 1º lugar (TR 25.22) |
| Desempate em saltos verticais | (1) menor número de saltos na altura final superada; (2) menor total de falhas na prova até essa altura; (3) mesma colocação, exceto para o 1º lugar, que é decidido em "jump-off" (TR 26.8 e 26.9), salvo decisão prévia em contrário. Jump-off: um salto por altura, começando na próxima altura após a última superada; se ninguém decide, a barra sobe se mais de um acertou ou desce se todos falharam, em 2 cm no salto em altura (valor para a vara não conferido, **INCERTO**) |
| Três falhas consecutivas | Eliminam do salto vertical, exceto em empate pelo 1º lugar (TR 26) |
| Corrida: empate de posição | Tempo real a 0,001 s; se igual, o empate permanece e sorteio define o avanço para a fase seguinte (TR 20/21, texto "Tie for ranking position") |
| Avanço por lugar e por tempo | "Classificam os 3 primeiros de cada bateria mais os 2 melhores tempos": o regulamento trata empates no último lugar de classificação (reduz vagas por tempo) |
| Ordem de competição | Sorteio; em rodadas posteriores, ordem inversa de classificação (TR 25) |
| Fórmula 1 (pontos por posição) | FIA 2026 Formula 1 General Regulatory Provisions, A2.2.1: tabela posição->pontos com 4 colunas conforme a fração da distância cumprida pelo líder (mínimo 2 voltas completas; 25%, 50%, 75%). Coluna 4 (>=75%): 25, 18, 15, 12, 10, 8, 6, 4, 2, 1 do 1º ao 10º. Sprint tem tabela própria (A2.2.2, não transcrita). Campeonato de pilotos e de construtores |
| Natação, corridas de rua | Regulamentos World Aquatics e de maratona/corrida de rua: **NÃO VERIFICADO** nesta pesquisa |
| Baterias classificatórias, semifinais e final | World Athletics trata em regras de séries e rodadas (TR 20/21). Não detalhei critérios de composição das baterias |

### Plataformas (desempenho)
- Toornament FFA: `score_intent` (`highest` ou `lowest`) e `score_type` (`points` ou `duration`) no estágio (https://developer.toornament.com/v2/core-concepts/stages). Isso é exatamente o par (sentido do melhor valor, tipo de métrica) necessário para tempo vs. distância.
- Challonge "Race API" existe (List Races, Elapsed Times) mas a página principal marca aviso (https://challonge.apidog.io/-notice-1789581m0.md); NÃO li os campos.

## 7. Resumo dos nomes reais de campos

- Challonge (API v2.1, https://challonge.apidog.io/create-tournament-23619740e0.md): `tournament_type` (`single elimination`, `double elimination`, `round robin`, `swiss`, `free for all`), `match_options.consolation_matches_target_rank`, `match_options.accept_attachments`, `registration_options.open_signup|signup_cap|check_in_duration`, `seeding_options.hide_seeds|sequential_pairings`, `group_stage_enabled`, `group_stage_options.{stage_type, group_size, participant_count_to_advance_per_group, rr_iterations, ranked_by, split_participants, swiss_rounds, pts_for_match_win, pts_for_match_tie, pts_for_game_win, pts_for_game_tie, pts_for_bye, tie_breaks}`, `double_elimination_options.{split_participants, grand_finals_modifier}`, `round_robin_options.{iterations, ranking, pts_for_*}`, `swiss_options.rounds`.
- Toornament (https://developer.toornament.com/v2/doc/organizer_stages e /core-concepts/stages): estágio com `type`, `status` (`pending`, `ready`, `running`, `completed`), `settings`, `match_settings` (`format`, `report`), `auto_placement_enabled`; tipos listados na seção 4.
- start.gg: `Phase` e `BracketType` na seção 4. Não encontrei campos de pontos ou tiebreak.

## Proposta de modelo de dados

**ISTO É UMA PROPOSTA (análise minha), não fato de fonte.**

### Princípios
1. Evento tem uma lista ORDENADA de `EventStage` (fase). Cada fase tem um `type` e seu `rules`. Isso reflete Toornament/Challonge/start.gg e cobre grupos + mata-mata, suíço, etapas de circuito.
2. Regras por esporte vêm de **presets** (`RulePreset`): o organizador escolhe "Futebol", "Vôlei FIVB" etc. e pode editar. O preset só copia valores para o evento (não referencia, para não mudar torneios em andamento).
3. O que o sistema precisa filtrar/ordenar vira coluna; o que é lista variável vira JSON validado por schema (zod), versionado (`schemaVersion`).

### (a) Colunas relacionais

`EventStage`: `id`, `eventId`, `order`, `name`, `type` (`ROUND_ROBIN`, `GROUPS`, `SINGLE_ELIM`, `DOUBLE_ELIM`, `SWISS`, `LADDER`, `CIRCUIT`, `PERFORMANCE`), `groupCount`, `groupSize`, `advancingPerGroup`, `advanceBestThirds` (int, opcional), `roundRobinLegs` (1 ou 2), `swissRounds` (null = automático), `thirdPlaceMatch` (bool), `grandFinalMode` (`NONE`, `SINGLE`, `RESET`), `seeding` (`MANUAL`, `RANDOM`, `RANKING`, `SNAKE`), `crossing` (`ADJACENT`, `SEQUENTIAL`, `SNAKE`, `MIRROR` inspirado nos valores do Toornament), `matchFormat` (`SINGLE`, `BEST_OF`, `HOME_AWAY`), `bestOf` (int), `aggregateTiebreak` (JSON simples ou colunas: `awayGoals` bool, `extraTime` bool, `penalties` bool).

`EventRules` (1 por evento, valores padrão herdados pelas fases): `scoringModel` (`SETS`, `TIME`, `POINTS`, `PERFORMANCE`), `winPoints`, `drawPoints`, `lossPoints`, `allowDraw`, `woScoreFor`, `woScoreAgainst`, `woPointsAwarded` (pontos de tabela ao beneficiado), `woPointsPenalty` (ex.: 0 ou negativo), `woEliminationLimit` (null = nunca; FIBA = 2), `woNullifyResults` (bool, FIBA anula resultados), `byePoints`.

### (b) Listas ordenadas e JSON validado
- `tiebreakers: Tiebreaker[]` (JSON em `EventStage` ou `EventRules`). Item: `{ key, scope: "OVERALL" | "HEAD_TO_HEAD", direction: "HIGH" | "LOW", restartOnResolve?: boolean }`. Catálogo fechado de `key` (inspirado nos identificadores reais citados): `POINTS`, `WINS`, `MATCH_DIFF`, `SCORE_FOR`, `SCORE_AGAINST`, `SCORE_DIFF`, `SET_RATIO`, `POINT_RATIO`, `TRIES_DIFF`, `TRIES_FOR`, `FEWER_FORFEITS`, `BUCHHOLZ`, `BUCHHOLZ_CUT1`, `MEDIAN_BUCHHOLZ`, `SONNEBORN_BERGER`, `FAIR_PLAY`, `SEED`, `EXTERNAL_RANKING`, `LAST_MATCH`, `COUNTBACK_PLACES` (F1: nº de 1ºs, 2ºs...), `COUNTBACK_BEST_ATTEMPT` (World Athletics), `DRAW_LOTS`. Limite de tamanho no app (não imitar o limite 3 do Challonge).
- `pointsTable: PointsRule[]` para pontuação dependente do placar. Item: `{ when: { outcome: "WIN"|"DRAW"|"LOSS", setsFor?: n, setsAgainst?: n, marginMax?: n, triesMin?: n }, points: n }`. Substitui `winPoints/drawPoints/lossPoints` quando presente (vôlei, rúgbi). As colunas simples cobrem 80% dos casos (futebol).
- `placePoints: { place: number, points: number }[]` para circuitos por etapas e F1, mais `dropWorst: number` (**descarte não confirmado em fonte, tratar como requisito do produto**).

### (c) Dependente da modalidade
Campo `scoringModel` e um bloco `sportConfig` (JSON validado por tipo):
- `SETS` (vôlei, tênis, tênis de mesa, badminton): `setsToWin`, `pointsPerSet`, `decidingSetPoints`, `winByTwo`, `maxPoints`.
- `TIME`/`POINTS` (futebol, basquete, handebol, rúgbi): `periods`, `periodMinutes`, `extraTime`, `penalties`, `allowDraw`.
- `PERFORMANCE` (corrida, atletismo, natação): `metric` (`TIME`, `DISTANCE`, `HEIGHT`, `POINTS`), `bestIs` (`LOWEST`, `HIGHEST`), `attempts`, `attemptsAdvance` (ex.: 3 e depois 8 finalistas), `aggregation` (`BEST`, `SUM`, `AVERAGE`), `timePrecision` (ex.: milésimos), `heats` e `qualification` (`byPlace`, `byTime`).

### Exemplos

**Futebol, pontos corridos**
```json
{ "stage": { "type": "ROUND_ROBIN", "roundRobinLegs": 2 },
  "rules": { "scoringModel": "POINTS", "winPoints": 3, "drawPoints": 1, "lossPoints": 0,
    "allowDraw": true, "woScoreFor": "3-0", "woPointsAwarded": 3, "woPointsPenalty": 0, "woEliminationLimit": 2 },
  "tiebreakers": [
    {"key":"POINTS","scope":"HEAD_TO_HEAD"},{"key":"SCORE_DIFF","scope":"HEAD_TO_HEAD"},
    {"key":"SCORE_FOR","scope":"HEAD_TO_HEAD"},{"key":"SCORE_DIFF","scope":"OVERALL"},
    {"key":"SCORE_FOR","scope":"OVERALL"},{"key":"WINS","scope":"OVERALL"},{"key":"DRAW_LOTS"} ] }
```
(os valores de W.O. e a ordem são EXEMPLO; não verifiquei o regulamento CBF/FIFA.)

**Vôlei, grupos + mata-mata** (pontos e W.O. conforme FIVB confirmado acima)
```json
{ "stages": [
  { "type": "GROUPS", "groupCount": 4, "groupSize": 4, "advancingPerGroup": 2,
    "roundRobinLegs": 1, "matchFormat": "BEST_OF", "bestOf": 5, "crossing": "MIRROR" },
  { "type": "SINGLE_ELIM", "thirdPlaceMatch": true, "matchFormat": "BEST_OF", "bestOf": 5 } ],
  "rules": { "scoringModel": "SETS",
    "pointsTable": [ {"when":{"outcome":"WIN","setsAgainstMax":1},"points":3},
      {"when":{"outcome":"WIN","setsAgainst":2},"points":2},
      {"when":{"outcome":"LOSS","setsFor":2},"points":1},
      {"when":{"outcome":"LOSS","setsForMax":1},"points":0} ],
    "woScoreFor": "3-0 (25-0 por set)", "woPointsAwarded": 3, "woPointsPenalty": 0 },
  "sportConfig": { "setsToWin": 3, "pointsPerSet": 25, "decidingSetPoints": 15, "winByTwo": true },
  "tiebreakers": [ {"key":"WINS"},{"key":"POINTS"},{"key":"SET_RATIO"},{"key":"POINT_RATIO"},{"key":"LAST_MATCH"},{"key":"EXTERNAL_RANKING"} ] }
```
(`woPointsAwarded: 3` para o beneficiado é minha dedução; a fonte confirma 0 pontos para quem dá W.O. e placar 3-0; `setsAgainstMax` e similares são nomes inventados do exemplo.)

**Corrida/atletismo por desempenho (salto em distância)**
```json
{ "stages": [ { "type": "PERFORMANCE" } ],
  "sportConfig": { "metric": "DISTANCE", "bestIs": "HIGHEST", "attempts": 3,
    "attemptsAdvance": { "finalists": 8, "extraAttempts": 3 }, "aggregation": "BEST" },
  "tiebreakers": [ {"key":"COUNTBACK_BEST_ATTEMPT"} ] }
```
Para corrida de 100 m: `metric: TIME`, `bestIs: LOWEST`, `timePrecision: 0.001`, baterias com `qualification: { byPlace: 3, byTime: 2 }`, desempate pelo tempo exato e sorteio.

### Perguntas em aberto para o dono do produto
1. O organizador edita livremente a tabela de pontos, ou só escolhe presets por modalidade? (afeta UI e validação)
2. Quantas fases por evento no MVP: só uma, ou "grupos + mata-mata" e "etapas de circuito" desde o início?
3. W.O.: aplicar automaticamente a política (placar atribuído e eliminação por N W.O.) ou deixar o organizador decidir caso a caso?
4. Mudança de regras com o evento em andamento: permitir? Recalcular classificação? (recomendo travar após o primeiro jogo)
5. Descarte do pior resultado e ranking acumulado (circuito): não achei fonte primária; qual é a regra desejada?
6. Desempate: catálogo fechado ou critérios customizados por fórmula? Há limite de itens?
7. Fair play (cartões) entra no MVP? Exige cadastro de ocorrências por jogo.
8. Equipe e dupla: pontuação por partida entre times, entre duplas, e ranking individual dentro da equipe (xadrez por times usa critérios próprios da FIDE)?
9. Sets e pontos por modalidade: o Liggo só guarda placar final ou também parciais por set/tentativa?
10. Ligas com grande público (futebol, vôlei) usam o regulamento da federação. O Liggo oferece presets "FIFA/CBF", "FIVB", "FIBA" ou apenas "padrão"?

## Limitações desta pesquisa
- Regulamentos de futebol (FIFA, UEFA, CBF), handebol (IHF), tênis de mesa (ITTF), badminton (BWF), natação (World Aquatics) e tênis (ITF) não puderam ser lidos em fonte primária (sites sem acesso, PDFs vazios ou redirecionados). Os itens correspondentes estão marcados.
- Alguns PDFs só renderizam texto com extração local; a numeração de parágrafos pode ter deslocamentos. Para citar regra no produto, confira o artigo no documento.
- Os regulamentos de competições (FIVB Mundial, World Rugby U20) valem para aquele torneio e não são regra universal do esporte.
- Challonge e Toornament: li somente as páginas listadas; campos de W.O./forfeit por partida e `Race API` ficaram sem leitura.

## Fontes consultadas

Data de acesso de todas: 2026-11-18.

1. FIBA Official Basketball Rules 2026 (v1.0, julho 2026), FIBA. https://assets.fiba.basketball/image/upload/documents-corporate-fiba-official-rules-2026-v1-0.pdf
2. FIVB Official Volleyball Rules 2025-2028 (versão francesa v04), FIVB. https://www.fivb.com/wp-content/uploads/2025/06/FIVB-Volleyball_Rules2025_2028-FR-v04.pdf
3. FIVB Women's Volleyball World Championship 2025, Competition Regulations v2, Volleyball World/FIVB. https://images.volleyballworld.com/image/upload/fl_attachment/fivb-prd/ke69yngfcqxfyj4t5ztp.pdf
4. FIVB Men's Volleyball World Championship 2025, Competition Regulations v2, Volleyball World/FIVB. https://images.volleyballworld.com/image/upload/fl_attachment/fivb-prd/xygejzx5otwslijoycgj.pdf
5. World Rugby U20 Championship 2025, Tournament Rules, World Rugby. https://resources.worldrugby-rims.pulselive.com/worldrugby/document/2025/07/07/915cd984-e226-4589-ab7e-e64dba0ffb5a/Tournament-Rules-2025.pdf
6. Laws of the Game 2025/26, Law 10 (Determining the Outcome of a Match), IFAB, hospedado pela The FA. https://www.thefa.com/-/media/files/thefaportal/governance-docs/laws-of-the-game/2025-26/law-10---determining-the-outcome-of-a-match.ashx
7. World Athletics Competition and Technical Rules 2026 Edition, World Athletics. https://worldathletics.org/download/download?filename=df5b2373-0019-4fab-9c1a-e8409ee99bef.pdf&urlslug=Competition%20and%20Technical%20Rules%20%E2%80%93%202026%20Edition
8. 2026 Formula 1 General Regulatory Provisions, Issue 02 (27 fev 2026), FIA. https://www.fia.com/system/files/documents/fia_2026_f1_regulations_-_section_a_general_provisions_-_iss_02_-_2026-02-27.pdf
9. FIDE Handbook, Tie-Break Regulations (aplicável desde 2024-08-01), FIDE. https://handbook.fide.com/chapter/TieBreakRegulations082024
10. FIDE Handbook, General Handling Rules for Swiss Tournaments (2026-02), FIDE. https://handbook.fide.com/chapter/GeneralHandlingRulesForSwissTournaments202602
11. Challonge API v2.1, Create Tournament, Challonge. https://challonge.apidog.io/create-tournament-23619740e0.md (índice: https://challonge.apidog.io/llms.txt)
12. Toornament Developer, Stages (core concepts), Toornament. https://developer.toornament.com/v2/core-concepts/stages
13. Toornament Developer, Match formats. https://developer.toornament.com/v2/core-concepts/match/formats
14. Toornament Developer, Rankings: Tiebreakers. https://developer.toornament.com/v2/core-concepts/structure/rankings/tiebreakers
15. Toornament Developer, Structure API: Stages. https://developer.toornament.com/v2/doc/organizer_stages
16. start.gg API schema, Phase e BracketType (espelho smashgg-schema). https://smashgg-schema.netlify.app/reference/phase.doc e https://smashgg-schema.netlify.app/reference/brackettype.doc
17. start.gg Developer Portal, Introdução. https://developer.start.gg/docs/intro (só índice; sem campos)
18. Consultadas mas NÃO utilizadas como fato (apenas imprensa/terceiros, citadas como INCERTO): goal.com e NBC Sports sobre critérios da Copa 2026; Sports Mole e Wikipedia sobre critérios da Champions League 2025/26; Toornament help (swiss, double finals).
