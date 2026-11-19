# Liggo

SaaS para criar e gerenciar campeonatos, torneios, ligas e partidas de várias modalidades esportivas.

**Stack:** Next.js (App Router), TypeScript, Tailwind CSS 4, shadcn/ui, Prisma 7, PostgreSQL.

## Rodando localmente

```bash
npm install
cp .env.example .env        # ajuste DATABASE_URL para o seu Postgres
npm run db:migrate
npm run db:seed             # carrega os catálogos de docs/ e cria o administrador do sistema
npm run dev
```

O seed é idempotente: rodar de novo não duplica nem sobrescreve o que o admin editou.
Modalidades, tipos de evento e formatos vêm de `docs/Liggo_*.md`.

O administrador do sistema vem do `.env`: defina `ADMIN_EMAIL` e `ADMIN_PASSWORD`
antes de rodar `npm run db:seed`. Sem essas variáveis o seed não cria ninguém.

- Login de organizadores: `/login` (depois do login: `/dashboard`)
- Login administrativo: `/admin/login` (depois do login: `/admin`)
- Cadastro de organização: `/signup`
- Recuperação de senha: `/forgot-password` (tela pronta, envio de e-mail ainda não implementado)
- Atletas, times e árbitros do organizador: `/athletes`, `/teams`, `/referees` (cada um com `/new` e `/[id]`)
- Eventos do organizador: `/events`, `/events/new`, `/events/[id]`, `/events/[id]/rules` (regras da competição)
- Cadastros do admin: `/admin/sports`, `/admin/event-types`, `/admin/formats` (cada um com `/categories`)
- Posições por modalidade no admin: `/admin/positions`
- Inscrições do evento: `/events/[id]/categories` e `/events/[id]/registrations` (elenco escolhido por evento, com camisa, posição, capitão e comissão técnica)
- Fases do evento: `/events/[id]/stages` (sorteio, jogos, resultados, classificação, chave) e `/calendar` (jogos agendados)
- Chaveamento: `/events/[id]/stages/bracket`; jogo ao vivo e lances: `/events/[id]/matches/[matchId]`
- Site público, sem login: `/watch` (jogos ao vivo, próximos, resultados e eventos), `/watch/events/[id]` e `/watch/matches/[id]` (tempo real)
- Estatísticas: `/events/[id]/stats` e `/watch/events/[id]/stats` (artilharia, cartões, faltas, posse); por jogo, nas telas do jogo
- Histórico do atleta: `/athletes/[id]/history`; a lista de eventos tem acesso rápido a regras, inscrições, fases e jogos e à página pública
- Conta: `/forgot-password` e `/reset-password` (recuperação de senha por e-mail), `/invite` (aceitar convite), `/terms` e `/privacy`; configurações em `/settings` (perfil, segurança, organização, equipe e convites)
- E-mail: defina `SMTP_*`, `MAIL_FROM` e `APP_URL` no `.env` (veja `.env.example`); sem SMTP, em desenvolvimento, os e-mails ficam na tabela `outbound_emails` e no console

Contexto de produto e identidade visual: [PRODUCT.md](./PRODUCT.md).
