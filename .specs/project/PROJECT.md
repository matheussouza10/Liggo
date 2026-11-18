# Liggo

SaaS multi-tenant para criar e gerenciar competições esportivas de várias modalidades.
Stack: Next.js 16 (Cache Components), TypeScript, Prisma 7 + PostgreSQL, shadcn/ui (base-nova), Tailwind 4.
Produto e marca: `PRODUCT.md` (raiz). Telas de acesso e casca do app já prontas.

## Vocabulário

- **Evento**: qualquer campeonato, torneio, liga, copa, corrida, etc. É a tabela e a rotina de criação do usuário.
- **Tipo de evento**, **Modalidade**, **Formato de competição**: cadastros globais mantidos pelo administrador do sistema.
- **Organização**: o tenant. Organizadores criam eventos dentro da própria organização.
