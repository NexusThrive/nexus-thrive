"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgePercent, Plus, Star, Tags, Users } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Input } from "@/components/atoms/input";
import { Switch } from "@/components/atoms/switch";
import { EmptyState } from "@/components/molecules/empty-state";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { FormDialog } from "@/components/organisms/form-sheet";
import type { PriceListRow } from "@/lib/business/catalog/price-lists-db";
import { cn } from "@/lib/utils";
import { createPriceListAction } from "@/app/[tenant]/(app)/ventas/listas-precios/actions";

/** Datos de ejemplo detrás de la lista vacía. */
const PREVIEW = {
  columns: ["Lista", "Productos con precio", "Estado"],
  rows: [
    ["Detal", "Todos", "Predeterminada"],
    ["Mayorista", "38 productos", "Activa"],
    ["Convenio colegios", "12 productos", "Activa"],
  ],
};

export default function PriceListsView({ slug, lists }: { slug: string; lists: PriceListRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const base = `/${slug}/ventas/listas-precios`;
  const create = (
    <Button type="button" onClick={() => { setName(""); setIsDefault(lists.length === 0); setCreating(true); }}>
      <Plus aria-hidden="true" className="size-4" /> Nueva lista
    </Button>
  );

  return (
    <div className="grid gap-4">
      {lists.length > 0 ? <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{lists.length} {lists.length === 1 ? "lista" : "listas"}</p>{create}</div> : null}

      {lists.length === 0 ? (
        <EmptyState
          mark="page"
          headingLevel={2}
          title="Aún no tienes listas de precios"
          description="Úsalas cuando un cliente o un canal paga distinto: mayoristas, convenios, domicilios."
          icon={<BadgePercent />}
          preview={PREVIEW}
          action={create}
          secondaryAction={<Link href={`/${slug}/inventario/productos`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-[34px] border border-border")}>Ver los productos</Link>}
          highlights={[
            { icon: <Users />, title: "Por tipo de cliente", text: "Mayorista, detal o convenio, cada uno con su precio." },
            { icon: <Tags />, title: "Solo lo que cambia", text: "Lo que no tiene precio en la lista usa el precio base." },
            { icon: <Star />, title: "Una predeterminada", text: "La que se aplica cuando no se elige ninguna." },
          ]}
        />
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {lists.map((l) => (
            <li key={l.id}>
              <Link href={`${base}/${l.id}`} className={cn("grid gap-2 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-ring", !l.active && "opacity-60")}>
                <span className="flex items-start justify-between gap-2">
                  <b className="min-w-0 truncate text-sm font-semibold">{l.name}</b>
                  {l.isDefault ? <Badge tone="success">Predeterminada</Badge> : !l.active ? <Badge tone="muted">Inactiva</Badge> : null}
                </span>
                <span className="text-ui text-muted-foreground">{l.items === 0 ? "Sin precios propios: usa el precio base" : `${l.items} ${l.items === 1 ? "producto con precio" : "productos con precio"}`}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <FormDialog
        open={creating}
        onOpenChange={setCreating}
        title="Nueva lista de precios"
        submitLabel="Crear lista"
        onSubmit={async () => {
          const result = await createPriceListAction(slug, name, isDefault);
          return result.ok ? { ok: true, message: "Lista creada" } : { ok: false, message: result.message, fieldErrors: { nombre: result.message } };
        }}
        onSuccess={() => { toast("Lista creada", "success"); router.refresh(); }}
      >
        {({ fieldErrors }) => (
          <>
            <Field label="Nombre" required error={fieldErrors.nombre}>{(c) => <Input {...c} name="nombre" value={name} maxLength={80} autoFocus placeholder="Mayorista, Convenio colegios…" onChange={(e) => setName(e.target.value)} />}</Field>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border p-3">
              <span><b className="block text-sm">Lista predeterminada</b><span className="text-ui text-muted-foreground">Se aplica cuando no se elige otra.</span></span>
              <Switch checked={isDefault} onCheckedChange={setIsDefault} aria-label="Lista predeterminada" />
            </label>
          </>
        )}
      </FormDialog>
    </div>
  );
}
