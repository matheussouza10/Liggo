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
