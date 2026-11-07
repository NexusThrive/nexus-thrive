"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Plus, Star } from "lucide-react";
import { Alert } from "@/components/molecules/alert";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { QrCode } from "@/components/atoms/qr-code";
import { EmptyState } from "@/components/molecules/empty-state";
import { Field } from "@/components/molecules/field";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { useToast } from "@/components/molecules/toast";
import { FormDialog } from "@/components/organisms/form-sheet";
import { AdaptiveTable } from "@/components/organisms/adaptive-table";
import { createLinkAction, handleReviewAction, toggleLinkAction, type GrowthResult } from "@/app/[tenant]/(app)/presencia/crecimiento/actions";
import { googleReviewUrl } from "@/lib/business/growth/growth";
import type { LinkRow, ReviewRow } from "@/lib/business/growth/growth-db";
import type { OriginRow } from "@/lib/business/growth/growth";
import { formatCurrency } from "@/lib/foundation/format";

type Tab = "links" | "report" | "reviews";
const Stars = ({ n }: { n: number }) => <span role="img" aria-label={`${n} de 5 estrellas`} className="inline-flex">{[1, 2, 3, 4, 5].map((i) => <Star key={i} aria-hidden="true" className={`size-3.5 ${i <= n ? "fill-accent text-accent" : "text-border-strong"}`} />)}</span>;

