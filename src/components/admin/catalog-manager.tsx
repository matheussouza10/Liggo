"use client";

import { PencilIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  setCategoryActiveAction,
  setItemActiveAction,
} from "@/lib/catalog/actions";
import { PARTICIPATION_LABELS, type CatalogConfig } from "@/lib/catalog/config";
import type { CategoryRow, ItemRow } from "@/lib/catalog/types";
import { CategoryFormDialog, ItemFormDialog } from "./catalog-form-dialog";

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/* ------------------------------ items ------------------------------ */

export function ItemManager({
  config,
  categories,
  items,
}: {
  config: CatalogConfig;
  categories: CategoryRow[];
  items: ItemRow[];
}) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [editing, setEditing] = useState<ItemRow | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return items.filter(
      (i) =>
        (!categoryId || i.categoryId === categoryId) &&
        (!q || normalize(i.name).includes(q)),
    );
  }, [items, query, categoryId]);

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (item: ItemRow) => {
    setEditing(item);
    setOpen(true);
  };
  const toggle = (item: ItemRow, active: boolean) =>
    startTransition(async () => {
      await setItemActiveAction(config.key, item.id, active);
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label={`Buscar ${config.title.toLowerCase()}`}
            placeholder={`Buscar ${config.title.toLowerCase()}`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-10 pl-9"
          />
        </div>
        <NativeSelect
          aria-label="Filtrar por categoria"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="w-full sm:w-64"
        >
          <NativeSelectOption value="">Todas as categorias</NativeSelectOption>
          {categories.map((c) => (
            <NativeSelectOption key={c.id} value={c.id}>
              {c.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button onClick={openNew} className="h-10">
          <PlusIcon data-icon="inline-start" />
          {config.newLabel}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {filtered.length} de {items.length} {config.title.toLowerCase()}
      </p>

      <div className="liquid-card overflow-hidden rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              {config.isFormat ? (
                <TableHead className="hidden lg:table-cell">
                  Participação
                </TableHead>
              ) : null}
              {config.isFormat ? (
                <TableHead className="hidden xl:table-cell">Opções</TableHead>
              ) : null}
              <TableHead className="w-24">Ativo</TableHead>
              <TableHead className="w-16 text-right">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={config.isFormat ? 6 : 4}
                  className="py-10 text-center text-muted-foreground"
                >
                  Nenhum resultado para essa busca.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow
                  key={item.id}
                  className={item.active ? undefined : "opacity-60"}
                >
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.categoryName}
                  </TableCell>
                  {config.isFormat ? (
                    <TableCell className="hidden lg:table-cell">
                      {item.participationTypes.length === 0 ? (
                        <span className="text-muted-foreground">Qualquer</span>
                      ) : (
                        item.participationTypes
                          .map((t) => PARTICIPATION_LABELS[t])
                          .join(", ")
                      )}
                    </TableCell>
                  ) : null}
                  {config.isFormat ? (
                    <TableCell className="hidden xl:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {item.allowsGroups ? (
                          <Badge variant="secondary">Grupos</Badge>
                        ) : null}
                        {item.allowsRepechage ? (
                          <Badge variant="secondary">Repescagem</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <Switch
                      checked={item.active}
                      disabled={pending}
                      onCheckedChange={(checked) => toggle(item, checked)}
                      aria-label={`${item.active ? "Desativar" : "Ativar"} ${item.name}`}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Editar ${item.name}`}
                      onClick={() => openEdit(item)}
                    >
                      <PencilIcon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ItemFormDialog
        config={config}
        categories={categories}
        item={editing}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}

/* ---------------------------- categories ---------------------------- */

export function CategoryManager({
  config,
  categories,
}: {
  config: CatalogConfig;
  categories: CategoryRow[];
}) {
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const toggle = (category: CategoryRow, active: boolean) =>
    startTransition(async () => {
      await setCategoryActiveAction(config.key, category.id, active);
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {categories.length} categorias. Desativar uma categoria esconde os
          itens dela das escolhas dos organizadores.
        </p>
        <Button
          className="h-10"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <PlusIcon data-icon="inline-start" />
          Nova categoria
        </Button>
      </div>

      <div className="liquid-card overflow-hidden rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead className="w-28">Itens</TableHead>
              <TableHead className="w-24">Ativa</TableHead>
              <TableHead className="w-16 text-right">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow
                key={category.id}
                className={category.active ? undefined : "opacity-60"}
              >
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {category.itemCount}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={category.active}
                    disabled={pending}
                    onCheckedChange={(checked) => toggle(category, checked)}
                    aria-label={`${category.active ? "Desativar" : "Ativar"} ${category.name}`}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Editar ${category.name}`}
                    onClick={() => {
                      setEditing(category);
                      setOpen(true);
                    }}
                  >
                    <PencilIcon />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CategoryFormDialog
        config={config}
        category={editing}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
