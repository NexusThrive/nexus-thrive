"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Palette, Pencil, Plus, Ruler, Shirt, Trash2, Type, X } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Input } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { EmptyState } from "@/components/molecules/empty-state";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { useConfirm } from "@/components/organisms/confirm-dialog";
import { FormDialog } from "@/components/organisms/form-sheet";
import type { AttributeDisplay, AttributeRow, VariantMode } from "@/lib/business/catalog/attributes-db";
import { deleteAttributeAction, saveAttributeAction } from "@/app/[tenant]/(app)/inventario/atributos/actions";

const MODE_LABELS: Record<VariantMode, { label: string; hint: string }> = {
  ALWAYS: { label: "Crea una variante por cada valor", hint: "Talla y color: cada combinación es un artículo con su stock." },
  NEVER: { label: "Solo informativo", hint: "Material, origen… se muestra pero no crea variantes." },
  CUSTOM: { label: "Personalizado (se escribe al vender)", hint: "Texto o arte del pedido. Solo en productos marcados como personalizables." },
};
const DISPLAY_LABELS: Record<AttributeDisplay, string> = { SELECT: "Lista", BUTTONS: "Botones", COLOR: "Muestras de color" };

type Draft = { id?: string; name: string; display: AttributeDisplay; variantMode: VariantMode; values: { id?: string; name: string; colorHex: string }[] };
/** Datos de ejemplo detrás de la lista vacía. */
const ATTRIBUTE_PREVIEW = {
  columns: ["Atributo", "Valores", "Qué hace"],
  rows: [
    ["Talla", "S, M, L, XL", "Crea variantes"],
    ["Color", "Negro, Blanco, Rojo", "Crea variantes"],
    ["Material", "Algodón, Poliéster", "Solo informativo"],
    ["Texto a estampar", "", "Se escribe al vender"],
  ],
};

const EMPTY: Draft = { name: "", display: "SELECT", variantMode: "ALWAYS", values: [{ name: "", colorHex: "#d4af37" }] };

