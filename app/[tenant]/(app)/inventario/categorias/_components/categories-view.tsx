"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, FolderPlus, Layers, Pencil, Plus, ScanBarcode, Tags, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/atoms/button";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Input } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { EmptyState } from "@/components/molecules/empty-state";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { useConfirm } from "@/components/organisms/confirm-dialog";
import { FormDialog } from "@/components/organisms/form-sheet";
import type { CategoryNode, CategoryRow } from "@/lib/business/catalog/category-tree";
import { cn } from "@/lib/utils";
import { deleteCategoryAction, saveCategoryAction } from "@/app/[tenant]/(app)/inventario/categorias/actions";

/** Datos de ejemplo detrás de la lista vacía (formato de los estados vacíos: packages/brand/docs/04-patrones/estados-vacios.md). */
const CATEGORY_PREVIEW = {
  columns: ["Categoría", "Subcategorías", "Productos"],
  rows: [
    ["Ropa", "Camisetas, Pantalones", "42 productos"],
    ["Bebidas", "Gaseosas, Jugos", "18 productos"],
    ["Accesorios", "", "11 productos"],
    ["Servicios", "Instalación", "6 productos"],
  ],
};

type Editing = { id?: string; name: string; parentId: string | null };

/** Árbol de categorías: crear, renombrar, mover bajo otra categoría y borrar. Cada fila dice cuántos productos tiene. */
export default function CategoriesView({ slug, tree }: { slug: string; tree: CategoryNode[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set());

  const toggle = (id: string) =>
    setClosed((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const remove = async (row: CategoryRow) => {
    const yes = await confirm({
      title: "Eliminar categoría",
      description: row.products > 0 ? `«${row.name}» tiene ${row.products} ${row.products === 1 ? "producto" : "productos"}: quedan sin categoría, no se borran.` : `«${row.name}» no tiene productos.`,
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!yes) return;
    const result = await deleteCategoryAction(slug, row.id);
    toast(result.ok ? (result.message ?? "Listo") : result.message, result.ok ? "success" : "error");
    if (result.ok) router.refresh();
  };

  const rowActions = (row: CategoryRow) => (
    <span className="flex shrink-0 items-center gap-0.5">
      {!row.parentId ? (
        <button type="button" aria-label={`Agregar subcategoría a ${row.name}`} onClick={() => setEditing({ name: "", parentId: row.id })} className={iconButton}>
          <FolderPlus aria-hidden="true" className="size-4" />
        </button>
      ) : null}
      <button type="button" aria-label={`Editar ${row.name}`} onClick={() => setEditing({ id: row.id, name: row.name, parentId: row.parentId })} className={iconButton}>
        <Pencil aria-hidden="true" className="size-4" />
      </button>
      <button type="button" aria-label={`Eliminar ${row.name}`} onClick={() => void remove(row)} className={cn(iconButton, "text-danger")}>
        <Trash2 aria-hidden="true" className="size-4" />
      </button>
    </span>
  );

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{tree.length === 0 ? "Aún no hay categorías." : `${tree.length} ${tree.length === 1 ? "categoría" : "categorías"} de primer nivel`}</p>
        <Button type="button" onClick={() => setEditing({ name: "", parentId: null })}>
          <Plus aria-hidden="true" className="size-4" /> Nueva categoría
        </Button>
      </div>

      {tree.length === 0 ? (
        <EmptyState
          mark="page"
          remember
          headingLevel={2}
          title="Aún no tienes categorías"
          description="Agrupa tus productos (Ropa, Bebidas, Servicios…) para encontrarlos rápido en el punto de venta y en la tienda."
          icon={<Tags />}
          preview={CATEGORY_PREVIEW}
          action={
            <Button type="button" onClick={() => setEditing({ name: "", parentId: null })}>
              <Plus aria-hidden="true" className="size-4" /> Crear la primera
            </Button>
          }
          secondaryAction={
            <Link href={`/${slug}/data`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-[34px] border border-border")}>Importar productos desde Excel</Link>
          }
          highlights={[
            { icon: <Layers />, title: "Categoría y subcategoría", text: "Dos niveles: Ropa › Camisetas." },
            { icon: <ScanBarcode />, title: "Vender más rápido", text: "El punto de venta las muestra como filtros." },
            { icon: <Tags />, title: "Informes por categoría", text: "Qué línea de productos vende más." },
          ]}
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {tree.map((node) => {
            const open = !closed.has(node.id);
            return (
              <li key={node.id}>
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <button
                    type="button"
                    aria-expanded={node.children.length ? open : undefined}
                    aria-label={node.children.length ? `${open ? "Plegar" : "Desplegar"} ${node.name}` : undefined}
                    disabled={node.children.length === 0}
                    onClick={() => toggle(node.id)}
                    className={cn(iconButton, node.children.length === 0 && "invisible")}
                  >
                    {open ? <ChevronDown aria-hidden="true" className="size-4" /> : <ChevronRight aria-hidden="true" className="size-4" />}
                  </button>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{node.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{node.total} {node.total === 1 ? "producto" : "productos"}</span>
                  {rowActions(node)}
                </div>
                {open && node.children.length > 0 ? (
                  <ul className="border-t border-border bg-surface-muted/40">
                    {node.children.map((child) => (
                      <li key={child.id} className="flex items-center gap-2 border-b border-border/60 py-2 pe-3 ps-12 last:border-b-0">
                        <span className="min-w-0 flex-1 truncate text-sm">{child.name}</span>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{child.products} {child.products === 1 ? "producto" : "productos"}</span>
                        {rowActions(child)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <CategoryDialog slug={slug} tree={tree} editing={editing} onClose={() => setEditing(null)} onSaved={(message) => { toast(message, "success"); router.refresh(); }} />
      {confirmDialog}
    </div>
  );
}

const iconButton = "grid size-8 place-items-center rounded-md text-muted-foreground outline-none hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:size-11";

function CategoryDialog({ slug, tree, editing, onClose, onSaved }: { slug: string; tree: CategoryNode[]; editing: Editing | null; onClose: () => void; onSaved: (message: string) => void }) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [seen, setSeen] = useState<Editing | null>(null);
  if (editing && seen !== editing) {
    setSeen(editing);
    setName(editing.name);
    setParentId(editing.parentId ?? "");
  }
  // Una categoría con subcategorías no puede volverse subcategoría: solo se ofrece «Ninguna».
  const hasChildren = !!editing?.id && (tree.find((n) => n.id === editing.id)?.children.length ?? 0) > 0;
  return (
    <FormDialog
      open={editing !== null}
      onOpenChange={(open) => !open && onClose()}
      title={editing?.id ? "Editar categoría" : editing?.parentId ? "Nueva subcategoría" : "Nueva categoría"}
      submitLabel={editing?.id ? "Guardar" : "Crear"}
      onSubmit={async () => {
        const result = await saveCategoryAction(slug, { id: editing?.id, name, parentId: parentId || null });
        if (!result.ok) return { ok: false, message: result.message, fieldErrors: { nombre: result.message } };
        setSeen(null);
        return { ok: true, message: result.message };
      }}
      onSuccess={({ message }) => onSaved(message ?? "Guardado")}
    >
      {({ fieldErrors }) => (
        <>
          <Field label="Nombre" required error={fieldErrors.nombre}>
            {(c) => <Input {...c} name="nombre" value={name} maxLength={60} autoFocus onChange={(e) => setName(e.target.value)} />}
          </Field>
          <Field label="Dentro de" hint="Déjalo en «Ninguna» para que sea de primer nivel.">
            {(c) => (
              <Select {...c} value={parentId} onChange={(e) => setParentId(e.target.value)} disabled={hasChildren}>
                <option value="">Ninguna (primer nivel)</option>
                {tree.filter((n) => n.id !== editing?.id).map((n) => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </Select>
            )}
          </Field>
        </>
      )}
    </FormDialog>
  );
}
