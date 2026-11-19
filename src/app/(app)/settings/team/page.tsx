import type { Metadata } from "next";
import {
  MemberActions,
  InvitationActions,
} from "@/components/settings/team-actions";
import { TeamInviteForm } from "@/components/settings/team-invite-form";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { serverNow } from "@/lib/team/invitations";

export const metadata: Metadata = {
  title: "Equipe | Liggo",
  robots: { index: false, follow: false },
};
export const instant = false;

const day = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" });

export default async function TeamPage() {
  const user = await requireOrganizationUser();
  const organizationId = user.organization!.id;
  const owner = user.role === "OWNER";
  const now = serverNow();
  const [members, invitations] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        disabledAt: true,
        createdAt: true,
      },
    }),
    owner
      ? prisma.invitation.findMany({
          where: { organizationId, acceptedAt: null, revokedAt: null },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      {owner ? (
        <section
          aria-label="Convidar"
          className="liquid-card flex flex-col gap-4 rounded-xl p-6"
        >
          <div>
            <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
              Convidar pessoa
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A pessoa recebe um e-mail com um link (vale por 7 dias) para criar
              a conta. Membros operam eventos, inscrições e jogos; proprietários
              também gerenciam a equipe e a organização.
            </p>
          </div>
          <TeamInviteForm />
        </section>
      ) : (
        <p className="liquid-card rounded-xl p-5 text-sm text-muted-foreground">
          Só o proprietário pode convidar pessoas e alterar papéis.
        </p>
      )}

      <section
        aria-label="Pessoas"
        className="liquid-card overflow-hidden rounded-xl"
      >
        <h2 className="px-5 pt-5 font-display text-2xl leading-none font-bold tracking-wide uppercase">
          Pessoas
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pessoa</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead className="hidden sm:table-cell">Desde</TableHead>
              {owner ? (
                <TableHead className="text-right">Ações</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id} data-testid={`member-${m.email}`}>
                <TableCell>
                  <span className="block font-medium">
                    {m.name}
                    {m.id === user.id ? (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        (você)
                      </span>
                    ) : null}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {m.email}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary">
                      {m.role === "OWNER" ? "Proprietário" : "Membro"}
                    </Badge>
                    {m.disabledAt ? (
                      <Badge variant="outline">Desativado</Badge>
                    ) : null}
                  </span>
                </TableCell>
                <TableCell className="hidden sm:table-cell tabular-nums">
                  {day.format(m.createdAt)}
                </TableCell>
                {owner ? (
                  <TableCell className="text-right">
                    <MemberActions
                      id={m.id}
                      name={m.name}
                      role={m.role === "OWNER" ? "OWNER" : "MEMBER"}
                      disabled={!!m.disabledAt}
                      isSelf={m.id === user.id}
                    />
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      {owner && invitations.length > 0 ? (
        <section
          aria-label="Convites pendentes"
          className="liquid-card overflow-hidden rounded-xl"
        >
          <h2 className="px-5 pt-5 font-display text-2xl leading-none font-bold tracking-wide uppercase">
            Convites pendentes
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead className="hidden sm:table-cell">Validade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((i) => {
                const expired = i.expiresAt.getTime() <= now;
                return (
                  <TableRow key={i.id} data-testid={`invite-${i.email}`}>
                    <TableCell className="font-medium">{i.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {i.role === "OWNER" ? "Proprietário" : "Membro"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {expired ? (
                        <Badge variant="outline">Expirado</Badge>
                      ) : (
                        <span className="tabular-nums">
                          até {day.format(i.expiresAt)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <InvitationActions id={i.id} email={i.email} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </section>
      ) : null}
    </div>
  );
}
