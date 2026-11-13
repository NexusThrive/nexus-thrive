"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Building2, CalendarClock, CalendarDays, CircleDollarSign, ExternalLink, Flag, History, Layers, Mail, MessageCircle, Phone, Sparkles, UserRound } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { CustomerAvatar } from "@/components/atoms/customer-avatar";
import { SkeletonRows } from "@/components/molecules/skeleton-rows";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { previewOpportunityAction } from "@/app/[tenant]/(app)/crm/pipeline-actions";
import type { PipelineCard, PipelineStage } from "@/lib/business/growth/pipeline-db";
import type { OpportunityDetail, OpportunityEventRow } from "@/lib/business/growth/pipeline-read";
import { ACTIVITY_LABEL } from "@/lib/business/growth/pipeline";
import { formatCurrency } from "@/lib/foundation/format";
import { cn } from "@/lib/utils";
import { Initials } from "./pipeline-ui";

const DAY = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "long", year: "numeric" });
const WHEN = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const PRIORITY = [
  { label: "Sin prioridad", tone: "bg-surface-muted text-muted-foreground" },
  { label: "Baja", tone: "bg-success/15 text-success" },
  { label: "Media", tone: "bg-accent-subtle text-accent-text" },
  { label: "Alta", tone: "bg-danger/15 text-danger" },
] as const;

const ago = new Intl.RelativeTimeFormat("es-CO", { numeric: "auto" });
function relative(iso: string, now: number) {
  const min = Math.round((new Date(iso).getTime() - now) / 60_000);
  if (Math.abs(min) < 60) return ago.format(min, "minute");
  if (Math.abs(min) < 1440) return ago.format(Math.round(min / 60), "hour");
  return ago.format(Math.round(min / 1440), "day");
}

/** Una línea del historial en lenguaje de negocio (sin términos técnicos). */
function eventLine(e: OpportunityEventRow): { title: string; body?: string } {
  const d = e.data ?? {};
  switch (e.kind) {
    case "CREATED":
      return { title: "Oportunidad creada" };
    case "STAGE":
      return { title: `Pasó de «${String(d.from ?? "")}» a «${String(d.to ?? "")}»` };
    case "NOTE":
      return { title: "Nota", body: String(d.text ?? "") };
    case "WON":
      return { title: d.orderId ? "Ganada · se creó el pedido" : "Ganada" };
    case "LOST":
      return { title: "Perdida", body: d.reason ? String(d.reason) : undefined };
    case "REOPENED":
      return { title: `Reabierta en ${String(d.stage ?? "")}` };
    case "FILE":
      return { title: "Archivo adjuntado", body: String(d.name ?? "") };
    case "FIELD":
      return { title: `Cambió ${(d.fields as string[] | undefined)?.join(", ") ?? "datos"}` };
    case "ACTIVITY": {
      const label = ACTIVITY_LABEL[(d.kind as keyof typeof ACTIVITY_LABEL) ?? "OTHER"] ?? "Actividad";
      return { title: `${label} ${d.action === "done" ? "hecha" : d.action === "rescheduled" ? "reprogramada" : "programada"}`, body: d.title && d.title !== label ? String(d.title) : undefined };
    }
    default:
      return { title: "Actividad" };
  }
}

function Row({ icon: Icon, label, children }: { icon: typeof Building2; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-muted text-muted-foreground">
        <Icon className="size-4" strokeWidth={1.6} />
      </span>
      <dt className="w-32 shrink-0 text-ui text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 text-ui font-medium text-foreground">{children}</dd>
    </div>
  );
}

const round = "grid size-10 shrink-0 place-items-center rounded-full bg-card text-foreground outline-none transition-colors hover:bg-accent-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/**
 * Panel lateral de una oportunidad: al pulsar una tarjeta del tablero se abre con todo lo importante, como la ficha de un trato —datos
 * (cliente, valor, etapa, cierre, responsable, prioridad, última interacción), contacto principal con sus accesos y la actividad reciente—,
 * sin salir del tablero. Lo que ya está en la tarjeta se ve al instante; el contacto y el historial llegan por su cuenta (con su esqueleto).
 * «Abrir completa» lleva a la oportunidad entera, donde se edita y se programa.
 */
