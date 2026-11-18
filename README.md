# Liggo

SaaS para criar e gerenciar campeonatos, torneios, ligas e partidas de várias modalidades esportivas.

**Stack:** Next.js (App Router), TypeScript, Tailwind CSS 4, shadcn/ui, Prisma 7, PostgreSQL.

## Rodando localmente

```bash
npm install
cp .env.example .env        # ajuste DATABASE_URL para o seu Postgres
npm run db:migrate
npm run db:seed             # cria o administrador do sistema (ver abaixo)
npm run dev
```

O administrador do sistema vem do `.env`: defina `ADMIN_EMAIL` e `ADMIN_PASSWORD`
antes de rodar `npm run db:seed`. Sem essas variáveis o seed não cria ninguém.

- Login de organizadores: `/login` (depois do login: `/dashboard`)
- Login administrativo: `/admin/login` (depois do login: `/admin`)
- Cadastro de organização: `/signup`
- Recuperação de senha: `/forgot-password` (tela pronta, envio de e-mail ainda não implementado)

Contexto de produto e identidade visual: [PRODUCT.md](./PRODUCT.md).
