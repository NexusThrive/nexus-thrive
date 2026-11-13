"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarClock, Check, ChevronLeft, ChevronRight, FileText, Mail, MessageCircle, MoreHorizontal, Paperclip, Phone, Search, Users, X } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses, textareaClasses } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/molecules/dropdown-menu";
import { DateInput } from "@/components/molecules/date-input";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { useConfirm } from "@/components/organisms/confirm-dialog";
import { FormDialog } from "@/components/organisms/form-sheet";
import {
  addNoteAction,
  attachOpportunityFileAction,
  completeActivityAction,
  deleteOpportunityAction,
  duplicateOpportunityAction,
  loseAction,
  moveStageAction,
  reopenAction,
  rescheduleActivityAction,
  scheduleActivityAction,
  updateOpportunityAction,
  winAction,
} from "@/app/[tenant]/(app)/crm/pipeline-actions";
import type { OpportunityDetail as Detail, OpportunityEventRow } from "@/lib/business/growth/pipeline-read";
import { ACTIVITY_LABEL, activityState, bogotaDay, parseMoney, type ActivityKind } from "@/lib/business/growth/pipeline";
import { formatCurrency } from "@/lib/foundation/format";
import { cn } from "@/lib/utils";
import { CustomerAvatar } from "@/components/atoms/customer-avatar";
import { TopbarCrumbs } from "@/components/molecules/topbar-crumbs";
import { Initials, StarsInput } from "../../../_components/pipeline/pipeline-ui";

const card = "rounded-(--radius-widget) border border-border/60 bg-card p-6";
const outline = cn(buttonVariants({ variant: "outline", size: "sm" }), "h-10 rounded-full border border-border/60 bg-transparent px-4");
const quick = "inline-flex h-10 items-center gap-2 rounded-full border border-border/60 px-4 text-ui font-medium text-foreground outline-none transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const addLink = "font-medium text-accent-text underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring";
const box = "flex flex-col gap-1 rounded-2xl bg-surface-muted/60 px-4 py-3.5";
const round = "grid size-11 shrink-0 place-items-center rounded-full bg-surface-muted text-foreground outline-none transition-colors hover:bg-accent-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const TIME = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "numeric", minute: "2-digit" });
const DAY = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", year: "numeric" });
const ICON: Record<ActivityKind, typeof Phone> = { CALL: Phone, MEETING: Users, PROPOSAL: FileText, OTHER: CalendarClock };

/** «2026-11-07T15:00» en hora de Bogotá (día y hora del diálogo). */
const localInput = (iso: string) => new Date(new Date(iso).getTime() - 5 * 3_600_000).toISOString().slice(0, 16);
/** «AAAA-MM-DDTHH:MM» en hora de Bogotá → ISO. */
const fromLocal = (v: string) => (v ? new Date(`${v}:00-05:00`).toISOString() : "");

/** Texto de un evento del historial (sin líneas técnicas). */
function eventText(e: OpportunityEventRow): { title: string; stage?: { from: string; to: string }; body?: string } {
  const d = e.data ?? {};
  switch (e.kind) {
    case "CREATED":
      return { title: d.copyOf ? `Oportunidad creada (copia de «${String(d.copyOf)}»)` : "Oportunidad creada" };
    case "STAGE":
      return { title: "Cambió la etapa", stage: { from: String(d.from ?? ""), to: String(d.to ?? "") } };
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
      const label = ACTIVITY_LABEL[(d.kind as ActivityKind) ?? "OTHER"] ?? "Actividad";
      const what = d.action === "done" ? "hecha" : d.action === "rescheduled" ? "reprogramada" : "programada";
      return { title: `${label} ${what}`, body: d.title && d.title !== label ? String(d.title) : undefined };
    }
    default:
      return { title: "Actividad" };
  }
}

/**
 * Detalle de la oportunidad (pantalla 9): el mismo contenedor de la Ficha del cliente. Etapas (un clic la mueve), identidad y cifras
 * editables en línea, contacto y responsable (correo y teléfono son los del cliente), pestañas y, al lado, la próxima actividad, la
 * actividad (chatter) y qué pasa al ganarla.
 */
