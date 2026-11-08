import type { ReactNode } from "react";
import Link from "next/link";
import { Banknote, CalendarDays, CreditCard, FileText, Mail, MapPin, MessageCircle, Phone, Receipt, ShoppingBag, Target } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { cn } from "@/lib/utils";
import FichaActivity, { type ActivityItem } from "./ficha-activity";
import FichaControl from "./ficha-control";

export type FichaTab = "citas" | "ventas" | "facturas" | "membresias" | "relacionados" | "notas";
export type FichaRow = { id: string; date: string; title: string; amount?: string; status?: { label: string; tone: "pending" | "ok" | "muted" } };

const TABS: { key: FichaTab; label: string }[] = [
  { key: "citas", label: "Citas" },
  { key: "ventas", label: "Ventas y pagos" },
  { key: "facturas", label: "Facturas" },
  { key: "membresias", label: "Membresías" },
  { key: "relacionados", label: "Contactos relacionados" },
  { key: "notas", label: "Notas" },
];

const card = "rounded-xl border border-border bg-card p-[22px]";
const addLink = "font-medium text-accent-text underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring";
const quick = "inline-flex h-[34px] items-center gap-2 rounded-lg border border-border px-3 text-ui font-medium text-foreground outline-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/**
 * Ficha del cliente en modo lectura: la misma estructura de Nuevo cliente (panel de control, tarjetas y columna lateral). Identidad,
 * botones de resumen que filtran el historial, datos del cliente, pestañas de historial y la columna de actividad.
 */
