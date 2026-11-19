# Inscrição no evento: tarefas

Portão: `npm run typecheck && npm run lint`.

| ID | Tarefa | Depende | Req. |
|---|---|---|---|
| B1 | Schema + migração (categorias, inscrição, elenco, comissão, posições) | - | REG-01 |
| B2 | Posições: seed e telas do admin | B1 | REG-04 |
| B3 | `lib/registrations`: schemas, elegibilidade, queries, ações de categoria e de inscrição | B1 | REG-02,03,05..10 |
| B4 | Telas de categorias do evento; categoria padrão na criação | B3 | REG-02,03 |
| B5 | Telas de inscrições: lista, construtor de elenco, edição e exclusão | B3 | REG-05..11 |
| B6 | Resumo no detalhe do evento | B4,B5 | REG-12 |
| B7 | Verificação Playwright + build | B6 | todos |
| B8 | Docs, memória e commit | B7 | - |

Status: B1 a B8 concluídas. Verificação: 22 checagens Playwright (categorias, elegibilidade, conflitos, edição, exclusão, isolamento entre organizações), 18 casos unitários de elegibilidade e schemas, lint e build.
Não coberto por e2e: eventos individuais e de duplas (a regra de 1 e 2 atletas está só no servidor).
