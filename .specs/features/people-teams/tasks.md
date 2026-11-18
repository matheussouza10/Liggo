# Atletas, times e árbitros: tarefas

Portão: `npm run typecheck && npm run lint`. Marcos: M1 após P3, M2 após P6.

| ID | Tarefa | Depende | Req. | Status |
|---|---|---|---|---|
| P1 | Schema Prisma + migração | - | PER-01 | Concluída |
| P2 | `lib/people`: CPF (validar, normalizar, mascarar), schemas zod, nomes abreviados | P1 | PER-02,05 | Concluída |
| P3 | Ações e consultas de atletas (criar, vincular, editar, listar) | P2 | PER-03..07 | Concluída |
| P4 | Ações e consultas de times e árbitros | P2 | PER-08,09 | Concluída |
| P5 | Telas de atletas (lista, novo, detalhe) | P3 | PER-03..07 | Concluída |
| P6 | Telas de times e árbitros; navegação | P4,P5 | PER-08..10 | Concluída |
| P7 | Verificação Playwright + build; docs e memória | P6 | todos | Concluída |
