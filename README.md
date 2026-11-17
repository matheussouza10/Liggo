# Liggo

SaaS para criar e gerenciar campeonatos, torneios, ligas e partidas de várias modalidades esportivas.

**Stack:** Next.js (App Router), TypeScript, Tailwind CSS 4, shadcn/ui, Prisma 7, PostgreSQL.

## Rodando localmente

```bash
npm install
cp .env.example .env        # ajuste DATABASE_URL para o seu Postgres
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

- Login de organizadores: `/entrar`
- Login administrativo: `/admin/entrar`

Contexto de produto e identidade visual: [PRODUCT.md](./PRODUCT.md).