export default function OpportunityDrawer({ slug, card: current, stages, onClose }: { slug: string; card: PipelineCard | null; stages: PipelineStage[]; onClose: () => void }) {
  // Al cerrar, `current` pasa a `null` de inmediato pero el panel tarda en salir: se conserva la última tarjeta para que no se vea en blanco.
  const [kept, setKept] = useState<PipelineCard | null>(current);
  if (current && current !== kept) setKept(current);
  const card = current ?? kept;
  const [loaded, setLoaded] = useState<{ id: string; detail: OpportunityDetail | null } | null>(null);
  const [now] = useState(() => Date.now());
  const id = card?.id ?? null;
  useEffect(() => {
    if (!id) return;
    let alive = true;
    previewOpportunityAction(slug, id).then(
      (r) => alive && setLoaded({ id, detail: r.ok ? r.detail : null }),
      () => alive && setLoaded({ id, detail: null }),
    );
    return () => {
      alive = false;
    };
  }, [slug, id]);

  const detail = loaded && loaded.id === id ? loaded.detail : null;
  const ready = Boolean(loaded && loaded.id === id);
  const stage = card ? stages.find((s) => s.id === card.stageId) : undefined;
  const priority = PRIORITY[Math.min(3, Math.max(0, card?.priority ?? 0))]!;
  const phone = detail?.customer?.phone?.replace(/\D/g, "") ?? "";
  const fullHref = card ? `/${slug}/crm/oportunidades/${card.id}` : "#";
  const pendingActivity = detail?.activities.find((a) => !a.done) ?? null;

  return (
    <ResponsiveSheet
      open={current !== null}
      onOpenChange={(next) => !next && onClose()}
      drawer
      floating
      size="lg"
      unsavedGuard={false}
      title={card?.name ?? "Oportunidad"}
      description={card?.customer?.name ?? "Sin cliente"}
      footer={
        card ? (
          <Link href={fullHref} className={cn(buttonVariants({ variant: "accent" }), "h-11 flex-1 rounded-full px-6 text-sm font-semibold sm:flex-none")}>
            <ExternalLink aria-hidden="true" className="size-4" />
            Abrir completa
          </Link>
        ) : null
      }
    >
      {card ? (
        <div className="grid gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-foreground">
              <Layers aria-hidden="true" className="size-3.5 text-accent-text" />
              {stage?.name ?? "Etapa"}
              {card.won ? " · Ganada" : ""}
            </span>
            <span className={cn("rounded-full px-3 py-1 text-xs font-medium", priority.tone)}>Prioridad {priority.label.toLowerCase()}</span>
            {card.tags.map((t) => (
              <span key={t} className="rounded-full bg-surface-muted px-3 py-1 text-xs text-foreground">
                {t}
              </span>
            ))}
          </div>

          <section aria-labelledby="op-detalles">
            <h3 id="op-detalles" className="mb-1 text-ui font-semibold text-foreground">
              Detalles de la oportunidad
            </h3>
            <dl className="divide-y divide-border/50">
              <Row icon={Building2} label="Cliente">
                {card.customer ? (
                  <Link href={`/${slug}/contactos/${card.customer.id}`} className="inline-flex max-w-full items-center gap-2 hover:text-accent-text">
                    <CustomerAvatar identity={card.customer} className="size-6 rounded-full" />
                    <span className="truncate">{card.customer.name}</span>
                  </Link>
                ) : (
                  <span className="text-muted-foreground">Sin cliente</span>
                )}
              </Row>
              <Row icon={CircleDollarSign} label="Valor">
                <span className="tabular-nums">{formatCurrency(card.value)}</span>
                <span className="ms-2 text-xs font-normal text-muted-foreground">{card.probability} % de probabilidad</span>
              </Row>
              <Row icon={Layers} label="Etapa">
                {stage?.name ?? "—"}
              </Row>
              <Row icon={CalendarDays} label="Cierre estimado">
                {card.expectedClose ? DAY.format(new Date(`${card.expectedClose}T12:00:00-05:00`)) : <span className="font-normal text-muted-foreground">Sin fecha</span>}
              </Row>
              <Row icon={UserRound} label="Responsable">
                {card.owner ? (
                  <span className="inline-flex items-center gap-2">
                    <Initials name={card.owner.name} id={card.owner.id} size={24} className="rounded-full" />
                    {card.owner.name}
                  </span>
                ) : (
                  <span className="font-normal text-muted-foreground">Sin responsable</span>
                )}
              </Row>
              <Row icon={Flag} label="Prioridad">
                <span className={cn("rounded-full px-3 py-0.5 text-xs", priority.tone)}>{priority.label}</span>
              </Row>
              <Row icon={History} label="Última interacción">
                {ready ? (detail?.events[0] ? relative(detail.events[0].at, now) : <span className="font-normal text-muted-foreground">Sin movimientos</span>) : <span className="block h-4 w-28 animate-pulse rounded-full bg-surface-muted motion-reduce:animate-none" />}
              </Row>
              <Row icon={CalendarClock} label="Creada">
                {DAY.format(new Date(card.createdAt))}
              </Row>
              {detail?.source ? (
                <Row icon={BarChart3} label="Origen">
                  {detail.source}
                </Row>
              ) : null}
            </dl>
          </section>

          {detail?.description ? (
            <section aria-labelledby="op-notas" className="grid gap-2">
              <h3 id="op-notas" className="text-ui font-semibold text-foreground">
                Descripción
              </h3>
              <p className="rounded-2xl bg-surface-muted/60 p-4 text-ui leading-relaxed text-foreground/85">{detail.description}</p>
            </section>
          ) : null}

          <section aria-labelledby="op-contacto" className="grid gap-2">
            <h3 id="op-contacto" className="text-ui font-semibold text-foreground">
              Contacto principal
            </h3>
            {!ready ? (
              <SkeletonRows rows={2} label="Cargando el contacto" />
            ) : detail?.customer ? (
              <div className="flex items-center gap-3 rounded-3xl bg-surface-muted/60 p-3.5">
                <CustomerAvatar identity={detail.customer} className="size-11 rounded-full" />
                <span className="grid min-w-0 flex-1 leading-tight">
                  <span className="truncate text-ui font-medium text-foreground">{detail.customer.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{[detail.customer.phone, detail.customer.email].filter(Boolean).join(" · ") || "Sin teléfono ni correo"}</span>
                </span>
                {phone ? (
                  <>
                    <a href={`tel:+57${phone.replace(/^57/, "")}`} aria-label="Llamar" title="Llamar" className={round}>
                      <Phone aria-hidden="true" className="size-4" strokeWidth={1.7} />
                    </a>
                    <a href={`https://wa.me/${phone.length === 10 ? `57${phone}` : phone}`} target="_blank" rel="noopener noreferrer" aria-label="Escribir por WhatsApp" title="WhatsApp" className={round}>
                      <MessageCircle aria-hidden="true" className="size-4" strokeWidth={1.7} />
                    </a>
                  </>
                ) : null}
                {detail.customer.email ? (
                  <a href={`mailto:${detail.customer.email}`} aria-label="Enviar correo" title="Enviar correo" className={round}>
                    <Mail aria-hidden="true" className="size-4" strokeWidth={1.7} />
                  </a>
                ) : null}
              </div>
            ) : (
              <p className="rounded-2xl bg-surface-muted/60 p-4 text-ui text-muted-foreground">Esta oportunidad no tiene un contacto asignado.</p>
            )}
          </section>

          <section aria-labelledby="op-actividad" className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <h3 id="op-actividad" className="text-ui font-semibold text-foreground">
                Actividad reciente
              </h3>
              <Link href={`${fullHref}#actividad`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-10 rounded-full border-border/60 px-4")}>
                <Sparkles aria-hidden="true" className="size-4" />
                Registrar actividad
              </Link>
            </div>
            {pendingActivity ? (
              <p className="flex items-center gap-3 rounded-2xl bg-accent-subtle px-4 py-3 text-ui text-foreground">
                <CalendarClock aria-hidden="true" className="size-4 shrink-0 text-accent-text" />
                <span className="min-w-0 flex-1 truncate">
                  <b className="font-medium">{ACTIVITY_LABEL[pendingActivity.kind]}</b>
                  {pendingActivity.title && pendingActivity.title !== ACTIVITY_LABEL[pendingActivity.kind] ? ` · ${pendingActivity.title}` : ""}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{WHEN.format(new Date(pendingActivity.dueAt))}</span>
              </p>
            ) : null}
            {!ready ? (
              <SkeletonRows rows={3} label="Cargando la actividad" />
            ) : detail && detail.events.length ? (
              <ol className="grid gap-2.5">
                {detail.events.slice(0, 6).map((e) => {
                  const line = eventLine(e);
                  return (
                    <li key={e.id} className="grid gap-1 rounded-2xl bg-surface-muted/60 p-3.5">
                      <p className="flex items-baseline justify-between gap-3 text-ui font-medium text-foreground">
                        <span className="min-w-0">{line.title}</span>
                        <time dateTime={e.at} className="shrink-0 text-xs font-normal text-muted-foreground">
                          {WHEN.format(new Date(e.at))}
                        </time>
                      </p>
                      {line.body ? <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{line.body}</p> : null}
                      {e.author ? <p className="text-2xs text-muted-foreground">{e.author}</p> : null}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="rounded-2xl bg-surface-muted/60 p-4 text-ui text-muted-foreground">Aún no hay actividad en esta oportunidad.</p>
            )}
          </section>
        </div>
      ) : null}
    </ResponsiveSheet>
  );
}
