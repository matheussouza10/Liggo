# Catálogos do admin e Evento: desenho

## Modelo de dados (Prisma)

```
SportCategory 1─* Sport            EventTypeCategory 1─* EventType      FormatCategory 1─* CompetitionFormat
Organization 1─* Event *─1 User(createdBy)      Event *─1 Sport, EventType, CompetitionFormat
enum ParticipationType { INDIVIDUAL PAIR TEAM }
```

- Categorias: `id, slug (único), name (único), sortOrder, active, timestamps`.
- `Sport`: `slug (único global), name, categoryId, sortOrder, active`; único `(categoryId, name)`.
- `EventType`: igual, mais `description?`.
- `CompetitionFormat`: igual, mais `description?`, `participationTypes ParticipationType[]` (vazio = qualquer), `allowsGroups`, `allowsRepechage`.
- `Event`: `organizationId, createdById, name, description?, startDate @db.Date, endDate @db.Date, eventTypeId, formatId, sportId, participationType, locationName, city?, state?`. Índice `(organizationId, startDate)`. FKs `Restrict`.
- Unicidade de nome é aplicada também sem diferenciar caixa e espaços: o app compara `name.trim().toLowerCase()` antes de gravar (o índice cobre o caso exato).

## Seed

`prisma/seed-catalogs.ts`: `parseCatalog(markdown)` devolve `{category, items[]}[]`, lendo `## Categoria` e `- Item` e parando no primeiro `---`. Aplica `upsert` por `slug` com `update: {}` (não sobrescreve edição). Colisão de slug entre categorias: o segundo recebe `-<slug-da-categoria>`. `src/lib/slug.ts` (compartilhado com `actions.ts`) gera o slug.
Metadados inferidos dos formatos estão em STATE.md.

## Camadas

```
src/lib/catalog/
  config.ts     3 catálogos: rótulos pt-BR, rota, campos extras
  adapters.ts   por catálogo: listar, criar/editar/ativar item e categoria (Prisma tipado)
  actions.ts    server actions genéricas (catalog, op) → requireSystemAdmin + validação + adapter
  queries.ts    leitura para páginas e para o formulário do evento (só ativos, agrupados)
src/lib/events/
  constants.ts  UFs, rótulos de participação
  actions.ts    createEventAction (requireOrganizationUser, validação, compatibilidade)
  queries.ts    listar/ler evento sempre filtrando pela organização
```

## Interface

- Admin: `/admin/sports`, `/admin/event-types`, `/admin/formats`, cada um com `.../categories`. Componentes: `CatalogTabs` (links Itens | Categorias), `CatalogManager` (cliente: tabela com busca, filtro por categoria, `Switch` de ativo, diálogo de criar/editar), `CategoryManager`.
- Organizador: `/events` (tabela + estado vazio), `/events/new` (formulário com `NativeSelect` + `optgroup` por categoria), `/events/[id]` (detalhe).
- Componentes shadcn a adicionar: `table`, `dialog`, `switch`, `badge`, `native-select`.
- Navegação: `NavConfig` passa a ter `sections[]`; admin ganha "Cadastros".

## Segurança e multi-tenant

- Toda server action chama o guard no início; `requireSystemAdmin` para catálogos, organização do usuário para eventos.
- Leituras de evento sempre com `where: { organizationId: user.organization.id }`.
- Dados nunca vêm do cliente para decidir organização ou criador.

## Verificação

Sem framework de testes (R-002). Portões: `npm run typecheck`, `npm run lint`, `npm run build`, contagem SQL do seed e roteiro Playwright avulso.
