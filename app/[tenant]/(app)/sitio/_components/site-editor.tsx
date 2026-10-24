"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Alert } from "@/components/molecules/alert";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Switch } from "@/components/atoms/switch";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { SiteView } from "@/components/organisms/site-view";
import { saveSiteAction } from "@/app/[tenant]/(app)/sitio/actions";
import { TEMPLATES, seoChecklist, type SiteData, type TemplateKey } from "@/lib/site/site";
import type { SiteEditor as EditorData } from "@/lib/site/site-db";

const peso = (n: number) => n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

/** Editor del mini-sitio: a la izquierda lo que se cambia, a la derecha la vista previa en vivo. */
export default function SiteEditor({ slug, baseUrl, initial }: { slug: string; baseUrl: string; initial: EditorData }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [siteSlug, setSiteSlug] = useState(initial.site.slug);
  const [template, setTemplate] = useState<TemplateKey>(initial.site.template);
  const [f, setF] = useState(initial.raw);
  const [accent, setAccent] = useState(initial.site.accent);
  const [showCatalog, setShowCatalog] = useState(initial.site.showCatalog);
  const [showMap, setShowMap] = useState(initial.site.showMap);
  const [published, setPublished] = useState(() => new Set(initial.catalog.filter((c) => c.published).map((c) => c.id)));
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  const preview: SiteData = useMemo(() => {
    const b = initial.site;
    return { ...b, slug: siteSlug, template, accent, showCatalog, showMap, title: f.title.trim() || b.title, description: f.description.trim() || b.description, heroTitle: f.heroTitle.trim() || b.heroTitle, heroSubtitle: f.heroSubtitle.trim() || b.heroSubtitle, about: f.about.trim(), products: initial.catalog.filter((c) => published.has(c.id)).map((c) => ({ id: c.id, name: c.name, description: null, price: c.price, category: null, imageUrl: null })) };
  }, [initial, siteSlug, template, accent, showCatalog, showMap, f, published]);
  const checks = seoChecklist(preview);

  const save = () =>
    start(async () => {
      setError(null);
      const r = await saveSiteAction(slug, { enabled, siteSlug, template, ...f, accent, showCatalog, showMap }, [...published]);
      if (!r.ok) return setError({ message: r.message, field: r.field });
      toast(r.message, "success");
      router.refresh();
    });
  const publicUrl = `${baseUrl}/s/${siteSlug}`;
  const fieldError = (name: string) => (error?.field === name ? error.message : undefined);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,480px)_1fr]">
      <div className="grid content-start gap-4">
        <section aria-labelledby="site-state" className="grid gap-3 rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center gap-3">
            <h2 id="site-state" className="font-display text-[15px] font-semibold">Publicación</h2>
            <label className="ml-auto flex items-center gap-2 text-[13px]"><Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Sitio publicado" />{enabled ? "Publicado" : "Sin publicar"}</label>
          </div>
          <Field label="Dirección del sitio" required error={fieldError("siteSlug")} hint={`Tu sitio: ${publicUrl}`}>{(c) => <input {...c} value={siteSlug} onChange={(e) => setSiteSlug(e.target.value.toLowerCase())} autoComplete="off" className={inputClasses} />}</Field>
          {enabled ? <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium underline underline-offset-2">Ver mi sitio publicado</a> : <p className="text-[12.5px] text-muted-foreground">Mientras no esté publicado, nadie lo ve (ni los buscadores).</p>}
        </section>

        <fieldset className="grid gap-2 rounded-lg border border-border bg-surface p-4">
          <legend className="px-1 font-display text-[15px] font-semibold">Plantilla</legend>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(TEMPLATES) as TemplateKey[]).map((k) => (
              <label key={k} className={`flex cursor-pointer items-center gap-2 rounded-md border p-2.5 text-[13px] ${template === k ? "border-foreground" : "border-border"}`}>
                <input type="radio" name="template" value={k} checked={template === k} onChange={() => setTemplate(k)} className="sr-only" />
                <span aria-hidden="true" className="size-5 rounded-sm border border-border" style={{ background: TEMPLATES[k].bg }} />
                {TEMPLATES[k].label}
                {template === k ? <Check aria-hidden="true" className="ml-auto size-4" /> : null}
              </label>
            ))}
          </div>
          <Field label="Color de acento" hint="Botones y detalles. Formato #D4AF37." error={fieldError("accent")}>{(c) => <input {...c} value={accent} onChange={(e) => setAccent(e.target.value)} maxLength={7} autoComplete="off" className={`${inputClasses} font-mono`} />}</Field>
        </fieldset>

        <section aria-labelledby="site-texts" className="grid gap-3 rounded-lg border border-border bg-surface p-4">
          <h2 id="site-texts" className="font-display text-[15px] font-semibold">Textos</h2>
          <Field label="Título para buscadores" hint={`${(f.title || preview.title).length}/60 · recomendado 10–60`} error={fieldError("title")}>{(c) => <input {...c} value={f.title} onChange={set("title")} maxLength={70} placeholder={initial.site.title} className={inputClasses} />}</Field>
          <Field label="Descripción para buscadores" hint={`${(f.description || preview.description).length}/160 · recomendado 70–160`} error={fieldError("description")}>{(c) => <textarea {...c} value={f.description} onChange={set("description")} maxLength={200} rows={3} placeholder={initial.site.description} className={`${inputClasses} h-auto`} />}</Field>
          <Field label="Título principal" error={fieldError("heroTitle")}>{(c) => <input {...c} value={f.heroTitle} onChange={set("heroTitle")} maxLength={80} placeholder={initial.site.heroTitle} className={inputClasses} />}</Field>
          <Field label="Subtítulo" error={fieldError("heroSubtitle")}>{(c) => <input {...c} value={f.heroSubtitle} onChange={set("heroSubtitle")} maxLength={140} placeholder={initial.site.heroSubtitle} className={inputClasses} />}</Field>
          <Field label="Quiénes somos" optional error={fieldError("about")}>{(c) => <textarea {...c} value={f.about} onChange={set("about")} maxLength={1200} rows={4} className={`${inputClasses} h-auto`} />}</Field>
        </section>

        <section aria-labelledby="site-catalog" className="grid gap-3 rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center gap-3">
            <h2 id="site-catalog" className="font-display text-[15px] font-semibold">Catálogo y mapa</h2>
            <label className="ml-auto flex items-center gap-2 text-[13px]"><Switch checked={showCatalog} onCheckedChange={setShowCatalog} aria-label="Mostrar el catálogo" />Catálogo</label>
            <label className="flex items-center gap-2 text-[13px]"><Switch checked={showMap} onCheckedChange={setShowMap} aria-label="Mostrar el mapa" />Mapa</label>
          </div>
          {showCatalog ? (
            initial.catalog.length === 0 ? <p className="text-[13px] text-muted-foreground">Aún no tienes productos o servicios. Cárgalos en Catálogo y vuelve aquí a elegir cuáles salen en tu sitio.</p> : (
              <ul className="grid max-h-56 gap-1 overflow-y-auto" aria-label="Productos del sitio">
                {initial.catalog.map((c) => (
                  <li key={c.id}>
                    <label className="flex items-center gap-2 text-[13px]">
                      <input type="checkbox" checked={published.has(c.id)} onChange={(e) => setPublished((s) => { const n = new Set(s); if (e.target.checked) n.add(c.id); else n.delete(c.id); return n; })} />
                      <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      <span className="font-mono text-muted-foreground">{peso(c.price)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </section>

        <section aria-labelledby="site-seo" className="grid gap-2 rounded-lg border border-border bg-surface p-4">
          <h2 id="site-seo" className="font-display text-[15px] font-semibold">Para que te encuentren</h2>
          <ul className="grid gap-1 text-[13px]">
            {checks.map((c) => (
              <li key={c.text} className="flex items-center gap-2">
                {c.ok ? <Check aria-hidden="true" className="size-4 text-success" /> : <X aria-hidden="true" className="size-4 text-danger" />}
                <span className={c.ok ? "" : "font-medium"}>{c.text}</span>
                <span className="sr-only">{c.ok ? "Cumple" : "Falta"}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">El sitio incluye automáticamente mapa del sitio (sitemap), robots, datos estructurados de negocio local y de producto, y etiquetas para compartir.</p>
        </section>

        {error && !error.field ? <Alert tone="danger">{error.message}</Alert> : null}
        <button type="button" disabled={pending} onClick={save} className={buttonVariants({ size: "lg" })}>{pending ? "Guardando…" : "Guardar sitio"}</button>
      </div>

      <section aria-label="Vista previa del sitio" tabIndex={0} className="relative max-h-[820px] overflow-y-auto rounded-lg border border-border">
        <SiteView site={preview} preview />
      </section>
    </div>
  );
}
