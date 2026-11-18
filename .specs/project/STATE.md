# State

## Decisões

- **D-001** Rotas em inglês, texto da interface em pt-BR.
- **D-002** `Evento` é o nome único para campeonato/torneio/liga etc.; o que muda é o `tipo`.
- **D-003** Catálogos em tabelas separadas (modalidade, tipo de evento, formato), cada uma com a sua tabela de categorias. Desativa-se em vez de apagar, porque eventos referenciam os itens.
- **D-004** Datas do evento guardam só o dia (`@db.Date`); o horário fica para as partidas.
- **D-005** O evento pode escolher QUALQUER formato do catálogo, inclusive "Melhor de 3" e "Prorrogação" (escolha do usuário, contra a recomendação). Ver risco R-001.
- **D-006** Um evento tem uma única modalidade por enquanto.

## Riscos

- **R-001** Misturar formato com regra de confronto (Bo3, Ida e Volta) no mesmo seletor pode confundir quem organiza e duplicar a futura fase de regras. A categoria já é guardada em cada formato, então restringir o seletor depois é só um filtro.
- **R-002** Sem framework de testes no projeto; verificação por typecheck, lint, build e roteiro Playwright avulso.
- **R-003** Projeto dentro do iCloud Drive (Documentos) cria cópias " 2" de arquivos reescritos.

## Adiado

- Regras por competição (próxima feature), edição e exclusão de evento, evento multimodalidade (Olimpíada, Festival), campo "realização" (presencial/online/híbrida), modalidades personalizadas criadas pelo organizador.

## Suposições do seed (editáveis no admin)

- `participationTypes` só definido em "Desafio Individual" (individual) e "Desafio por Equipes" (equipe); demais itens sem restrição.
- `allowsGroups` em Fase de Grupos, Grupos + Mata-mata, Grupo Único, Múltiplos Grupos, Cruzamento entre Grupos.
- `allowsRepechage` em Repescagem e Eliminatória Dupla (Double Elimination).

## Verificação da feature event-catalogs (2026-11-18)

- Seed: 271 modalidades (17 categorias), 78 tipos (6), 64 formatos (5); segunda execução não duplica; "Biatlo" nas duas categorias com slugs distintos.
- Roteiro Playwright (avulso): admin 25/25, eventos 22/22. `lint` e `build` passam.

## Lições

- **L-001** React 19 reinicia o `<form action>` depois de cada envio: `<select>` não controlado volta para vazio e caixas de marcação voltam ao valor inicial. Nos formulários de catálogo e de evento o envio é feito por `onSubmit` + `startTransition(() => formAction(data))`, o que evita o reinício. Os formulários de login e cadastro usam `action` e preservam só os textos (senhas limpas de propósito).
- **L-002** Diálogos, menus e popovers renderizam em portal, fora do contêiner `.theme-dark`: passar `className="theme-dark"` no conteúdo deles.
- **L-003** Telas que leem a sessão precisam de `export const instant = false` e de um `loading.tsx` no grupo de rotas (Cache Components).
- **L-004** E-mails são gravados em minúsculas; testes devem comparar assim.

## Verificação da feature event-rules (2026-11-18)

- Roteiro Playwright (avulso): 34/34 (predefinição sugerida, edição de desempate, validação no servidor, salvar, reabrir, trocar predefinição com confirmação, vôlei e desempenho, isolamento entre organizações, admin sem acesso). `lint` e `build` passam.
- Todas as 12 predefinições passam no schema zod; 14 casos de sugestão por modalidade e 10 casos de rejeição conferidos por script.

## Decisões da feature event-rules

- **D-007** Regras em duas tabelas: `EventRules` (1 por evento) e `EventStage` (lista ordenada). Listas variáveis (`tiebreakers`, `pointsTable`, `sportConfig`, `placePoints`) em JSON validado com zod, com `schemaVersion`.
- **D-008** Pontos de tabela são `Float` (xadrez usa 0,5).
- **D-009** Predefinições vivem no código (`src/lib/rules/presets.ts`), cada uma com fonte e selo de confiança (oficial, parcial, convenção). Escolher uma COPIA os valores para o evento.
- **D-010** `Event.rulesLockedAt` existe mas nada o preenche até as partidas (feature 5).

## Lições adicionais

- **L-005** Campos numéricos do editor são não controlados e remontados por `key` quando os valores são trocados de fora (predefinição, reordenação).
- **L-006** A pasta temporária de testes pode ser limpa entre rodadas: os roteiros Playwright não ficam no repositório.

## Pendências de produto

- Confirmar D1 a D5 com o usuário. Rúgbi (bônus por tries) não tem predefinição. Tênis, tênis de mesa e lutas são convenção, sem fonte lida.
- Fair play exige ocorrências por jogo; hoje é só um critério selecionável.

## Verificação da feature people-teams (2026-11-18)

- Roteiro Playwright (avulso): 48/48 (atletas, times, árbitros, mesmo CPF em duas organizações, privacidade, menores, somente leitura, isolamento, admin sem acesso). Regressões: regras 34/34 e acento no admin 3/3. `lint` e `build` passam.
- Script de unidade: 26 casos de CPF, menores, datas, times e árbitros; 5 de comparação de nomes.

## Decisões da feature people-teams

- **D-011** Atleta é global (CPF único, só dígitos); cada organização enxerga apenas os vinculados (`OrganizationAthlete`). Reaproveitar um CPF não copia nem expõe dados além do nome abreviado.
- **D-012** Só a organização que cadastrou edita o atleta (e enquanto não houver conta própria). O CPF não muda depois do cadastro.
- **D-013** Time é da organização e NÃO tem elenco fixo: o elenco (atletas, camisa, posição, capitão) é escolhido na inscrição de cada evento.
- **D-014** Árbitro é cadastro separado, por organização; funções árbitro, juiz, auxiliar, mesário.

## Lições adicionais

- **L-007** O ILIKE e o lower() deste Postgres NÃO tratam letras acentuadas ('Águias' não casa com 'águias'). Comparações de nome sem caixa e sem acento são feitas na aplicação (`src/lib/text.ts`, `foldName`/`sameName`), inclusive nos cadastros do admin. Nunca confiar em `mode: "insensitive"` para nomes em português.
- **L-008** Com Cache Components o Next mantém páginas já visitadas escondidas no DOM: seletores de teste precisam considerar só elementos visíveis.
- **L-009** Ações que mudam listas chamam `revalidatePath(<rota>, "layout")` antes do redirect; a criação de evento revalida a raiz para atualizar o contador da sidebar.

## Pendências de produto

- Confirmar A1 a A7 de `.specs/features/people-teams/context.md` com o usuário (principalmente A2, privacidade do reaproveitamento de CPF, e A5, árbitro por organização).
- LGPD: atletas menores e CPF de responsável; definir base legal e política antes de abrir ao público. Sem limite de tentativas no vínculo por CPF.
- Próximo bloco: categorias do evento, posições por modalidade, comissão técnica e inscrição com elenco por evento.
