"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, Sparkles, Star, X } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Checkbox } from "@/components/atoms/checkbox";
import { Chip, ChipRow } from "@/components/atoms/chip";
import { Input } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { Switch } from "@/components/atoms/switch";
import { Textarea } from "@/components/atoms/textarea";
import { Alert } from "@/components/molecules/alert";
import { Field } from "@/components/molecules/field";
import { MoneyInput } from "@/components/molecules/money-input";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { useToast } from "@/components/molecules/toast";
import type { AttributeRow } from "@/lib/business/catalog/attributes-db";
import { KIND_LABELS } from "@/lib/business/catalog/catalog-kinds";
import { categoryPath, type CategoryRow } from "@/lib/business/catalog/category-tree";
import { generateInternalEan13, marginPct, priceWithoutTax, suggestSku, TAX_OPTIONS, taxOptionOf, UNIT_OPTIONS, type ProductFormDraft, type ProductFormErrors } from "@/lib/business/catalog/product-form";
import type { ProductKindValue } from "@/lib/business/catalog/products-db";
import type { SaveFormResult } from "@/lib/business/catalog/product-form-db";
import { variantCount, type AttributeLine } from "@/lib/business/catalog/variant-matrix";
import { cn } from "@/lib/utils";
import { saveProductFormAction } from "@/app/[tenant]/(app)/inventario/productos/form-actions";
import { ProductPreview } from "./product-preview";

type TabKey = "info" | "attrs" | "stock" | "web";
const TABS: { key: TabKey; label: string }[] = [
  { key: "info", label: "Información general" },
  { key: "attrs", label: "Atributos y variantes" },
  { key: "stock", label: "Inventario" },
  { key: "web", label: "Comercio electrónico" },
];
/** Qué pestaña lleva cada campo con error (para abrirla sola). */
const TAB_OF: Partial<Record<keyof ProductFormDraft, TabKey>> = { initialStock: "stock", minStock: "stock", maxStock: "stock", reorderPoint: "stock" };

const toInt = (value: string): number | null => (value.trim() === "" ? null : Number(value.replace(/\D/g, "")));

/**
 * Formulario de producto en página (no en modal): a la izquierda la información en pestañas y a la derecha la previsualización, que se
 * queda a la vista al bajar. Inspirado en el formulario de producto de Odoo (casillas de dónde se vende, pestañas, atributos y
 * variantes) con el diseño de Nexus. El guardado vuelve a validar todo en el servidor.
 */
