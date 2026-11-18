# Catálogos do admin e Evento: tarefas

Portão padrão de cada tarefa: `npm run typecheck && npm run lint`. Marcos (M1 a M4) acrescentam build e verificação funcional.

| ID | Tarefa | Depende | Requisitos | Portão extra | Status |
|---|---|---|---|---|---|
| T1 | Schema Prisma (6 tabelas de catálogo, Event, enum) + migração + `prisma generate` | - | todos | `migrate deploy` ok | Concluída |
| T2 | `src/lib/slug.ts` compartilhado; `parseCatalog` + `seed-catalogs.ts`; integrar ao `seed.ts` | T1 | SEED-01..04 | **M1**: contagens SQL, 2 execuções | Concluída |
| T3 | Componentes shadcn: table, dialog, switch, badge, native-select | - [P] | - | - | Concluída |
| T4 | `lib/catalog`: config, adapters, queries, actions (com guard admin) | T1 | CAT-01..07 | - | Concluída |
| T5 | UI admin: CatalogTabs, CatalogManager, CategoryManager, formulários em diálogo | T3, T4 | CAT-01..06 | - | Concluída |
| T6 | Rotas admin (6 páginas) e navegação (`sections[]`, grupo Cadastros) | T5 | CAT-01, NAV-01 | **M2**: Playwright do CRUD admin | Concluída |
| T7 | `lib/events`: constantes, queries, `createEventAction` | T1, T4 | EVT-02..04 | - | Concluída |
| T8 | UI de eventos: lista, formulário, detalhe; sidebar "Eventos" | T3, T7 | EVT-01, EVT-04..06, NAV-01 | - | Concluída |
| T9 | Verificação ponta a ponta + build | T6, T8 | todos | **M3**: Playwright completo, build | Concluída |
| T10 | Atualizar spec (status), README, memória; commit | T9 | - | **M4** | Concluída |
