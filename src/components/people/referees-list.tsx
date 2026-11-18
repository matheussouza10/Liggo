"use client";

import { PencilIcon } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { setRefereeActiveAction } from "@/lib/people/referee-actions";

export type RefereeRow = {
  id: string;
  name: string;
  roleLabel: string;
  sports: string[];
  license: string;
  active: boolean;
};

export function RefereesList({ rows }: { rows: RefereeRow[] }) {
  const [pending, startTransition] = useTransition();
  const toggle = (row: RefereeRow, active: boolean) =>
    startTransition(async () => {
      await setRefereeActiveAction(row.id, active);
    });

  return (
    <div className="liquid-card overflow-hidden rounded-xl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Função</TableHead>
            <TableHead className="hidden md:table-cell">Modalidades</TableHead>
            <TableHead className="hidden lg:table-cell">Licença</TableHead>
            <TableHead className="w-24">Ativo</TableHead>
            <TableHead className="w-16 text-right">
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              className={row.active ? undefined : "opacity-60"}
            >
              <TableCell className="font-medium">
                <Link
                  href={`/referees/${row.id}`}
                  className="text-white no-underline hover:underline"
                >
                  {row.name}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{row.roleLabel}</Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="flex flex-wrap gap-1">
                  {row.sports.slice(0, 3).map((s) => (
                    <Badge key={s} variant="outline">
                      {s}
                    </Badge>
                  ))}
                  {row.sports.length > 3 ? (
                    <Badge variant="outline">+{row.sports.length - 3}</Badge>
                  ) : null}
                  {row.sports.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {row.license || "—"}
              </TableCell>
              <TableCell>
                <Switch
                  checked={row.active}
                  disabled={pending}
                  onCheckedChange={(v) => toggle(row, v)}
                  aria-label={`${row.active ? "Desativar" : "Ativar"} ${row.name}`}
                />
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/referees/${row.id}`}
                  aria-label={`Editar ${row.name}`}
                  className={buttonVariants({
                    variant: "ghost",
                    size: "icon-sm",
                  })}
                >
                  <PencilIcon />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