export default function ProductForm({
  slug,
  productId,
  initial,
  kinds,
  categories,
  attributes,
  variantNames,
  stock,
  imageUrl,
}: {
  slug: string;
  productId: string | null;
  initial: ProductFormDraft;
  kinds: ProductKindValue[];
  categories: CategoryRow[];
  attributes: AttributeRow[];
  variantNames: string[];
  stock: number | null;
  imageUrl: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [draft, setDraft] = useState<ProductFormDraft>(initial);
  const [tab, setTab] = useState<TabKey>("info");
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const base = `/${slug}/inventario/productos`;
  const set = <K extends keyof ProductFormDraft>(key: K, value: ProductFormDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const isProduct = draft.kind === "PRODUCT";
  const tax = taxOptionOf(draft.taxCategory, draft.taxRatePct);
  const margin = marginPct(draft.price, draft.cost, draft.taxRatePct, draft.taxCategory);

  const lines: AttributeLine[] = useMemo(
    () =>
      draft.attributeLines.flatMap((line) => {
        const attribute = attributes.find((a) => a.id === line.attributeId);
        return attribute ? [{ attributeId: attribute.id, attributeName: attribute.name, variantMode: attribute.variantMode, values: attribute.values.filter((v) => line.valueIds.includes(v.id)).map((v) => ({ id: v.id, name: v.name })) }] : [];
      }),
    [draft.attributeLines, attributes],
  );
  const count = variantCount(lines);

  const pick = (selected: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(selected ? URL.createObjectURL(selected) : null);
  };

  const save = () =>
    start(async () => {
      setBanner(null);
      setErrors({});
      const form = new FormData();
      form.set("draft", JSON.stringify(draft));
      if (file) form.set("image", file);
      const result: SaveFormResult = await saveProductFormAction(slug, productId, form).catch((): SaveFormResult => ({ ok: false, message: "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo." }));
      if (!result.ok) {
        setBanner(result.message);
        const fields = (result.errors ?? {}) as ProductFormErrors;
        setErrors(fields);
        const first = Object.keys(fields)[0] as keyof ProductFormDraft | undefined;
        setTab(first ? (TAB_OF[first] ?? "info") : "info");
        return;
      }
      toast(result.message, "success");
      if (productId) router.refresh();
      else router.push(`${base}/${result.id}`);
    });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className="grid gap-5"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Link href={base} aria-label="Volver al catálogo" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft aria-hidden="true" className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-xl font-bold">{productId ? draft.name || "Producto" : `Nuevo ${KIND_LABELS[draft.kind].one.toLowerCase()}`}</h1>
          <p className="text-sm text-muted-foreground">{productId ? "Edita la información; la previsualización muestra cómo se verá." : "Completa la información; a la derecha ves cómo se verá."}</p>
        </div>
        <button type="button" aria-pressed={draft.favorite} aria-label={draft.favorite ? "Quitar de favoritos" : "Marcar como favorito"} onClick={() => set("favorite", !draft.favorite)} className="grid size-10 place-items-center rounded-md hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring">
          <Star aria-hidden="true" className={cn("size-5", draft.favorite ? "fill-accent text-accent" : "text-muted-foreground")} />
        </button>
        <Link href={base} className={buttonVariants({ variant: "outline" })}>Cancelar</Link>
        <Button type="submit" loading={pending} loadingText="Guardando…">{productId ? "Guardar cambios" : "Crear producto"}</Button>
      </div>

      {banner ? <Alert tone="danger">{banner}</Alert> : null}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 rounded-xl border border-border bg-surface p-4 sm:p-5">
          {kinds.length > 1 ? (
            <SegmentedControl ariaLabel="Tipo" value={draft.kind} onChange={(kind) => set("kind", kind)} options={kinds.map((k) => ({ value: k, label: KIND_LABELS[k].one }))} />
          ) : null}

          <fieldset className="flex flex-wrap gap-x-6 gap-y-3">
            <legend className="sr-only">Dónde se usa</legend>
            {([
              ["sellable", "Se vende"],
              ["purchasable", "Se compra"],
              ["posEnabled", "Punto de venta"],
              ["publishedOnline", "Tienda en línea"],
              ["customizable", "A medida (personalizable)"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2 text-ui">
                <Checkbox checked={draft[key]} onCheckedChange={(v) => set(key, v === true)} />
                {label}
              </label>
            ))}
          </fieldset>

          <div role="tablist" aria-label="Secciones del producto" className="-mb-2 flex gap-1 overflow-x-auto border-b border-border">
            {TABS.map((t) => (
              <button key={t.key} type="button" role="tab" id={`pf-tab-${t.key}`} aria-selected={tab === t.key} aria-controls={`pf-panel-${t.key}`} onClick={() => setTab(t.key)} className={cn("-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring pointer-coarse:min-h-11", tab === t.key ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === "info" ? (
            <div role="tabpanel" id="pf-panel-info" aria-labelledby="pf-tab-info" className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="grid min-w-0 gap-4">
                  <Field label="Nombre" required error={errors.name}>{(c) => <Input {...c} value={draft.name} maxLength={120} placeholder="Ej.: Camiseta básica" onChange={(e) => set("name", e.target.value)} />}</Field>
                  <Field label="Descripción" optional error={errors.description}>{(c) => <Textarea {...c} value={draft.description} maxLength={500} onChange={(e) => set("description", e.target.value)} />}</Field>
                </div>
                <div className="grid content-start gap-1.5">
                  <span className="text-ui font-medium">Foto</span>
                  <button type="button" onClick={() => fileRef.current?.click()} aria-label="Elegir la foto del producto" className="group relative grid size-36 place-items-center overflow-hidden rounded-lg border border-dashed border-border-input bg-surface-muted text-muted-foreground outline-none hover:border-border-input-hover focus-visible:outline-2 focus-visible:outline-ring">
                    {preview ?? imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- vista previa de un archivo local o del negocio
                      <img src={preview ?? imageUrl ?? ""} alt="" className="absolute inset-0 size-full max-w-none object-cover" />
                    ) : (
                      <span className="grid justify-items-center gap-1 text-xs"><ImagePlus aria-hidden="true" className="size-6" />Subir foto</span>
                    )}
                  </button>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
                  {file ? <button type="button" onClick={() => { pick(null); if (fileRef.current) fileRef.current.value = ""; }} className="inline-flex items-center gap-1 justify-self-start text-xs text-muted-foreground hover:text-foreground"><X aria-hidden="true" className="size-3" /> Quitar</button> : <span className="text-xs text-muted-foreground">JPG, PNG o WebP · máx. 5 MB</span>}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Categoría" optional error={errors.categoryId} hint={categories.length === 0 ? "Aún no hay categorías: créalas en Configuración › Categorías." : undefined}>
                  {(c) => (
                    <Select {...c} value={draft.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                      <option value="">Sin categoría</option>
                      {categories.filter((x) => !x.parentId).sort((a, b) => a.position - b.position).flatMap((x) => [
                        <option key={x.id} value={x.id}>{x.name}</option>,
                        ...categories.filter((s) => s.parentId === x.id).map((s) => <option key={s.id} value={s.id}>{categoryPath(categories, s.id)}</option>),
                      ])}
                    </Select>
                  )}
                </Field>
                <Field label="Marca" optional>{(c) => <Input {...c} value={draft.brand} maxLength={60} onChange={(e) => set("brand", e.target.value)} />}</Field>
                <Field label="Referencia (SKU)" optional error={errors.sku}>
                  {(c) => (
                    <div className="flex gap-2">
                      <Input {...c} value={draft.sku} maxLength={40} onChange={(e) => set("sku", e.target.value)} />
                      <Button type="button" variant="outline" onClick={() => set("sku", suggestSku(draft.name))}><Sparkles aria-hidden="true" className="size-4" /> Auto</Button>
                    </div>
                  )}
                </Field>
                <Field label="Código de barras" optional error={errors.barcode} hint="Escanéalo aquí o genera uno propio.">
                  {(c) => (
                    <div className="flex gap-2">
                      <Input {...c} value={draft.barcode} maxLength={48} inputMode="numeric" onChange={(e) => set("barcode", e.target.value)} />
                      <Button type="button" variant="outline" onClick={() => set("barcode", generateInternalEan13())}><Sparkles aria-hidden="true" className="size-4" /> Auto</Button>
                    </div>
                  )}
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <Field label="Precio de venta" required error={errors.price} hint={draft.taxCategory === "GRAVADO" && draft.price ? `Sin IVA: ${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(priceWithoutTax(draft.price, draft.taxRatePct, draft.taxCategory) ?? 0)}` : undefined}>
                  {(c) => <MoneyInput id={c.id} aria-describedby={c["aria-describedby"]} value={draft.price} onValueChange={(v) => set("price", v)} />}
                </Field>
                <Field label="Impuesto">
                  {(c) => (
                    <Select {...c} value={tax} onChange={(e) => { const o = TAX_OPTIONS.find((x) => x.value === e.target.value); if (o) setDraft((d) => ({ ...d, taxCategory: o.category, taxRatePct: o.rate })); }}>
                      {TAX_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      {!TAX_OPTIONS.some((o) => o.value === tax) ? <option value={tax}>{`IVA ${draft.taxRatePct} %`}</option> : null}
                    </Select>
                  )}
                </Field>
                <Field label="Costo" optional error={errors.cost} hint={margin != null ? `Margen ${margin.toLocaleString("es-CO")} %` : "Para ver tu margen."}>
                  {(c) => <MoneyInput id={c.id} aria-describedby={c["aria-describedby"]} value={draft.cost} onValueChange={(v) => set("cost", v)} />}
                </Field>
              </div>

              {draft.kind === "PLAN" ? <Field label="Días de vigencia" required error={errors.durationDays}>{(c) => <Input {...c} inputMode="numeric" value={draft.durationDays ?? ""} onChange={(e) => set("durationDays", toInt(e.target.value))} />}</Field> : null}
              {draft.kind === "SERVICE" || draft.kind === "TOUR" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Duración (minutos)" optional error={errors.durationMinutes}>{(c) => <Input {...c} inputMode="numeric" value={draft.durationMinutes ?? ""} onChange={(e) => set("durationMinutes", toInt(e.target.value))} />}</Field>
                  <Field label="Cupo" optional error={errors.capacity}>{(c) => <Input {...c} inputMode="numeric" value={draft.capacity ?? ""} onChange={(e) => set("capacity", toInt(e.target.value))} />}</Field>
                </div>
              ) : null}

              <Field label="Notas internas" optional hint="Solo las ve tu equipo.">{(c) => <Textarea {...c} value={draft.internalNotes} maxLength={2000} onChange={(e) => set("internalNotes", e.target.value)} />}</Field>
            </div>
          ) : null}

          {tab === "attrs" ? (
            <div role="tabpanel" id="pf-panel-attrs" aria-labelledby="pf-tab-attrs" className="grid gap-4">
              {attributes.length === 0 ? (
                <Alert tone="info">Aún no hay atributos. Crea «Talla» o «Color» en <Link href={`/${slug}/inventario/atributos`} className="font-medium underline">Configuración › Atributos</Link> y vuelve aquí.</Alert>
              ) : (
                <>
                  {draft.attributeLines.map((line) => {
                    const attribute = attributes.find((a) => a.id === line.attributeId);
                    if (!attribute) return null;
                    return (
                      <div key={line.attributeId} className="grid gap-2 rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <b className="text-sm">{attribute.name}</b>
                          <button type="button" aria-label={`Quitar ${attribute.name}`} onClick={() => set("attributeLines", draft.attributeLines.filter((l) => l.attributeId !== line.attributeId))} className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:size-11"><X aria-hidden="true" className="size-4" /></button>
                        </div>
                        {attribute.variantMode === "CUSTOM" ? (
                          <p className="text-ui text-muted-foreground">Se escribe al vender (producto a medida).</p>
                        ) : (
                          <ChipRow className="flex-wrap">
                            {attribute.values.map((v) => (
                              <Chip key={v.id} selected={line.valueIds.includes(v.id)} onClick={() => set("attributeLines", draft.attributeLines.map((l) => (l.attributeId === line.attributeId ? { ...l, valueIds: l.valueIds.includes(v.id) ? l.valueIds.filter((x) => x !== v.id) : [...l.valueIds, v.id] } : l)))}>
                                {attribute.display === "COLOR" && v.colorHex ? <span aria-hidden="true" className="size-3 rounded-full border border-border" style={{ background: v.colorHex }} /> : null}
                                {v.name}
                              </Chip>
                            ))}
                          </ChipRow>
                        )}
                      </div>
                    );
                  })}
                  <Field label="Agregar atributo" hint={draft.customizable ? undefined : "Los atributos «personalizados» solo salen en productos marcados como a medida."}>
                    {(c) => (
                      <Select {...c} value="" placeholder="Elige un atributo" onChange={(e) => e.target.value && set("attributeLines", [...draft.attributeLines, { attributeId: e.target.value, valueIds: [] }])}>
                        <option value="">Elige un atributo</option>
                        {attributes.filter((a) => !draft.attributeLines.some((l) => l.attributeId === a.id) && (a.variantMode !== "CUSTOM" || draft.customizable)).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </Select>
                    )}
                  </Field>
                  {count > 0 ? (
                    <label className="flex cursor-pointer items-start gap-2 text-ui">
                      <Checkbox checked={draft.generateVariants} onCheckedChange={(v) => set("generateVariants", v === true)} className="mt-0.5" />
                      <span>Crear las variantes al guardar <span className="text-muted-foreground">({count} {count === 1 ? "variante" : "variantes"}; las que ya existen no se tocan)</span></span>
                    </label>
                  ) : null}
                </>
              )}
              {variantNames.length > 0 ? (
                <div className="grid gap-1.5">
                  <p className="text-ui font-medium">Variantes actuales ({variantNames.length})</p>
                  <ul className="flex flex-wrap gap-1.5">{variantNames.map((n) => <li key={n} className="rounded-md bg-surface-muted px-2 py-1 text-xs">{n}</li>)}</ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === "stock" ? (
            <div role="tabpanel" id="pf-panel-stock" aria-labelledby="pf-tab-stock" className="grid gap-4">
              {isProduct ? (
                <>
                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border p-3">
                    <span><b className="block text-sm">Controlar inventario</b><span className="text-ui text-muted-foreground">Descuenta existencias en cada venta y avisa cuando se acaben.</span></span>
                    <Switch checked={draft.trackStock} onCheckedChange={(v) => set("trackStock", v)} aria-label="Controlar inventario" />
                  </label>
                  {draft.trackStock ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {productId ? (
                        <Field label="Existencias actuales" hint="Se cambian con movimientos, traspasos o conteos.">{() => <span className="flex h-[var(--control-h)] items-center font-mono text-sm tabular-nums">{stock ?? 0}</span>}</Field>
                      ) : (
                        <Field label="Existencias iniciales" optional error={errors.initialStock}>{(c) => <Input {...c} inputMode="numeric" value={draft.initialStock ?? ""} onChange={(e) => set("initialStock", toInt(e.target.value))} />}</Field>
                      )}
                      <Field label="Stock mínimo" optional error={errors.minStock} hint="Con esta cantidad o menos aparece «por reponer».">{(c) => <Input {...c} inputMode="numeric" value={draft.minStock ?? ""} onChange={(e) => set("minStock", toInt(e.target.value))} />}</Field>
                      <Field label="Stock máximo" optional error={errors.maxStock}>{(c) => <Input {...c} inputMode="numeric" value={draft.maxStock ?? ""} onChange={(e) => set("maxStock", toInt(e.target.value))} />}</Field>
                      <Field label="Punto de reposición" optional error={errors.reorderPoint} hint="Cuando baja a este número conviene pedir más.">{(c) => <Input {...c} inputMode="numeric" value={draft.reorderPoint ?? ""} onChange={(e) => set("reorderPoint", toInt(e.target.value))} />}</Field>
                    </div>
                  ) : null}
                  <Field label="Unidad de medida">
                    {(c) => (
                      <Select {...c} value={draft.unitCode} onChange={(e) => set("unitCode", e.target.value)} className="max-w-xs">
                        {UNIT_OPTIONS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                      </Select>
                    )}
                  </Field>
                </>
              ) : (
                <Alert tone="info">Este tipo no lleva inventario: solo los productos descuentan existencias.</Alert>
              )}
            </div>
          ) : null}

          {tab === "web" ? (
            <div role="tabpanel" id="pf-panel-web" aria-labelledby="pf-tab-web" className="grid gap-3">
              {([
                ["publishedOnline", "Publicado en la tienda en línea", "Aparece en el sitio de tu negocio y se puede pedir."],
                ["favorite", "Destacado", "Sale primero en el catálogo y en la tienda."],
                ["active", "Disponible", "Si lo apagas, no se vende en ningún canal (queda en el catálogo)."],
              ] as const).map(([key, title, hint]) => (
                <label key={key} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border p-3">
                  <span><b className="block text-sm">{title}</b><span className="text-ui text-muted-foreground">{hint}</span></span>
                  <Switch checked={draft[key]} onCheckedChange={(v) => set(key, v)} aria-label={title} />
                </label>
              ))}
            </div>
          ) : null}
        </div>

        {/* Pegajosa, pero nunca más alta que la pantalla: si la previsualización crece (foto, varias vistas), se desplaza por dentro en vez de cortarse. */}
        <div className="min-w-0 lg:sticky lg:top-[72px] lg:max-h-[calc(100dvh-88px)] lg:overflow-y-auto lg:overscroll-contain">
          <ProductPreview
            data={{
              name: draft.name,
              price: draft.price,
              categoryLabel: categoryPath(categories, draft.categoryId),
              brand: draft.brand,
              imageSrc: preview ?? imageUrl,
              favorite: draft.favorite,
              trackStock: isProduct && draft.trackStock,
              stock: productId ? stock : (draft.initialStock ?? 0),
              posEnabled: draft.posEnabled && draft.sellable,
              publishedOnline: draft.publishedOnline && draft.sellable,
              active: draft.active,
              customizable: draft.customizable,
            }}
          />
        </div>
      </div>
    </form>
  );
}

