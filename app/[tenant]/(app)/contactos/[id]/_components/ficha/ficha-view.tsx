import FichaGroups from "./ficha-groups";
import type { GroupOption } from "../../../_components/customer-group-dialogs";
import type { ReactNode } from "react";
import Link from "next/link";
import { Banknote, CalendarDays, CalendarPlus, CreditCard, Globe, IdCard, Mail, MapPin, Megaphone, MessageCircle, Pencil, Phone, Plus, Receipt, ShoppingBag, Target, UserRound, Users, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { CustomerAvatar } from "@/components/atoms/customer-avatar";
import { EmptyState } from "@/components/molecules/empty-state";
import { Widget, WidgetHead, widgetRow } from "@/components/widgets/widget";
import { TopbarCrumbs } from "@/components/molecules/topbar-crumbs";
import { cn } from "@/lib/utils";
import FichaActivity, { type ActivityItem } from "./ficha-activity";
import FichaControl from "./ficha-control";
import FichaMissing from "./ficha-missing";

export type FichaTab = "citas" | "ventas" | "productos" | "facturas" | "membresias" | "relacionados" | "notas";
export type FichaRow = { id: string; date: string; title: string; amount?: string; status?: { label: string; tone: "pending" | "ok" | "muted" } };

const TABS: { key: FichaTab; label: string }[] = [
  { key: "citas", label: "Citas" },
  { key: "ventas", label: "Ventas y pagos" },
  { key: "productos", label: "Productos comprados" },
  { key: "facturas", label: "Facturas" },
  { key: "membresias", label: "Membresías" },
  { key: "relacionados", label: "Contactos relacionados" },
  { key: "notas", label: "Notas" },
];

/** Botón circular de acción (editar, llamar, escribir…): mismo gesto que la referencia. */
const round = "grid size-11 shrink-0 place-items-center rounded-full bg-surface-muted text-foreground outline-none transition-colors hover:bg-accent-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Icono de cada dato del cliente según su etiqueta (la lista llega ya armada del servidor). */
function dataIcon(label: string): LucideIcon {
  const l = label.toLowerCase();
  if (l.includes("documento")) return IdCard;
  if (l.includes("ciudad")) return MapPin;
  if (l.includes("país") || l.includes("pais")) return Globe;
  if (l.includes("conoci")) return Megaphone;
  if (l.includes("registrado")) return CalendarDays;
  return UserRound;
}

/**
 * Ficha del cliente en modo lectura, como un tablero suave: arriba el título y tres cifras; a la izquierda el historial de interacción en
 * fichas, las cifras restantes y las pestañas; a la derecha el perfil (avatar grande y botones redondos) y la información detallada.
 * Mismos datos y rutas de siempre; solo cambia cómo se presentan.
 */
export default function FichaView(props: {
  slug: string;
  /** Todos los grupos propios del negocio (para agregar al cliente a otro). */
  groupOptions: GroupOption[];
  customer: { id: string; name: string; active: boolean; kind: "PERSON" | "COMPANY"; phone: string | null; email: string | null; address: string | null; tags: string[]; photoUrl: string | null; groups: { id: string; name: string; icon: string }[] };
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
  /** Botón para asignar una membresía a este cliente (ya vinculado); `null` si el módulo no está activo. */
  membershipAction?: ReactNode;
  activity: ActivityItem[];
  now: string;
}) {
  const { slug, customer, hrefFor } = props;
  const phone = customer.phone?.replace(/\D/g, "") ?? "";
  const shownPhone = phone.length === 10 ? `+57 ${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}` : phone ? `+57 ${phone}` : null;
  const wa = phone ? `https://wa.me/${phone.length === 10 ? `57${phone}` : phone}` : null;
  const edit = (field: string) => hrefFor({ editar: "1", campo: field });
  const editHref = `/${slug}/contactos/${customer.id}?editar=1`;

  const contact: { icon: LucideIcon; label: string; value: string | null; empty: string; field: string }[] = [
    { icon: Phone, label: "Teléfono", value: shownPhone, empty: "Sin teléfono", field: "phone" },
    { icon: Mail, label: "Correo electrónico", value: customer.email, empty: "Sin correo", field: "email" },
    { icon: MapPin, label: "Dirección", value: customer.address, empty: "Sin dirección", field: "address" },
  ];
  const summary: { key: FichaTab; icon: LucideIcon; value: string; label: string; href?: string }[] = [
    ...(props.crmHref && props.summary.opportunities != null ? [{ key: "citas" as FichaTab, icon: Target, value: String(props.summary.opportunities), label: "Oportunidades", href: props.crmHref }] : []),
    { key: "citas", icon: CalendarDays, value: String(props.summary.bookings), label: "Citas" },
    { key: "ventas", icon: ShoppingBag, value: String(props.summary.sales), label: "Ventas" },
    { key: "membresias", icon: CreditCard, value: props.summary.plan ?? "Sin plan", label: "Membresía" },
    { key: "ventas", icon: Banknote, value: props.summary.owed, label: "Por cobrar" },
    { key: "facturas", icon: Receipt, value: props.summary.invoiced, label: "Facturado" },
  ];
  const inTiles = summary;
  // Información detallada: solo lo que ya existe; lo que falta se sugiere desde el «!» de la tarjeta.
  const rows = [
    ...contact.map((c) => ({ icon: c.icon, label: c.label, value: c.value, field: c.field as string | undefined })),
    ...props.data.map((d) => ({ icon: dataIcon(d.label), label: d.label, value: d.value, field: d.field })),
  ];
  const known = rows.filter((r): r is typeof r & { value: string } => Boolean(r.value));
  const missing = rows.filter((r) => !r.value && r.field).map((r) => ({ label: r.label, href: edit(r.field as string) }));
  // Estado vacío de cada pestaña: icono, qué es, y un botón que lleva a crearlo ya vinculado a este cliente (el enlace trae `cliente=`).
  const first = customer.name.trim().split(/\s+/)[0] ?? customer.name;
  const cta = cn(buttonVariants({ variant: "accent" }), "h-11 rounded-full px-6 text-sm font-semibold");
  const sale = props.saleHref ? (
    <Link href={props.saleHref} className={cta}>
      Crear venta
    </Link>
  ) : undefined;
  function emptyFor(key: FichaTab): { icon: ReactNode; title: string; description: string; action?: ReactNode } {
    switch (key) {
      case "citas":
        return {
          icon: <CalendarDays />,
          title: "Aún no tiene citas",
          description: `Agenda la primera cita de ${first}: queda vinculada a su ficha y le avisamos por WhatsApp.`,
          action: props.bookHref ? (
            <Link href={props.bookHref} className={cta}>
              Agendar cita
            </Link>
          ) : undefined,
        };
      case "ventas":
        return { icon: <ShoppingBag />, title: "Aún no tiene ventas ni pagos", description: `Crea una venta o registra un cobro: quedará en el historial de ${first}.`, action: sale };
      case "facturas":
        return { icon: <Receipt />, title: "Aún no tiene facturas", description: "Las facturas salen de una venta. Crea la primera y aparecerá aquí.", action: sale };
      case "membresias":
        return { icon: <CreditCard />, title: "Aún no tiene membresías", description: `Asigna un plan a ${first} y aquí verás su vigencia y sus renovaciones.`, action: props.membershipAction };
      case "relacionados":
        return { icon: <Users />, title: "Aún no tiene contactos relacionados", description: "Aquí aparecerán las personas o empresas vinculadas a este cliente." };
      default:
        return { icon: <ShoppingBag />, title: "Aún no hay nada", description: "Cuando haya movimientos, los verás aquí." };
    }
  }
  const summaryHref = (s: (typeof summary)[number]) => s.href ?? `${hrefFor({ tab: s.key })}#historial`;

  return (
    <div
      data-bleed=""
      className="flex flex-col pb-6"
      style={{ backgroundImage: "radial-gradient(70% 55% at 0% 0%, color-mix(in srgb, var(--accent) 7%, transparent), transparent 70%), radial-gradient(60% 50% at 100% 100%, color-mix(in srgb, var(--accent) 6%, transparent), transparent 70%)" }}
      suppressHydrationWarning
    >
      {/* La ruta («Clientes › nombre») vive en la barra superior, donde se dice en qué vista se está. */}
      <TopbarCrumbs items={[{ label: props.customersLabel, href: props.listHref }, { label: customer.name }]} />
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

      <div className="grid w-full items-start gap-4 px-6 pt-4 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* Columna ancha: historial en fichas, cifras y pestañas */}
        <div className="grid min-w-0 gap-4">
          <Widget aria-labelledby="ficha-actividad" className="p-6">
            <FichaActivity bare slug={slug} customerId={customer.id} customerName={customer.name} items={props.activity} whatsappHref={wa} activityHref={props.activityHref} now={props.now} />
          </Widget>

          {inTiles.length ? (
            <nav aria-label="Resumen del cliente" className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
              {inTiles.map((s) => (
                <Link
                  key={s.label}
                  href={summaryHref(s)}
                  className="group grid min-h-[112px] content-between gap-3 rounded-3xl border border-border/60 bg-card p-4 outline-none transition-colors hover:bg-accent-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                    <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-surface-muted text-accent-text">
                      <s.icon className="size-4" strokeWidth={1.7} />
                    </span>
                  </span>
                  <span className="truncate text-xl font-semibold tabular-nums">{s.value}</span>
                </Link>
              ))}
            </nav>
          ) : null}

          {/* Historial por pestañas */}
          <Widget id="historial" aria-label="Historial" className="scroll-mt-20 gap-0 p-0">
            <nav aria-label="Historial del cliente" className="flex gap-1.5 overflow-x-auto p-4 pb-3">
              {TABS.map((t) => (
                <Link
                  key={t.key}
                  href={`${hrefFor({ tab: t.key })}#historial`}
                  aria-current={props.tab === t.key ? "page" : undefined}
                  scroll={false}
                  className={cn(
                    "shrink-0 rounded-full px-4 py-2 text-sm outline-none transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                    props.tab === t.key ? "bg-accent-subtle font-medium text-foreground" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                  )}
                >
                  {t.label}
                </Link>
              ))}
            </nav>
            {props.tabContent ? (
              <div className="p-6 pt-3">{props.tabContent}</div>
            ) : props.rows.length ? (
              <ul className="grid gap-2 p-4 pt-1">
                {props.rows.map((r) => (
                  <li key={r.id} className={cn(widgetRow, "flex items-center gap-4 px-4 py-3.5 text-sm")}>
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
              <EmptyState remember={false} mark="center" headingLevel={3} className="pt-4" {...emptyFor(props.tab)} />
            )}
          </Widget>
        </div>

        {/* Columna derecha: perfil e información detallada */}
        <aside className="grid min-w-0 gap-4">
          <Widget aria-labelledby="ficha-nombre" className="justify-items-center gap-4 p-6 text-center">
            <span className="grid size-[120px] shrink-0 place-items-center overflow-hidden rounded-full bg-accent-subtle ring-8 ring-accent-subtle/50">
              <CustomerAvatar identity={{ name: customer.name, id: customer.id }} photoUrl={customer.photoUrl} className="size-full" />
            </span>
            <div className="grid justify-items-center gap-2">
              <h1 id="ficha-nombre" className="min-w-0 break-words font-display text-2xl font-semibold tracking-tight text-foreground">
                {customer.name}
              </h1>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Badge tone={customer.active ? "success" : "muted"}>{customer.active ? "Activo" : "Archivado"}</Badge>
                <Badge variant="outline">{customer.kind === "COMPANY" ? "Empresa" : "Persona"}</Badge>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link href={editHref} aria-label="Editar cliente" title="Editar" className={round}>
                <Pencil aria-hidden="true" className="size-[18px]" strokeWidth={1.7} />
              </Link>
              {wa ? (
                <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="Escribir por WhatsApp" title="WhatsApp" className={round}>
                  <MessageCircle aria-hidden="true" className="size-[18px]" strokeWidth={1.7} />
                </a>
              ) : null}
              {phone ? (
                <a href={`tel:+57${phone}`} aria-label="Llamar" title="Llamar" className={round}>
                  <Phone aria-hidden="true" className="size-[18px]" strokeWidth={1.7} />
                </a>
              ) : null}
              {customer.email ? (
                <a href={`mailto:${customer.email}`} aria-label="Enviar correo" title="Enviar correo" className={round}>
                  <Mail aria-hidden="true" className="size-[18px]" strokeWidth={1.7} />
                </a>
              ) : null}
              {props.bookHref ? (
                <Link href={props.bookHref} aria-label="Nueva cita" title="Nueva cita" className={round}>
                  <CalendarPlus aria-hidden="true" className="size-[18px]" strokeWidth={1.7} />
                </Link>
              ) : null}
            </div>
            {props.saleHref ? (
              <Link href={props.saleHref} className={cn(buttonVariants({ variant: "accent" }), "h-11 w-full rounded-full text-sm font-semibold")}>
                Nueva venta
              </Link>
            ) : null}
            {customer.groups.length || customer.tags.length ? (
              <div className="grid w-full justify-items-center gap-3 border-t border-border/50 pt-4">
                <FichaGroups part="chips" tenantSlug={props.slug} customerId={customer.id} customerName={customer.name} current={customer.groups} options={props.groupOptions} />
                {customer.tags.length ? (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {customer.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-surface-muted px-3 py-1 text-xs text-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {/* Pie de la tarjeta: «Grupo» y «Etiqueta» como dos botones divididos, de borde a borde. */}
            <div className="-mx-6 -mb-6 mt-2 grid w-[calc(100%+3rem)] grid-cols-2 border-t border-border/50">
              <FichaGroups
                part="add"
                tenantSlug={props.slug}
                customerId={customer.id}
                customerName={customer.name}
                current={customer.groups}
                options={props.groupOptions}
                addClassName="inline-flex h-14 items-center justify-center gap-2 rounded-bl-(--radius-widget) text-sm font-medium text-accent-text outline-none transition-colors hover:bg-accent-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              />
              <Link href={edit("tags")} className="inline-flex h-14 items-center justify-center gap-2 rounded-br-(--radius-widget) border-l border-border/50 text-sm font-medium text-accent-text outline-none transition-colors hover:bg-accent-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
                <Plus aria-hidden="true" className="size-4" />
                Etiqueta
              </Link>
            </div>
          </Widget>

          <Widget aria-labelledby="ficha-datos" className="p-6">
            <WidgetHead
              id="ficha-datos"
              title="Información detallada"
              subtitle="Contacto, documento y origen"
              right={
                <span className="flex items-center gap-2">
                  <FichaMissing items={missing} editHref={editHref} />
                  <Link href={editHref} aria-label="Editar la información del cliente" title="Editar" className={cn(round, "size-9")}>
                    <Pencil aria-hidden="true" className="size-4" strokeWidth={1.7} />
                  </Link>
                </span>
              }
            />
            {known.length ? (
              <dl className="grid gap-1">
                {known.map((d) => (
                  <div key={d.label} className="flex items-center gap-3 rounded-2xl px-2 py-2.5">
                    <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-muted text-muted-foreground">
                      <d.icon className="size-[18px]" strokeWidth={1.6} />
                    </span>
                    <div className="grid min-w-0 flex-1 gap-0.5">
                      <dt className="text-xs text-muted-foreground">{d.label}</dt>
                      <dd className="min-w-0 truncate text-ui font-medium text-foreground">{d.value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            ) : (
              <p className={cn(widgetRow, "text-ui text-muted-foreground")}>Aún no hay datos. Pulsa el «!» para ver cuáles añadir.</p>
            )}
          </Widget>
        </aside>
      </div>
    </div>
  );
}