export default function FichaView(props: {
  slug: string;
  customer: { id: string; name: string; active: boolean; kind: "PERSON" | "COMPANY"; phone: string | null; email: string | null; address: string | null; tags: string[]; photoUrl: string | null };
  customersLabel: string;
  listHref: string;
  /** Href de la ficha con la lista de origen (para pestañas y enlaces «Añadir»). */
  hrefFor: (params: Record<string, string>) => string;
  canRemove: boolean;
  bookHref: string | null;
  saleHref: string | null;
  activityHref: string | null;
  pager: { index: number; total: number; prevHref: string | null; nextHref: string | null } | null;
  summary: { bookings: number; sales: number; plan: string | null; owed: string; invoiced: string; opportunities?: number | null };
  /** Pipeline del CRM filtrado por este cliente (con el CRM activo). */
  crmHref?: string | null;
  data: { label: string; value: string | null; empty: string; field?: string }[];
  tab: FichaTab;
  rows: FichaRow[];
  /** Contenido propio de la pestaña (Notas). */
  tabContent?: ReactNode;
  emptyTab: { text: string; action?: { label: string; href: string } };
  activity: ActivityItem[];
  now: string;
}) {
  const { slug, customer, hrefFor } = props;
  const phone = customer.phone?.replace(/\D/g, "") ?? "";
  const shownPhone = phone.length === 10 ? `+57 ${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}` : phone ? `+57 ${phone}` : null;
  const wa = phone ? `https://wa.me/${phone.length === 10 ? `57${phone}` : phone}` : null;
  const initials = customer.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  const edit = (field: string) => hrefFor({ editar: "1", campo: field });

  const contact: { icon: typeof Phone; value: string | null; empty: string; field: string }[] = [
    { icon: Phone, value: shownPhone, empty: "Sin teléfono", field: "phone" },
    { icon: Mail, value: customer.email, empty: "Sin correo", field: "email" },
    { icon: MapPin, value: customer.address, empty: "Sin dirección", field: "address" },
  ];
  const summary: { key: FichaTab; icon: typeof Phone; value: string; label: string; href?: string }[] = [
    ...(props.crmHref && props.summary.opportunities != null ? [{ key: "citas" as FichaTab, icon: Target, value: String(props.summary.opportunities), label: "Oportunidades", href: props.crmHref }] : []),
    { key: "citas", icon: CalendarDays, value: String(props.summary.bookings), label: "Citas" },
    { key: "ventas", icon: ShoppingBag, value: String(props.summary.sales), label: "Ventas" },
    { key: "membresias", icon: CreditCard, value: props.summary.plan ?? "Sin plan", label: "Membresía" },
    { key: "ventas", icon: Banknote, value: props.summary.owed, label: "Por cobrar" },
    { key: "facturas", icon: Receipt, value: props.summary.invoiced, label: "Facturado" },
  ];

  return (
    <div data-bleed="" className="flex flex-col" suppressHydrationWarning>
      <FichaControl
        slug={slug}
        customerId={customer.id}
        name={customer.name}
        customersLabel={props.customersLabel}
        listHref={props.listHref}
        active={customer.active}
        canRemove={props.canRemove}
        bookHref={props.bookHref}
        saleHref={props.saleHref}
        opportunityHref={props.crmHref ? `${props.crmHref}&nueva=1` : null}
        pager={props.pager}
      />

      <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-start gap-5 px-5 pb-24 pt-2">
        <div className="flex min-w-0 shrink grow-[2] basis-[560px] flex-col gap-4">
          {/* Identidad */}
          <section aria-labelledby="ficha-nombre" className={cn(card, "flex flex-wrap items-start gap-5")}>
            <span className="grid size-[88px] shrink-0 place-items-center overflow-hidden rounded-[22px] bg-accent-subtle text-3xl font-semibold text-accent-text">
              {customer.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={customer.photoUrl} alt={`Foto de ${customer.name}`} className="size-full object-cover" />
              ) : (
                <span aria-hidden="true">{initials || "?"}</span>
              )}
            </span>
            <div className="grid min-w-0 flex-1 basis-64 gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 id="ficha-nombre" className="min-w-0 text-3xl font-semibold tracking-tight text-foreground">
                  {customer.name}
                </h1>
                <Badge tone={customer.active ? "success" : "muted"}>{customer.active ? "Activo" : "Archivado"}</Badge>
                <Badge variant="outline">{customer.kind === "COMPANY" ? "Empresa" : "Persona"}</Badge>
              </div>
              <ul className="grid gap-2 text-sm">
                {contact.map(({ icon: Icon, value, empty, field }) => (
                  <li key={field} className="flex min-w-0 items-center gap-2">
                    <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                    {value ? (
                      <span className="truncate text-foreground">{value}</span>
                    ) : (
                      <>
                        <span className="text-muted-foreground">{empty}</span>
                        <Link href={edit(field)} className={addLink} aria-label={`Añadir ${empty.replace("Sin ", "")}`}>
                          Añadir
                        </Link>
                      </>
                    )}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-2">
                {customer.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-border-strong px-2.5 py-0.5 text-xs text-foreground">
                    {tag}
                  </span>
                ))}
                <Link href={edit("tags")} className={cn(addLink, "text-xs")}>
                  + Etiqueta
                </Link>
              </div>
              {wa || customer.email ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {wa ? (
                    <a href={wa} target="_blank" rel="noopener noreferrer" className={quick}>
                      <MessageCircle aria-hidden="true" className="size-4 text-success" />
                      WhatsApp
                    </a>
                  ) : null}
                  {phone ? (
                    <a href={`tel:+57${phone}`} className={quick}>
                      <Phone aria-hidden="true" className="size-4 text-muted-foreground" />
                      Llamar
                    </a>
                  ) : null}
                  {customer.email ? (
                    <a href={`mailto:${customer.email}`} className={quick}>
                      <Mail aria-hidden="true" className="size-4 text-muted-foreground" />
                      Enviar correo
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>

          {/* Botones de resumen: cada uno abre su pestaña del historial */}
          <nav aria-label="Resumen del cliente" className={cn("grid gap-3", summary.length > 5 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-[repeat(auto-fit,minmax(136px,1fr))]")}>
            {summary.map(({ key, icon: Icon, value, label, href }) => (
              <Link
                key={label}
                href={href ?? `${hrefFor({ tab: key })}#historial`}
                className="flex items-center gap-3 rounded-[10px] border border-border bg-card px-3.5 py-3 outline-none transition-colors duration-(--d1) hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
              >
                <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-muted text-accent-text">
                  <Icon className="size-4" />
                </span>
                <span className="grid min-w-0">
                  <span className="truncate text-base font-semibold text-foreground">{value}</span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </span>
              </Link>
            ))}
          </nav>

          {/* Datos del cliente */}
          <section aria-labelledby="ficha-datos" className={card}>
            <h2 id="ficha-datos" className="mb-4 text-base font-semibold text-foreground">
              Datos del cliente
            </h2>
            <dl className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-6 gap-y-5">
              {props.data.map((d) => (
                <div key={d.label} className="grid gap-1">
                  <dt className="text-xs text-muted-foreground">{d.label}</dt>
                  <dd className="text-sm">
                    {d.value ? (
                      <span className="text-foreground">{d.value}</span>
                    ) : (
                      <span className="flex flex-wrap gap-2">
                        <span className="text-muted-foreground">{d.empty}</span>
                        {d.field ? (
                          <Link href={edit(d.field)} className={addLink} aria-label={`Añadir ${d.label.toLowerCase()}`}>
                            Añadir
                          </Link>
                        ) : null}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Historial */}
          <section id="historial" aria-label="Historial" className="scroll-mt-20 overflow-hidden rounded-xl border border-border bg-card">
            <nav aria-label="Historial del cliente" className="flex overflow-x-auto border-b border-border px-2">
              {TABS.map((t) => (
                <Link
                  key={t.key}
                  href={`${hrefFor({ tab: t.key })}#historial`}
                  aria-current={props.tab === t.key ? "page" : undefined}
                  scroll={false}
                  className={cn(
                    "-mb-px shrink-0 border-b-2 px-3 py-3.5 text-sm outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                    props.tab === t.key ? "border-accent font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                </Link>
              ))}
            </nav>
            {props.tabContent ? (
              <div className="p-[22px]">{props.tabContent}</div>
            ) : props.rows.length ? (
              <ul>
                {props.rows.map((r) => (
                  <li key={r.id} className="flex items-center gap-4 border-b border-border/60 px-[22px] py-4 text-sm last:border-b-0">
                    <span className="w-[110px] shrink-0 text-muted-foreground tabular-nums">{r.date}</span>
                    <span className="min-w-0 flex-1 truncate text-foreground">{r.title}</span>
                    {r.amount ? <span className="shrink-0 font-medium tabular-nums text-foreground">{r.amount}</span> : null}
                    {r.status ? (
                      <Badge variant={r.status.tone === "pending" ? "gold" : "default"} tone={r.status.tone === "pending" ? "warning" : r.status.tone === "ok" ? "success" : "muted"}>
                        {r.status.label}
                      </Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 px-[22px] py-5">
                <p className="text-sm text-muted-foreground">{props.emptyTab.text}</p>
                {props.emptyTab.action ? (
                  <Link href={props.emptyTab.action.href} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-[34px] border border-border bg-transparent")}>
                    <FileText aria-hidden="true" className="size-4" />
                    {props.emptyTab.action.label}
                  </Link>
                ) : null}
              </div>
            )}
          </section>
        </div>

        <aside className="flex min-w-0 max-w-[420px] shrink grow basis-[320px] flex-col gap-4">
          <FichaActivity slug={slug} customerId={customer.id} items={props.activity} whatsappHref={wa} activityHref={props.activityHref} now={props.now} />
        </aside>
      </div>
    </div>
  );
}