export default function OpportunityDetail({ slug, o, now, backHref, pager }: { slug: string; o: Detail; now: string; backHref: string; pager: { index: number; total: number; prevHref: string | null; nextHref: string | null } | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<"notas" | "ventas" | "archivos" | "info">("notas");
  const [losing, setLosing] = useState(false);
  const [scheduling, setScheduling] = useState<null | { kind: "new" } | { kind: "reschedule"; id: string; dueAt: string }>(null);
  const [noting, setNoting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const nowMs = new Date(now).getTime();
  const open = o.status === "OPEN";
  // Abiertas y ganadas se editan y cambian de etapa; las perdidas, primero se reabren.
  const editable = o.status !== "LOST";

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, after?: (r: { ok: boolean; message?: string }) => void) =>
    start(async () => {
      const r = await fn();
      toast(r.ok ? (r.message ?? "Listo") : (r.message ?? "No se pudo"), r.ok ? "success" : "error");
      if (r.ok) router.refresh();
      after?.(r);
    });
  const save = (patch: Parameters<typeof updateOpportunityAction>[2]) => run(() => updateOpportunityAction(slug, o.id, patch), () => setEditing(null));

  const stageIndex = o.stages.findIndex((s) => s.id === o.stageId);
  const days = Math.max(0, Math.floor((nowMs - new Date(o.stageSince).getTime()) / 86_400_000));
  const next = o.activities.find((a) => !a.done) ?? null;
  const nextState = next ? activityState(new Date(next.dueAt).getTime(), nowMs) : null;
  const phone = o.customer?.phone?.replace(/\D/g, "") ?? "";
  const wa = phone ? `https://wa.me/${phone.length === 10 ? `57${phone}` : phone}` : null;
  const events = q.trim() ? o.events.filter((e) => JSON.stringify(eventText(e)).toLocaleLowerCase("es").includes(q.trim().toLocaleLowerCase("es"))) : o.events;
  const today = bogotaDay(nowMs);
  const groups: { label: string; items: OpportunityEventRow[] }[] = [];
  for (const e of events) {
    const d = bogotaDay(new Date(e.at).getTime());
    const label = d === today ? "Hoy" : DAY.format(new Date(e.at)).replace(".", "").replace(/ de /g, " ");
    const last = groups.at(-1);
    if (last?.label === label) last.items.push(e);
    else groups.push({ label, items: [e] });
  }

  /** Celda editable en línea: muestra el valor; al hacer clic, un campo que guarda con Enter o al salir. */
  const inline = ({ k, value, type = "text", placeholder, render, parse }: { k: string; value: string; type?: string; placeholder?: string; render: React.ReactNode; parse: (v: string) => Parameters<typeof updateOpportunityAction>[2] | null }) =>
    editing === k && editable ? (
      <input
        autoFocus
        type={type}
        defaultValue={value}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(inputClasses, "h-9")}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(null);
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        onBlur={(e) => {
          const patch = parse(e.currentTarget.value);
          if (patch && e.currentTarget.value !== value) save(patch);
          else setEditing(null);
        }}
      />
    ) : (
      <button type="button" disabled={!editable} onClick={() => setEditing(k)} className="w-fit rounded-xs text-left outline-none focus-visible:outline-2 focus-visible:outline-ring enabled:hover:text-accent-text">
        {render}
      </button>
    );

  return (
    <div
      data-bleed=""
      className="flex flex-col pb-6"
      style={{ backgroundImage: "radial-gradient(70% 55% at 0% 0%, color-mix(in srgb, var(--accent) 7%, transparent), transparent 70%), radial-gradient(60% 50% at 100% 100%, color-mix(in srgb, var(--accent) 6%, transparent), transparent 70%)" }}
    >
      {/* La ruta («Pipeline › nombre») vive en la barra superior. */}
      <TopbarCrumbs items={[{ label: "Pipeline", href: backHref }, { label: o.name }]} />
      {/* Cabecera: volver, título y acciones */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 px-6 pb-2 pt-6">
        <div className="flex min-w-0 items-center gap-4">
          <Link href={backHref} aria-label="Volver al pipeline" className={round}>
            <ArrowLeft aria-hidden="true" className="size-5" />
          </Link>
          <p className="font-display text-xl font-medium tracking-tight text-foreground min-[820px]:text-2xl">Oportunidad</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {open ? (
            <>
              <button type="button" disabled={pending} onClick={() => run(() => winAction(slug, o.id))} className="h-11 rounded-full bg-success/15 px-5 text-sm font-semibold text-success outline-none transition-colors hover:bg-success/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60">
                Ganada
              </button>
              <button type="button" disabled={pending} onClick={() => setLosing(true)} className="h-11 rounded-full bg-danger/10 px-5 text-sm font-semibold text-danger outline-none transition-colors hover:bg-danger/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60">
                Perdida
              </button>
            </>
          ) : o.status === "LOST" ? (
            <button type="button" disabled={pending} onClick={() => run(() => reopenAction(slug, o.id))} className={cn(outline, "h-11 px-5")}>
              Reabrir
            </button>
          ) : null}
          <Link href={`/${slug}/ventas/cotizaciones?nuevo=1${o.customer ? `&cliente=${o.customer.id}` : ""}`} className={cn(buttonVariants({ variant: "accent" }), "h-11 rounded-full px-6 text-sm font-semibold")}>
            Nueva cotización
          </Link>
          {pager ? (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              {pager.prevHref ? (
                <Link href={pager.prevHref} aria-label="Oportunidad anterior" className="grid size-10 place-items-center rounded-full hover:bg-surface-muted">
                  <ChevronLeft aria-hidden="true" className="size-4" />
                </Link>
              ) : (
                <span aria-hidden="true" className="grid size-10 place-items-center opacity-40">
                  <ChevronLeft className="size-4" />
                </span>
              )}
              <span className="tabular-nums">
                {pager.index} / {pager.total}
              </span>
              {pager.nextHref ? (
                <Link href={pager.nextHref} aria-label="Oportunidad siguiente" className="grid size-10 place-items-center rounded-full hover:bg-surface-muted">
                  <ChevronRight aria-hidden="true" className="size-4" />
                </Link>
              ) : (
                <span aria-hidden="true" className="grid size-10 place-items-center opacity-40">
                  <ChevronRight className="size-4" />
                </span>
              )}
            </div>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="Más acciones" disabled={pending} className={round}>
              <MoreHorizontal aria-hidden="true" className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {open ? <DropdownMenuItem onSelect={() => run(() => loseAction(slug, o.id, null, "Archivada"))}>Archivar</DropdownMenuItem> : null}
              <DropdownMenuItem onSelect={() => run(() => duplicateOpportunityAction(slug, o.id), (r) => r.ok && "id" in r && router.push(`/${slug}/crm/oportunidades/${(r as { id: string }).id}`))}>Duplicar</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-danger"
                onSelect={async () => {
                  if (!(await confirm({ title: `¿Eliminar «${o.name}»?`, description: "Se borran sus actividades pendientes y su historial. No se puede deshacer.", confirmLabel: "Eliminar", tone: "danger" }))) return;
                  run(() => deleteOpportunityAction(slug, o.id), (r) => r.ok && router.push(backHref));
                }}
              >
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* A todo el ancho, con el margen del panel de control: el detalle a la izquierda y la actividad a la derecha. */}
      <div className="grid w-full items-start gap-4 px-6 pt-4 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid min-w-0 gap-4">
          {/* Etapas */}
          <section aria-labelledby="opp-etapa" className={cn(card, "grid gap-4")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="grid gap-0.5">
                <h2 id="opp-etapa" className="text-ui font-semibold text-foreground">
                  Etapa
                </h2>
                <p className="text-xs text-muted-foreground">
                  {o.status === "LOST" ? `Perdida${o.lostReason ? ` · ${o.lostReason}` : ""}` : `Lleva ${days} ${days === 1 ? "día" : "días"} en ${o.stages[stageIndex]?.name ?? "esta etapa"}`}
                </p>
              </div>
              {editable && o.status === "OPEN" && o.stages[stageIndex + 1] ? (
                <button type="button" disabled={pending} onClick={() => run(() => moveStageAction(slug, o.id, o.stages[stageIndex + 1]!.id))} className={cn(buttonVariants({ variant: "accent" }), "h-11 rounded-full px-5 text-sm font-semibold")}>
                  Pasar a {o.stages[stageIndex + 1]!.name}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </button>
              ) : null}
            </div>
            <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${o.stages.length}, minmax(0, 1fr))` }}>
              {o.stages.map((s, i) => {
                const current = s.id === o.stageId && o.status !== "LOST";
                const done = o.status !== "LOST" && i < stageIndex;
                return (
                  <li key={s.id} className="min-w-0">
                    <button
                      type="button"
                      disabled={!editable || current || pending}
                      aria-current={current ? "step" : undefined}
                      aria-label={current ? `${i + 1} · ${s.name} (etapa actual)` : `${i + 1} · Mover a ${s.name}`}
                      onClick={() => run(() => moveStageAction(slug, o.id, s.id))}
                      className={cn(
                        "flex h-14 w-full items-center justify-center gap-2 rounded-2xl px-3 text-sm outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        current ? "bg-accent font-semibold text-ink" : done ? "bg-accent-subtle font-medium text-foreground" : "bg-surface-muted/60 text-muted-foreground",
                        editable && !current && "hover:bg-accent-subtle hover:text-foreground",
                      )}
                    >
                      <span aria-hidden="true" className={cn("grid size-6 shrink-0 place-items-center rounded-full text-xs", current ? "bg-ink/10" : "bg-card/80")}>
                        {done ? <Check className="size-3.5" strokeWidth={2.4} /> : i + 1}
                      </span>
                      <span className="truncate">{s.name}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
            {editable ? <p className="text-xs text-muted-foreground">Toca una etapa para mover la oportunidad. La actual va en oro y las que ya pasó, con ✓.</p> : null}
          </section>

          {/* Identidad y cifras */}
          <section aria-labelledby="opp-nombre" className={cn(card, "flex flex-col gap-5")}>
            <div className="flex flex-wrap items-center gap-3">
              {editing === "name" ? (
                inline({ k: "name", value: o.name, placeholder: "Nombre de la oportunidad", render: null, parse: (v) => (v.trim().length >= 3 ? { name: v } : null) })
              ) : (
                <h1 id="opp-nombre" className="font-display text-3xl font-semibold tracking-tight text-foreground">
                  <button type="button" disabled={!editable} onClick={() => setEditing("name")} className="text-left outline-none focus-visible:outline-2 focus-visible:outline-ring enabled:hover:text-accent-text">
                    {o.name}
                  </button>
                </h1>
              )}
              {o.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-3 py-1 text-xs text-foreground">
                  {t}
                  {editable ? (
                    <button type="button" aria-label={`Quitar etiqueta ${t}`} onClick={() => save({ tags: o.tags.filter((x) => x !== t) })} className="text-muted-foreground hover:text-foreground">
                      <X aria-hidden="true" className="size-3" />
                    </button>
                  ) : null}
                </span>
              ))}
              {editable ? (
                editing === "tag" ? (
                  <input
                    autoFocus
                    aria-label="Nueva etiqueta"
                    placeholder="Etiqueta"
                    className={cn(inputClasses, "h-8 w-40")}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setEditing(null);
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    onBlur={(e) => (e.currentTarget.value.trim() ? save({ tags: [...o.tags, e.currentTarget.value.trim()] }) : setEditing(null))}
                  />
                ) : (
                  <button type="button" onClick={() => setEditing("tag")} className={cn(addLink, "text-ui")}>
                    + Etiqueta
                  </button>
                )
              ) : null}
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
              <div className={box}>
                <span className="text-xs text-muted-foreground">Valor esperado</span>
                {inline({ k: "value", value: o.value == null ? "" : String(o.value), placeholder: "Valor esperado", parse: (v) => ({ value: v.trim() ? parseMoney(v) : null }), render: <span className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">{o.value == null ? "$0" : formatCurrency(o.value)}</span> })}
              </div>
              <div className={box}>
                <span className="text-xs text-muted-foreground">Probabilidad</span>
                {inline({ k: "prob", type: "number", value: String(o.probability), placeholder: "Probabilidad (0 a 100)", parse: (v) => (v.trim() && Number(v) >= 0 && Number(v) <= 100 ? { probability: Number(v) } : null), render: <span className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">{o.probability} %</span> })}
              </div>
              <div className={box}>
                <span className="text-xs text-muted-foreground">Cierre previsto</span>
                {editable && (o.expectedClose || editing === "close") ? (
                  <DateInput aria-label="Cierre previsto" value={o.expectedClose ?? ""} onChange={(e) => e.target.value !== (o.expectedClose ?? "") && save({ expectedClose: e.target.value || null })} className="h-9" />
                ) : o.expectedClose ? (
                  <span className="pt-1 text-base font-medium text-foreground">{DAY.format(new Date(`${o.expectedClose}T17:00:00Z`)).replace(".", "").replace(/ de /g, " ")}</span>
                ) : (
                  <span className="pt-1 text-base font-medium text-muted-foreground">
                    Sin fecha{" "}
                    {editable ? (
                      <button type="button" onClick={() => setEditing("close")} className={cn(addLink, "ms-1 text-ui")}>
                        Añadir
                      </button>
                    ) : null}
                  </span>
                )}
              </div>
              <div className={box}>
                <span className="text-xs text-muted-foreground">Prioridad</span>
                <span className="pt-1">
                  <StarsInput size="lg" value={o.priority} onChange={(v) => editable && save({ priority: v })} />
                </span>
              </div>
            </div>
          </section>

          {/* Contacto y responsable */}
          <section aria-labelledby="opp-contacto" className={card}>
            <h2 id="opp-contacto" className="mb-4 text-base font-semibold text-foreground">
              Contacto y responsable
            </h2>
            <dl className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-x-6 gap-y-5">
              <div className="grid gap-1">
                <dt className="text-xs text-muted-foreground">Cliente</dt>
                <dd className="flex items-center gap-2.5 text-sm">
                  {o.customer ? (
                    <>
                      <CustomerAvatar identity={o.customer} className="size-7 rounded-lg" />
                      <Link href={`/${slug}/contactos/${o.customer.id}`} className="text-foreground hover:text-accent-text">
                        {o.customer.name}
                      </Link>
                      <Link href={`/${slug}/contactos/${o.customer.id}`} className={cn(addLink, "text-ui")}>
                        Ver ficha
                      </Link>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Sin contacto</span>
                  )}
                </dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-xs text-muted-foreground">Responsable</dt>
                <dd className="flex items-center gap-2.5 text-sm">
                  {editing === "owner" ? (
                    <Select aria-label="Responsable" autoFocus defaultValue={o.owner?.id ?? ""} onChange={(e) => save({ ownerId: e.target.value || null })} className="h-9">
                      <option value="">Sin responsable</option>
                      {o.team.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <button type="button" disabled={!editable} onClick={() => setEditing("owner")} className="flex items-center gap-2.5 rounded-xs outline-none focus-visible:outline-2 focus-visible:outline-ring enabled:hover:text-accent-text">
                      {o.owner ? <Initials name={o.owner.name} id={o.owner.id} size={28} /> : null}
                      {o.owner?.name ?? <span className="text-muted-foreground">Sin responsable</span>}
                    </button>
                  )}
                </dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-xs text-muted-foreground">Correo electrónico</dt>
                <dd className="text-sm">
                  {o.customer ? inline({ k: "email", type: "email", value: o.customer.email ?? "", placeholder: "Correo del cliente", parse: (v) => ({ email: v.trim() || null }), render: o.customer.email ? <span className="text-foreground">{o.customer.email}</span> : <span className="text-muted-foreground">Sin correo <span className={cn(addLink, "ms-1")}>Añadir</span></span> }) : <span className="text-muted-foreground">—</span>}
                </dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-xs text-muted-foreground">Teléfono</dt>
                <dd className="text-sm">
                  {o.customer ? inline({ k: "phone", type: "tel", value: o.customer.phone ?? "", placeholder: "Teléfono del cliente", parse: (v) => ({ phone: v.trim() || null }), render: o.customer.phone ? <span className="text-foreground">+57 {o.customer.phone.replace(/\D/g, "").replace(/^(\d{3})(\d{3})(\d{4})$/, "$1 $2 $3")}</span> : <span className="text-muted-foreground">Sin teléfono <span className={cn(addLink, "ms-1")}>Añadir</span></span> }) : <span className="text-muted-foreground">—</span>}
                </dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-xs text-muted-foreground">¿Cómo llegó?</dt>
                <dd className="text-sm">
                  {inline({ k: "source", value: o.source ?? "", placeholder: "Ej. Instagram, recomendación", parse: (v) => ({ source: v.trim() || null }), render: o.source ? <span className="text-foreground">{o.source}</span> : <span className="text-muted-foreground">Sin especificar <span className={cn(addLink, "ms-1.5")}>Añadir</span></span> })}
                </dd>
              </div>
            </dl>
            {wa || o.customer?.email || phone ? (
              <div className="flex flex-wrap gap-2 pt-[18px]">
                {wa ? (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className={quick}>
                    <MessageCircle aria-hidden="true" className="size-4 text-success" />
                    WhatsApp
                  </a>
                ) : null}
                {phone ? (
                  <a href={`tel:+57${phone}`} className={quick}>
                    <Phone aria-hidden="true" className="size-4" />
                    Llamar
                  </a>
                ) : null}
                {o.customer?.email ? (
                  <a href={`mailto:${o.customer.email}`} className={quick}>
                    <Mail aria-hidden="true" className="size-4" />
                    Enviar correo
                  </a>
                ) : null}
              </div>
            ) : null}
          </section>

          {/* Pestañas */}
          <section aria-label="Detalle" className="overflow-hidden rounded-(--radius-widget) border border-border/60 bg-card">
            <div role="tablist" aria-label="Detalle" className="flex flex-wrap gap-1.5 p-4 pb-2">
              {[
                { key: "notas" as const, label: "Notas" },
                { key: "ventas" as const, label: "Cotizaciones y pedidos" },
                { key: "archivos" as const, label: "Archivos" },
                { key: "info" as const, label: "Información adicional" },
              ].map((t) => (
                <button
                  key={t.key}
                  role="tab"
                  type="button"
                  aria-selected={tab === t.key}
                  aria-controls={`opp-tab-${t.key}`}
                  id={`opp-tabbtn-${t.key}`}
                  onClick={() => setTab(t.key)}
                  className={cn("rounded-full px-4 py-2 text-sm outline-none transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring", tab === t.key ? "bg-accent-subtle font-medium text-foreground" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground")}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div role="tabpanel" id={`opp-tab-${tab}`} aria-labelledby={`opp-tabbtn-${tab}`} className="px-6 pb-6 pt-3">
              {tab === "notas" ? (
                <>
                  <label htmlFor="opp-desc" className="sr-only">
                    Descripción
                  </label>
                  <textarea
                    id="opp-desc"
                    rows={5}
                    defaultValue={o.description ?? ""}
                    placeholder="Añade una descripción: qué necesita el cliente, tallas, fechas de entrega, acuerdos…"
                    onBlur={(e) => e.currentTarget.value !== (o.description ?? "") && save({ description: e.currentTarget.value || null })}
                    className={textareaClasses}
                  />
                </>
              ) : tab === "ventas" ? (
                o.order ? (
                  <p className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-foreground">Pedido T-{String(o.order.number).padStart(4, "0")}</span>
                    <span className="tabular-nums text-muted-foreground">{formatCurrency(o.order.total)}</span>
                    <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", o.order.canceled ? "bg-surface-muted text-muted-foreground" : o.order.paid ? "border border-success/40 text-success" : "bg-accent-subtle text-accent-text")}>{o.order.canceled ? "Cancelado" : o.order.paid ? "Cobrado" : "Por cobrar"}</span>
                    <Link href={`/${slug}/ventas/pedidos`} className={cn(addLink, "text-ui")}>
                      Ver en Ventas y cobros
                    </Link>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aún no hay cotizaciones ni pedidos. Al ganarla se crea el pedido;{" "}
                    <Link href={`/${slug}/ventas/cotizaciones?nuevo=1${o.customer ? `&cliente=${o.customer.id}` : ""}`} className={addLink}>
                      crea una cotización
                    </Link>{" "}
                    si necesitas enviar una propuesta.
                  </p>
                )
              ) : tab === "archivos" ? (
                o.files.length ? (
                  <ul className="grid gap-2 text-sm">
                    {o.files.map((f) => (
                      <li key={f.id} className="flex items-center gap-2">
                        <Paperclip aria-hidden="true" className="size-4 text-muted-foreground" />
                        <a href={`/api/files/${f.id}`} target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-accent-text">
                          {f.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin archivos. Adjunta propuestas o fotos con el clip de Actividad.</p>
                )
              ) : (
                <dl className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-6 gap-y-4 text-sm">
                  <div className="grid gap-1">
                    <dt className="text-xs text-muted-foreground">Creada</dt>
                    <dd className="text-foreground">{DAY.format(new Date(o.createdAt)).replace(".", "").replace(/ de /g, " ")}</dd>
                  </div>
                  <div className="grid gap-1">
                    <dt className="text-xs text-muted-foreground">En la etapa desde</dt>
                    <dd className="text-foreground">{DAY.format(new Date(o.stageSince)).replace(".", "").replace(/ de /g, " ")}</dd>
                  </div>
                  <div className="grid gap-1">
                    <dt className="text-xs text-muted-foreground">Estado</dt>
                    <dd className="text-foreground">{o.status === "OPEN" ? "Abierta" : o.status === "WON" ? "Ganada" : "Perdida"}</dd>
                  </div>
                </dl>
              )}
            </div>
          </section>
          {open ? (
            <section aria-labelledby="opp-ganada" className={cn(card, "flex flex-col gap-3")}>
              <h2 id="opp-ganada" className="text-base font-semibold text-foreground">
                Al marcarla como ganada
              </h2>
              {["Se crea el pedido con las cantidades y el valor", "Queda listo el cobro o la factura", `Se registra en la ficha de ${o.customer?.name ?? "su cliente"}`].map((t) => (
                <span key={t} className="flex items-center gap-2.5 text-ui text-foreground">
                  <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-success" />
                  {t}
                </span>
              ))}
            </section>
          ) : null}
        </div>

        {/* Columna de actividad: la próxima actividad y la línea de tiempo, sin fondo de tarjeta */}
        <aside className="grid min-w-0 gap-4">
          {open ? (
            <section aria-labelledby="opp-proxima" className={cn(card, "flex flex-col gap-3.5", next && "border-accent/40")}>
              <div className="flex items-center justify-between gap-2.5">
                <h2 id="opp-proxima" className={cn("text-ui font-semibold", next ? "text-accent-text" : "text-foreground")}>
                  Próxima actividad
                </h2>
                {next ? (
                  <span className={cn("rounded-full px-3 py-1 text-xs font-medium", nextState === "overdue" ? "bg-danger-subtle text-danger" : nextState === "today" ? "bg-accent-subtle text-accent-text" : "bg-surface-muted text-muted-foreground")}>
                    {nextState === "overdue" ? "Vencida" : nextState === "today" ? "Hoy" : DAY.format(new Date(next.dueAt)).replace(".", "").replace(/ de /g, " ")}
                  </span>
                ) : null}
              </div>
              {next ? (
                <>
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-muted text-accent-text">
                      {(() => {
                        const Icon = ICON[next.kind];
                        return <Icon className="size-[18px]" />;
                      })()}
                    </span>
                    <span className="grid min-w-0 gap-0.5">
                      <span className="text-sm font-medium text-foreground">{next.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {next.assignee ? `Asignada a ${next.assignee} · ` : ""}
                        {TIME.format(new Date(next.dueAt))}
                      </span>
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => completeActivityAction(slug, next.id),
                          async (r) => {
                            if (r.ok && (await confirm({ title: "¿Programar la siguiente actividad?", description: "Así la oportunidad no se queda sin siguiente paso.", confirmLabel: "Programar" }))) setScheduling({ kind: "new" });
                          },
                        )
                      }
                      className={cn(buttonVariants({ variant: "accent" }), "h-10 rounded-full px-5 text-sm font-semibold")}
                    >
                      Marcar hecha
                    </button>
                    <button type="button" onClick={() => setScheduling({ kind: "reschedule", id: next.id, dueAt: next.dueAt })} className={outline}>
                      Reprogramar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Sin actividad programada</p>
                  <button type="button" onClick={() => setScheduling({ kind: "new" })} className={cn(outline, "w-fit")}>
                    Programar actividad
                  </button>
                </>
              )}
            </section>
          ) : null}

          <section aria-labelledby="opp-actividad" className={cn(card, "flex flex-col gap-[18px]")}>
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <h2 id="opp-actividad" className="text-base font-semibold text-foreground">
                Actividad
              </h2>
              <div className="flex gap-1">
                <button type="button" aria-label="Buscar en la actividad" aria-pressed={searching} onClick={() => setSearching((s) => !s)} className="grid size-10 place-items-center rounded-full bg-surface-muted text-foreground outline-none transition-colors hover:bg-accent-subtle focus-visible:outline-2 focus-visible:outline-ring">
                  <Search aria-hidden="true" className="size-4" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    const fd = new FormData();
                    fd.set("slug", slug);
                    fd.set("id", o.id);
                    fd.set("file", file);
                    run(() => attachOpportunityFileAction(fd));
                  }}
                />
                <button type="button" aria-label="Adjuntar archivo" onClick={() => fileRef.current?.click()} className="grid size-10 place-items-center rounded-full bg-surface-muted text-foreground outline-none transition-colors hover:bg-accent-subtle focus-visible:outline-2 focus-visible:outline-ring">
                  <Paperclip aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>
            {searching ? <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar en la actividad" placeholder="Buscar en la actividad" className={inputClasses} /> : null}
            <div className="flex flex-wrap gap-2">
              {wa ? (
                <a href={wa} target="_blank" rel="noopener noreferrer" className={outline}>
                  Enviar mensaje
                </a>
              ) : (
                <button type="button" disabled className={outline} title="El cliente no tiene teléfono">
                  Enviar mensaje
                </button>
              )}
              <button type="button" aria-expanded={noting} onClick={() => setNoting((n) => !n)} className={outline}>
                Registrar nota
              </button>
              <button type="button" onClick={() => setScheduling({ kind: "new" })} className={outline}>
                Programar actividad
              </button>
            </div>
            {noting ? (
              <form
                className="grid gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const text = String(new FormData(e.currentTarget).get("nota") ?? "");
                  run(() => addNoteAction(slug, o.id, text), (r) => r.ok && setNoting(false));
                }}
              >
                <label htmlFor="opp-nota" className="text-xs font-medium text-muted-foreground">
                  Nota
                </label>
                <textarea id="opp-nota" name="nota" rows={3} autoFocus required className={textareaClasses} />
                <div className="flex gap-2">
                  <button type="submit" disabled={pending} className={cn(buttonVariants({ variant: "accent" }), "h-10 rounded-full px-5 text-sm font-semibold")}>
                    Guardar nota
                  </button>
                  <button type="button" onClick={() => setNoting(false)} className={outline}>
                    Cancelar
                  </button>
                </div>
              </form>
            ) : null}
            {/* La línea de tiempo tiene alto máximo y scroll propio: la columna no se alarga sin fin. Se enfoca con Tab para desplazarla. */}
            <div role="region" aria-label="Historial de actividad" tabIndex={0} className="-me-2 grid max-h-[min(60vh,560px)] gap-[18px] overflow-y-auto overscroll-contain pe-2 outline-none focus-visible:outline-2 focus-visible:outline-ring">
              {groups.map((g) => (
                <div key={g.label} className="grid gap-4">
                  <p className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span aria-hidden="true" className="h-px flex-1 bg-border" />
                    {g.label}
                    <span aria-hidden="true" className="h-px flex-1 bg-border" />
                  </p>
                  <ol className="grid gap-4">
                    {g.items.map((e) => {
                      const t = eventText(e);
                      return (
                        <li key={e.id} className="flex items-start gap-3">
                          <span aria-hidden="true" className={cn("mt-1.5 size-2 shrink-0 rounded-full", e.kind === "STAGE" || e.kind === "WON" ? "bg-accent" : "bg-muted-foreground/60")} />
                          <div className="grid min-w-0 gap-1">
                            <span className="text-ui text-foreground">{t.title}</span>
                            {t.stage ? (
                              <span className="flex items-center gap-1.5">
                                <span className="rounded-md bg-surface-muted px-2 py-0.5 text-xs font-medium text-foreground">{t.stage.from}</span>
                                <span aria-label="a" className="text-xs text-muted-foreground">
                                  →
                                </span>
                                <span className="rounded-md bg-surface-muted px-2 py-0.5 text-xs font-medium text-accent-text">{t.stage.to}</span>
                              </span>
                            ) : null}
                            {t.body ? <span className="whitespace-pre-line text-ui text-muted-foreground">{t.body}</span> : null}
                            <span className="text-xs text-muted-foreground">
                              {e.author ? `${e.author} · ` : ""}
                              {TIME.format(new Date(e.at))}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ))}
            </div>
            {groups.length === 0 ? <p className="text-center text-sm text-muted-foreground">{q ? "Nada coincide con la búsqueda." : "Aún no hay actividad."}</p> : null}
          </section>

        </aside>
      </div>

      {/* Perder: motivo de la lista y texto libre */}
      <FormDialog
        open={losing}
        onOpenChange={setLosing}
        title="Marcar como perdida"
        description="Elige el motivo; ayuda a aprender por qué se pierden las ventas."
        submitLabel="Marcar perdida"
        destructive
        onSubmit={async (fd) => {
          const r = await loseAction(slug, o.id, String(fd.get("motivo") ?? "") || null, String(fd.get("nota") ?? ""));
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message };
        }}
        onSuccess={(r) => {
          toast(r.message ?? "Oportunidad perdida", "success");
          router.refresh();
        }}
      >
        <Field label="Motivo">
          {(c) => (
            <Select {...c} name="motivo" defaultValue={o.reasons[0]?.id ?? ""}>
              {o.reasons.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
              <option value="">Otro (escríbelo abajo)</option>
            </Select>
          )}
        </Field>
        <Field label="Detalle (opcional)">{(c) => <textarea {...c} name="nota" rows={3} className={textareaClasses} />}</Field>
      </FormDialog>

      {/* Programar o reprogramar una actividad */}
      <FormDialog
        open={scheduling !== null}
        onOpenChange={(v) => !v && setScheduling(null)}
        title={scheduling?.kind === "reschedule" ? "Reprogramar actividad" : "Programar actividad"}
        submitLabel={scheduling?.kind === "reschedule" ? "Reprogramar" : "Programar"}
        onSubmit={async (fd) => {
          const day = String(fd.get("dia") ?? "");
          const time = String(fd.get("hora") ?? "");
          const due = day && time ? fromLocal(`${day}T${time}`) : "";
          if (!due) return { ok: false, message: "Elige la fecha y la hora.", fieldErrors: { cuando: "Elige la fecha y la hora" } };
          const r =
            scheduling?.kind === "reschedule"
              ? await rescheduleActivityAction(slug, scheduling.id, due, o.id)
              : await scheduleActivityAction(slug, o.id, { kind: String(fd.get("tipo")) as ActivityKind, title: String(fd.get("titulo") ?? ""), dueAt: due, assigneeId: String(fd.get("asignado") ?? "") || null });
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message };
        }}
        onSuccess={(r) => {
          toast(r.message ?? "Listo", "success");
          setScheduling(null);
          router.refresh();
        }}
      >
        {({ fieldErrors }) => (
          <>
            {scheduling?.kind !== "reschedule" ? (
              <>
                <Field label="Tipo">
                  {(c) => (
                    <Select {...c} name="tipo" defaultValue="CALL">
                      {(Object.keys(ACTIVITY_LABEL) as ActivityKind[]).map((k) => (
                        <option key={k} value={k}>
                          {ACTIVITY_LABEL[k]}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="Título (opcional)">{(c) => <input {...c} name="titulo" placeholder="Ej. Llamar para confirmar cantidades" className={inputClasses} />}</Field>
                <Field label="Asignada a">
                  {(c) => (
                    <Select {...c} name="asignado" defaultValue={o.owner?.id ?? ""}>
                      <option value="">El responsable</option>
                      {o.team.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              </>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Día" error={fieldErrors.cuando}>
                {(c) => <DateInput {...c} name="dia" required defaultValue={scheduling?.kind === "reschedule" ? localInput(scheduling.dueAt).slice(0, 10) : today} />}
              </Field>
              <Field label="Hora">{(c) => <input {...c} name="hora" type="time" required defaultValue={scheduling?.kind === "reschedule" ? localInput(scheduling.dueAt).slice(11, 16) : "10:00"} className={inputClasses} />}</Field>
            </div>
          </>
        )}
      </FormDialog>
      {confirmDialog}
    </div>
  );
}
