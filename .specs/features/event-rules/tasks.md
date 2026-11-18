# Regras da competição: tarefas

Portão: `npm run typecheck && npm run lint`. Marcos: M1 após R3, M2 após R7.

| ID | Tarefa | Depende | Req. | Status |
|---|---|---|---|---|
| R1 | Schema Prisma (`EventRules`, `EventStage`, enums, `Event.rulesLockedAt`) + migração | - | RUL-01 | Concluída |
| R2 | `lib/rules`: catálogo de critérios, schemas zod, predefinições com fonte, sugestão por modalidade | R1 | RUL-02,03 | Concluída |
| R3 | `queries` + `saveEventRulesAction` (guard, zod, transação) | R2 | RUL-03,04 | Concluída |
| R4 | Componentes shadcn: tabs, card, tooltip, accordion | - [P] | - | Concluída |
| R5 | Editor de regras (cliente): predefinição, pontuação, desempate, W.O., confrontos | R3,R4 | RUL-05..08,10 | Concluída |
| R6 | Editor de fases | R5 | RUL-09 | Concluída |
| R7 | Páginas: `/events/[id]/rules`, resumo no detalhe, link na lista | R5,R6 | RUL-11 | Concluída |
| R8 | Verificação Playwright + build; atualizar spec/state/memória | R7 | todos | Concluída |
