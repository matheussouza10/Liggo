"use client";

import { PencilIcon } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
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
import { setTeamActiveAction } from "@/lib/people/team-actions";
import { cn } from "@/lib/utils";

export type TeamRow = {
  id: string;
  name: string;
  shortName: string;
  place: string;
  color: string | null;
  active: boolean;
};

export function TeamsList({ rows }: { rows: TeamRow[] }) {
  const [pending, startTransition] = useTransition();
  const toggle = (row: TeamRow, active: boolean) =>
    startTransition(async () => {
      await setTeamActiveAction(row.id, active);
    });

  return (
    <div className="liquid-card overflow-hidden rounded-xl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead className="hidden md:table-cell">Sigla</TableHead>
            <TableHead className="hidden md:table-cell">Cidade</TableHead>
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
                <span className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-3.5 shrink-0 rounded-full border border-white/20",
                      !row.color && "bg-muted",
                    )}
                    style={
                      row.color ? { backgroundColor: row.color } : undefined
                    }
                  />
                  <Link
                    href={`/teams/${row.id}`}
                    className="text-white no-underline hover:underline"
                  >
                    {row.name}
                  </Link>
                </span>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {row.shortName || "—"}
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {row.place || "—"}
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
                  href={`/teams/${row.id}`}
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