export default function AttributesView({ slug, attributes }: { slug: string; attributes: AttributeRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [draft, setDraft] = useState<Draft | null>(null);

  const edit = (a: AttributeRow) => setDraft({ id: a.id, name: a.name, display: a.display, variantMode: a.variantMode, values: a.values.map((v) => ({ id: v.id, name: v.name, colorHex: v.colorHex ?? "#d4af37" })) });
  const remove = async (a: AttributeRow) => {
    const yes = await confirm({ title: "Eliminar atributo", description: `«${a.name}» se quita de todos los productos que lo usan. Las variantes ya creadas se conservan.`, confirmLabel: "Eliminar", tone: "danger" });
    if (!yes) return;
    const result = await deleteAttributeAction(slug, a.id);
    toast(result.message ?? "Listo", result.ok ? "success" : "error");
    if (result.ok) router.refresh();
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{attributes.length === 0 ? "Aún no hay atributos." : `${attributes.length} ${attributes.length === 1 ? "atributo" : "atributos"}`}</p>
        <Button type="button" onClick={() => setDraft({ ...EMPTY, values: [{ name: "", colorHex: "#d4af37" }] })}>
          <Plus aria-hidden="true" className="size-4" /> Nuevo atributo
        </Button>
      </div>

      {attributes.length === 0 ? (
        <EmptyState
          mark="page"
          remember
          headingLevel={2}
          title="Aún no tienes atributos"
          description="Crea «Talla» o «Color» una vez y úsalos en todos tus productos para generar sus variantes."
          icon={<Palette />}
          preview={ATTRIBUTE_PREVIEW}
          action={<Button type="button" onClick={() => setDraft({ ...EMPTY })}><Plus aria-hidden="true" className="size-4" /> Crear el primero</Button>}
          secondaryAction={<Link href={`/${slug}/inventario/productos`} className={buttonVariants({ variant: "outline", size: "sm", className: "h-[34px] border border-border" })}>Ver los productos</Link>}
          highlights={[
            { icon: <Shirt />, title: "Variantes sin repetir", text: "Camiseta en S, M y L: cada una con su stock." },
            { icon: <Ruler />, title: "Un atributo, muchos productos", text: "Defines «Talla» una vez y lo usas donde quieras." },
            { icon: <Type />, title: "Pedidos a medida", text: "Texto o arte que se escribe al vender (merchandising)." },
          ]}
        />
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {attributes.map((a) => (
            <li key={a.id} className="grid gap-2 rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <b className="block truncate text-sm font-semibold">{a.name}</b>
                  <span className="text-xs text-muted-foreground">{MODE_LABELS[a.variantMode].label}</span>
                </div>
                <span className="flex shrink-0 gap-0.5">
                  <button type="button" aria-label={`Editar ${a.name}`} onClick={() => edit(a)} className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:size-11"><Pencil aria-hidden="true" className="size-4" /></button>
                  <button type="button" aria-label={`Eliminar ${a.name}`} onClick={() => void remove(a)} className="grid size-8 place-items-center rounded-md text-danger hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:size-11"><Trash2 aria-hidden="true" className="size-4" /></button>
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {a.variantMode === "CUSTOM" ? <Badge tone="neutral">Se escribe al vender</Badge> : null}
                {a.values.map((v) => (
                  <Badge key={v.id} tone="neutral">
                    {a.display === "COLOR" && v.colorHex ? <span aria-hidden="true" className="me-1 inline-block size-2.5 rounded-full border border-border" style={{ background: v.colorHex }} /> : null}
                    {v.name}
                  </Badge>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      <AttributeDialog slug={slug} draft={draft} setDraft={setDraft} onSaved={(m) => { toast(m, "success"); router.refresh(); }} />
      {confirmDialog}
    </div>
  );
}

function AttributeDialog({ slug, draft, setDraft, onSaved }: { slug: string; draft: Draft | null; setDraft: (d: Draft | null) => void; onSaved: (message: string) => void }) {
  const set = (patch: Partial<Draft>) => draft && setDraft({ ...draft, ...patch });
  const setValue = (index: number, patch: Partial<Draft["values"][number]>) => draft && set({ values: draft.values.map((v, i) => (i === index ? { ...v, ...patch } : v)) });
  return (
    <FormDialog
      open={draft !== null}
      onOpenChange={(open) => !open && setDraft(null)}
      title={draft?.id ? "Editar atributo" : "Nuevo atributo"}
      submitLabel={draft?.id ? "Guardar" : "Crear"}
      size="lg"
      onSubmit={async () => {
        if (!draft) return;
        const result = await saveAttributeAction(slug, { id: draft.id, name: draft.name, display: draft.display, variantMode: draft.variantMode, values: draft.values.filter((v) => v.name.trim()).map((v) => ({ id: v.id, name: v.name, colorHex: v.colorHex })) });
        if (!result.ok) return { ok: false, message: result.message };
        return { ok: true, message: result.message };
      }}
      onSuccess={({ message }) => onSaved(message ?? "Guardado")}
    >
      {draft ? (
        <>
          <Field label="Nombre" required>{(c) => <Input {...c} value={draft.name} maxLength={60} autoFocus placeholder="Talla, Color, Material…" onChange={(e) => set({ name: e.target.value })} />}</Field>
          <Field label="¿Qué hace?" hint={MODE_LABELS[draft.variantMode].hint}>
            {(c) => (
              <Select {...c} value={draft.variantMode} onChange={(e) => set({ variantMode: e.target.value as VariantMode })}>
                {(Object.keys(MODE_LABELS) as VariantMode[]).map((m) => <option key={m} value={m}>{MODE_LABELS[m].label}</option>)}
              </Select>
            )}
          </Field>
          {draft.variantMode !== "CUSTOM" ? (
            <>
              <Field label="Cómo se muestra">
                {(c) => (
                  <Select {...c} value={draft.display} onChange={(e) => set({ display: e.target.value as AttributeDisplay })}>
                    {(Object.keys(DISPLAY_LABELS) as AttributeDisplay[]).map((d) => <option key={d} value={d}>{DISPLAY_LABELS[d]}</option>)}
                  </Select>
                )}
              </Field>
              <fieldset className="grid gap-2">
                <legend className="mb-1 text-ui font-medium">Valores</legend>
                {draft.values.map((v, index) => (
                  <div key={v.id ?? index} className="flex items-center gap-2">
                    {draft.display === "COLOR" ? <input type="color" aria-label={`Color de ${v.name || "valor"}`} value={v.colorHex} onChange={(e) => setValue(index, { colorHex: e.target.value })} className="size-9 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-0.5" /> : null}
                    <Input aria-label={`Valor ${index + 1}`} value={v.name} maxLength={60} placeholder={`Valor ${index + 1}`} onChange={(e) => setValue(index, { name: e.target.value })} />
                    <button type="button" aria-label={`Quitar el valor ${v.name || index + 1}`} onClick={() => set({ values: draft.values.filter((_, i) => i !== index) })} className="grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:size-11"><X aria-hidden="true" className="size-4" /></button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => set({ values: [...draft.values, { name: "", colorHex: "#d4af37" }] })}><Plus aria-hidden="true" className="size-4" /> Agregar valor</Button>
              </fieldset>
            </>
          ) : null}
        </>
      ) : null}
    </FormDialog>
  );
}
