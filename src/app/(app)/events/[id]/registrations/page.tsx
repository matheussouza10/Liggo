import { ArrowLeftIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireOrganizationUser } from "@/lib/auth/guards";
import {
  getEventForRegistration,
  listRegistrations,
  registrationName,
} from "@/lib/registrations/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Inscrições | Liggo",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function RegistrationsPage({
  params,
}: PageProps<"/events/[id]/registrations">) {
  const user = await requireOrganizationUser();
  const { id } = await params;
  const event = user.organization
    ? await getEventForRegistration(user.organization.id, id)
    : null;
  if (!event) notFound();
  const registrations = await listRegistrations(event.id);

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <Link
            href={`/events/${event.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-white"
          >
            <ArrowLeftIcon className="size-4" />
            {event.name}
          </Link>
          <h1 className="mt-3 font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
            Inscrições
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Quem participa deste evento. O elenco é escolhido aqui, para cada
            competição.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/events/${event.id}/categories`}
            className={cn(buttonVariants({ variant: "outline" }), "h-10")}
          >
            Categorias
          </Link>
          <Link
            href={`/events/${event.id}/registrations/new`}
            className={cn(buttonVariants(), "h-10")}
          >
            <PlusIcon data-icon="inline-start" />
            Nova inscrição
          </Link>
        </div>
      </div>
      {registrations.length === 0 ? (
        <p className="liquid-card rounded-xl p-10 text-center text-muted-foreground">
          Nenhuma inscrição ainda.
        </p>
      ) : (
        <div className="liquid-card overflow-hidden rounded-xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Inscrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="w-24">Atletas</TableHead>
                <TableHead className="hidden w-28 md:table-cell">
                  Comissão
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    <Link href={`/events/${event.id}/registrations/${r.id}`}>
                      {registrationName(r)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{r.category.name}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {r.members.length}
                  </TableCell>
                  <TableCell className="hidden tabular-nums md:table-cell">
                    {r.staff.length}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
