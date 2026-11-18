"use client";

import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type AthleteRow = {
  id: string;
  name: string;
  cpfMasked: string;
  age: number;
  genderLabel: string;
  contact: string;
  mine: boolean;
};

const norm = (v: string) =>
  v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function AthletesList({ rows }: { rows: AthleteRow[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = norm(query.trim());
    return q
      ? rows.filter((r) => norm(r.name).includes(q) || r.cpfMasked.includes(q))
      : rows;
  }, [rows, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-md">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Buscar atletas"
          placeholder="Buscar por nome"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-10 pl-9"
        />
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {filtered.length} de {rows.length} atletas
      </p>
      <div className="liquid-card overflow-hidden rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Atleta</TableHead>
              <TableHead className="hidden md:table-cell">CPF</TableHead>
              <TableHead>Idade</TableHead>
              <TableHead className="hidden lg:table-cell">Sexo</TableHead>
              <TableHead className="hidden xl:table-cell">Contato</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-muted-foreground"
                >
                  Nenhum atleta encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/athletes/${row.id}`}
                      className="text-white no-underline hover:underline"
                    >
                      {row.name}
                    </Link>
                    {!row.mine ? (
                      <Badge variant="outline" className="ml-2 align-middle">
                        De outra organização
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="hidden tabular-nums md:table-cell">
                    {row.cpfMasked}
                  </TableCell>
                  <TableCell className="tabular-nums">{row.age}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {row.genderLabel}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground xl:table-cell">
                    {row.contact || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
