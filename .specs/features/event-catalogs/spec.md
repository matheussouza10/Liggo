# Catálogos do admin e Evento: especificação

## Problema

O Liggo precisa de uma estrutura de dados para competições de qualquer modalidade. Hoje não há cadastro de modalidades, tipos de evento nem formatos, e organizadores não conseguem criar nada. O admin do sistema deve manter esses cadastros, e o organizador cria **eventos** escolhendo entre eles.

## Metas

- [ ] Seed idempotente carrega 271 modalidades (17 categorias), 78 tipos de evento (6) e os formatos (5) dos documentos em `docs/`.
- [ ] Admin gerencia os três catálogos e suas categorias.
- [ ] Organizador cria e consulta eventos da sua organização.

## Fora de escopo

| Item | Motivo |
|---|---|
| Regras da competição (pontuação, desempate, confrontos, W.O.) | Próxima feature, precisa de discussão |
| Editar e excluir evento | "Por enquanto isso" |
| Participantes, partidas, chaveamento | Features seguintes |
| Evento com várias modalidades | Adiado (D-006) |
| Campo presencial/online/híbrido | Adiado |
| Excluir item de catálogo | Só desativar, porque eventos referenciam os itens |

## Histórias

### P1: Seed dos catálogos ⭐

Como administrador, quero os catálogos já preenchidos com os documentos, para começar a usar o sistema sem digitar 400 itens.

1. WHEN o seed roda THEN o sistema SHALL criar categorias e itens a partir de `docs/Liggo_Modalidades_Esportivas.md`, `docs/Liggo_Tipos_de_Eventos.md` e `docs/Liggo_Formatos_de_Competicao.md`, preservando a ordem do arquivo.
2. WHEN o seed roda de novo THEN o sistema SHALL não duplicar nem sobrescrever edições feitas no admin.
3. WHEN o mesmo nome aparece em duas categorias (ex.: "Biatlo") THEN o sistema SHALL criar os dois itens com códigos (slugs) distintos.
4. WHEN o arquivo tem a seção "Campos sugeridos" ou notas após `---` THEN o sistema SHALL ignorá-las.

**Teste independente:** rodar `npm run db:seed` duas vezes e contar as linhas (271 / 17, 78 / 6, 64 / 5).

### P1: Admin gerencia os catálogos ⭐

Como administrador, quero criar, editar e desativar modalidades, tipos de evento e formatos, com suas categorias.

1. WHEN o admin abre Modalidades THEN o sistema SHALL listar os itens com categoria e estado, com busca e filtro por categoria.
2. WHEN o admin cria ou edita um item THEN o sistema SHALL exigir nome e categoria e recusar nome repetido na mesma categoria.
3. WHEN o admin desativa um item THEN o sistema SHALL escondê-lo das escolhas do organizador e manter os eventos existentes intactos.
4. WHEN o admin abre a aba Categorias THEN o sistema SHALL permitir criar, renomear e desativar categorias, recusando nome repetido.
5. WHEN o admin cria ou edita um formato THEN o sistema SHALL permitir informar descrição, tipos de participação aceitos (vazio = todos), permite grupos e permite repescagem.
6. WHEN o admin cria ou edita um tipo de evento THEN o sistema SHALL permitir informar descrição.
7. WHEN um usuário que não é admin chama qualquer ação de catálogo THEN o sistema SHALL recusar.

**Teste independente:** como admin, criar uma categoria e uma modalidade, editar, desativar, reativar.

### P1: Organizador cria evento ⭐

Como organizador, quero criar um evento escolhendo tipo, formato e modalidade, para montar meu campeonato ou torneio.

1. WHEN o organizador abre "Novo evento" THEN o sistema SHALL mostrar nome, descrição, início, fim, tipo, formato, modalidade, formato de participação (individual, dupla, equipe), nome do local, cidade e UF.
2. WHEN o organizador envia THEN o sistema SHALL validar: nome 3 a 120 caracteres; início e fim obrigatórios, fim maior ou igual ao início; tipo, formato e modalidade existentes e ativos; local obrigatório; UF válida quando informada.
3. WHEN o formato escolhido restringe os tipos de participação e o escolhido não está na lista THEN o sistema SHALL recusar com mensagem no campo de participação.
4. WHEN o envio é válido THEN o sistema SHALL criar o evento na organização do usuário e abrir o detalhe.
5. WHEN há erro THEN o sistema SHALL manter o que foi digitado e mostrar o erro junto ao campo.
6. WHEN as listas de tipo, formato e modalidade são mostradas THEN o sistema SHALL agrupar por categoria e mostrar só itens ativos.

**Teste independente:** criar um evento válido e ver no detalhe; tentar fim antes do início.

### P1: Organizador consulta eventos ⭐

1. WHEN o organizador abre Eventos THEN o sistema SHALL listar só os eventos da sua organização, do mais próximo ao mais distante, com um estado vazio que leva a "Novo evento".
2. WHEN abre um evento THEN o sistema SHALL mostrar todos os campos.
3. WHEN pede o evento de outra organização THEN o sistema SHALL responder 404.

### P2: Navegação

1. WHEN o organizador vê a sidebar THEN o sistema SHALL mostrar "Eventos" em `/events` no lugar de "Campeonatos".
2. WHEN o admin vê a sidebar THEN o sistema SHALL mostrar o grupo "Cadastros" com Modalidades, Tipos de evento e Formatos.

## Casos de borda

- Nome de catálogo com espaços extras ou caixa diferente: tratar como igual para evitar duplicata.
- Categoria desativada: seus itens somem das escolhas do organizador.
- Item desativado já usado por um evento: o detalhe do evento continua mostrando o nome.
- Datas iguais (evento de um dia): válido.
- Organizador sem organização, ou admin acessando `/events`: sem acesso.

## Rastreabilidade

| ID | Requisito | História | Status |
|---|---|---|---|
| SEED-01 | Carregar catálogos dos 3 documentos | Seed | Verificado |
| SEED-02 | Idempotência sem sobrescrever edições | Seed | Verificado |
| SEED-03 | Slugs distintos em nomes repetidos | Seed | Verificado |
| SEED-04 | Ignorar campos sugeridos e notas | Seed | Verificado |
| CAT-01 | Listar com busca e filtro | Admin | Verificado |
| CAT-02 | Criar e editar item com validação | Admin | Verificado |
| CAT-03 | Desativar e reativar item | Admin | Verificado |
| CAT-04 | Gerenciar categorias | Admin | Verificado |
| CAT-05 | Campos extras de formato | Admin | Verificado |
| CAT-06 | Descrição do tipo de evento | Admin | Verificado |
| CAT-07 | Só admin altera catálogos | Admin | Verificado |
| EVT-01 | Formulário de novo evento | Evento | Verificado |
| EVT-02 | Validação dos campos | Evento | Verificado |
| EVT-03 | Compatibilidade formato × participação | Evento | Verificado |
| EVT-04 | Criar na organização do usuário | Evento | Verificado |
| EVT-05 | Listar eventos da organização | Evento | Verificado |
| EVT-06 | Detalhe e isolamento entre organizações | Evento | Verificado |
| NAV-01 | Sidebar: Eventos e Cadastros | Navegação | Verificado |

**Cobertura:** 18 requisitos, 18 mapeados para tarefas (T1 a T9) e 18 verificados (ver STATE.md).

## Critérios de sucesso

- Contagens do seed batem com os documentos, duas execuções seguidas.
- Roteiro Playwright cobre CRUD do admin, criação e consulta de evento, e as recusas de autorização.
- `typecheck`, `lint` e `build` passam.