export default function GrowthView({ slug, baseUrl, siteSlug, siteEnabled, links, report, reviews, reputation, googlePlaceId }: { slug: string; baseUrl: string; siteSlug: string; siteEnabled: boolean; links: LinkRow[]; report: { rows: OriginRow[]; totals: { spend: number; leads: number; orders: number; revenue: number } }; reviews: ReviewRow[]; reputation: { average: number; count: number; alerts: number } | null; googlePlaceId: string | null }) {
  const [tab, setTab] = useState<Tab>("links");
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const run = async (fn: () => Promise<GrowthResult>) => {
    const r = await fn();
    toast(r.message, r.ok ? "success" : "error");
    if (r.ok) router.refresh();
  };
  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${what} copiado`, "success");
    } catch {
      toast("No se pudo copiar: selecciónalo y cópialo a mano", "error");
    }
  };
  const reviewUrl = `${baseUrl}/s/${siteSlug}/resena`;
  const alerts = reviews.filter((r) => r.status === "ALERTED");
  return (
    <div className="grid gap-4">
      {!siteEnabled ? <Alert tone="warning">Tu sitio aún no está publicado: los enlaces y la reseña funcionan cuando lo publiques en «Mi sitio web».</Alert> : null}
      <div className="max-w-full overflow-x-auto pb-1">
        <SegmentedControl ariaLabel="Sección" value={tab} onChange={setTab} options={[{ value: "links", label: "Enlaces de campaña" }, { value: "report", label: "De dónde vienen" }, { value: "reviews", label: "Reseñas", count: alerts.length || undefined }]} />
      </div>

      {tab === "links" ? (
        <div className="grid gap-3">
          <button type="button" onClick={() => setCreating(true)} className={buttonVariants({ className: "justify-self-end" })}><Plus aria-hidden="true" className="size-4" /> Nuevo enlace</button>
          {links.length === 0 ? <EmptyState title="Aún no tienes enlaces de campaña" description="Crea un enlace corto por cada campaña (Instagram, correo, volantes con QR). Cada uno marca de dónde llegó el cliente y cuenta los clics." action={<button type="button" onClick={() => setCreating(true)} className={buttonVariants()}><Plus aria-hidden="true" className="size-4" /> Nuevo enlace</button>} /> : (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
              {links.map((l) => (
                <li key={l.id} className="grid gap-1 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-ui font-medium">{l.name}</b>
                    <Badge variant={l.active ? "success" : "secondary"}>{l.active ? "Activo" : "Apagado"}</Badge>
                    <span className="ml-auto font-mono text-ui tabular-nums">{l.clicks} clics · {formatCurrency(l.spend)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{baseUrl}/l/{l.code}</span>
                    <span>· {l.utmSource} / {l.utmMedium} / {l.utmCampaign}</span>
                    <span className="ml-auto flex gap-2">
                      <button type="button" aria-label={`Copiar el enlace de ${l.name}`} onClick={() => copy(`${baseUrl}/l/${l.code}`, "Enlace")} className={buttonVariants({ variant: "outline", size: "sm" })}><Copy aria-hidden="true" className="size-3.5" /> Copiar</button>
                      <button type="button" aria-label={`${l.active ? "Apagar" : "Activar"} el enlace de ${l.name}`} onClick={() => run(() => toggleLinkAction(slug, l.id, !l.active))} className={buttonVariants({ variant: "ghost", size: "sm" })}>{l.active ? "Apagar" : "Activar"}</button>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {tab === "report" ? (
        report.rows.length === 0 ? <EmptyState title="Todavía no hay datos" description="Cuando lleguen contactos o ventas por tu sitio, verás aquí de qué campaña vino cada uno y cuánto costó." /> : (
          <div className="grid gap-3">
            <p className="text-ui text-muted-foreground">Últimos 90 días · inversión {formatCurrency(report.totals.spend)} · {report.totals.leads} contactos · {report.totals.orders} ventas pagadas por {formatCurrency(report.totals.revenue)}</p>
            <AdaptiveTable
              caption="Inversión, contactos y ventas por origen"
              rows={report.rows}
              getRowId={(r) => r.label}
              columns={[
                { key: "label", header: "Origen", role: "primary", cell: (r) => r.label },
                { key: "spend", header: "Inversión", role: "detail", align: "right", cell: (r) => <span className="font-mono tabular-nums">{r.spend ? formatCurrency(r.spend) : "—"}</span> },
                { key: "clicks", header: "Clics", role: "detail", align: "right", cell: (r) => <span className="font-mono tabular-nums">{r.clicks || "—"}</span> },
                { key: "leads", header: "Contactos", role: "detail", align: "right", cell: (r) => <span className="font-mono tabular-nums">{r.leads}</span> },
                { key: "cpl", header: "Costo por contacto", role: "detail", align: "right", cell: (r) => <span className="font-mono tabular-nums">{r.costPerLead === null ? "—" : formatCurrency(r.costPerLead)}</span> },
                { key: "orders", header: "Ventas", role: "detail", align: "right", cell: (r) => <span className="font-mono tabular-nums">{r.orders} · {formatCurrency(r.revenue)}</span> },
                { key: "roas", header: "Retorno", role: "figure", cell: (r) => <span className="font-mono">{r.roas === null ? "—" : `${r.roas.toLocaleString("es-CO")}×`}</span> },
              ]}
            />
          </div>
        )
      ) : null}

      {tab === "reviews" ? (
        <div className="grid gap-3">
          <section aria-labelledby="rv-share" className="grid gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-[1fr_auto]">
            <div className="grid gap-2">
              <h2 id="rv-share" className="font-display text-[15px] font-semibold">Pide reseñas</h2>
              {reputation ? <p className="flex items-center gap-2 text-sm"><Star aria-hidden="true" className="size-4 fill-accent text-accent" /><b>{reputation.average.toFixed(1)}</b><span className="text-muted-foreground">entre {reputation.count} reseñas (internas y de Google)</span></p> : <p className="text-ui text-muted-foreground">Aún no tienes reseñas.</p>}
              <p className="text-ui text-muted-foreground">Comparte este enlace por WhatsApp o imprime el QR: 4–5 estrellas invitan a dejarla también en Google; 1–2 llegan como alerta privada.</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => copy(reviewUrl, "Enlace de reseña")} className={buttonVariants({ variant: "outline", size: "sm" })}><Copy aria-hidden="true" className="size-3.5" /> Copiar enlace de reseña</button>
                {googlePlaceId ? <button type="button" onClick={() => copy(googleReviewUrl(googlePlaceId), "Enlace a Google Reviews")} className={buttonVariants({ variant: "outline", size: "sm" })}><Copy aria-hidden="true" className="size-3.5" /> Copiar enlace a Google Reviews</button> : <small className="text-xs text-muted-foreground">Conecta tu ficha de Google para ofrecer también el enlace a Google Reviews.</small>}
              </div>
            </div>
            <QrCode value={reviewUrl} size={112} label="QR del enlace de reseña" />
          </section>
          {alerts.length ? <Alert tone="danger">{alerts.length === 1 ? "Hay 1 reseña de 1–2 estrellas sin atender." : `Hay ${alerts.length} reseñas de 1–2 estrellas sin atender.`}</Alert> : null}
          {reviews.length === 0 ? <EmptyState title="Sin reseñas todavía" description="Comparte el enlace de reseña con tus clientes." /> : (
            <ul className="grid gap-2">
              {reviews.map((r) => (
                <li key={r.id} className="grid gap-1 rounded-lg border border-border bg-surface p-3 text-ui">
                  <div className="flex flex-wrap items-center gap-2"><Stars n={r.rating} /><b>{r.customerName ?? "Cliente"}</b>{r.status === "ALERTED" ? <Badge variant="destructive">Por atender</Badge> : null}<span className="ml-auto text-xs text-muted-foreground">{r.createdAt.slice(0, 10)}</span></div>
                  {r.comment ? <p>{r.comment}</p> : null}
                  {r.contact ? <p className="text-xs text-muted-foreground">Contacto: {r.contact}</p> : null}
                  {r.status === "ALERTED" ? <button type="button" aria-label={`Marcar como atendida la reseña de ${r.customerName ?? "cliente"}`} onClick={() => run(() => handleReviewAction(slug, r.id))} className={buttonVariants({ variant: "outline", size: "sm", className: "justify-self-start" })}>Marcar como atendida</button> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <FormDialog open={creating} onOpenChange={setCreating} title="Nuevo enlace de campaña" description="Cada enlace lleva a tu sitio con el origen marcado (UTM) y cuenta los clics." submitLabel="Crear enlace" pendingLabel="Creando…"
        onSubmit={async (d) => { const g = (k: string) => String(d.get(k) ?? ""); const r = await createLinkAction(slug, { name: g("name"), utmSource: g("source"), utmMedium: g("medium"), utmCampaign: g("campaign"), spend: Number(g("spend").replace(/[^\d.,]/g, "").replace(",", ".")) || 0 }); return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message, fieldErrors: { name: r.message } }; }}
        onSuccess={({ message }) => { if (message) toast(message, "success"); router.refresh(); }}>
        {({ fieldErrors }) => (
          <div className="grid gap-3">
            <Field label="Nombre de la campaña" required error={fieldErrors.name}>{(c) => <input {...c} name="name" autoComplete="off" className={inputClasses} placeholder="Nombre de la campaña" />}</Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Origen" required hint="instagram, google, correo…">{(c) => <input {...c} name="source" autoComplete="off" className={inputClasses} placeholder="instagram" />}</Field>
              <Field label="Medio" required hint="social, cpc, correo…">{(c) => <input {...c} name="medium" autoComplete="off" className={inputClasses} placeholder="social" />}</Field>
            </div>
            <Field label="Campaña" required>{(c) => <input {...c} name="campaign" autoComplete="off" className={inputClasses} placeholder="lanzamiento-octubre" />}</Field>
            <Field label="Inversión (COP)" optional hint="Para calcular el costo por contacto y el retorno.">{(c) => <input {...c} name="spend" inputMode="numeric" autoComplete="off" className={inputClasses} placeholder="200000" />}</Field>
          </div>
        )}
      </FormDialog>
    </div>
  );
}
