import { useState, type CSSProperties, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BarChart3, Bell, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Download, Ellipsis, FileText, LayoutGrid, LifeBuoy, MessageSquare, Package, PanelLeft, Receipt, Search, Settings, Target, TrendingUp, UserPlus, Users, Wallet, type LucideIcon } from "lucide-react";
import { N_PATH } from "@nexus/brand/BrandLogo";
import { Button } from "@/components/atoms/button";
import { Delta } from "@/components/atoms/delta";
import { formatCount } from "@/components/atoms/count-up";
import { cn } from "@/lib/utils";

/**
 * PROPUESTA, sin implementar. Tablero de Inicio calcado de una imagen de referencia (un «dashboard overview» de gestión): fondo gris
 * con una barra lateral plana (bloque del negocio, «Menú», lista con insignia, y abajo modo oscuro, ayuda y configuración), una barra
 * superior sin marca y un panel blanco redondeado con el saludo, cuatro KPI, ventas con calendario de puntos, estado en dona y, abajo,
 * tareas, actividad y próximos eventos. Traducido a Nexus: tokens negro y oro, español y datos de un negocio de servicios. Los datos
 * son de muestra y nada de aquí llega a la app.
 */

const eyebrow = "text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground";
const card = "grid-cols-1 min-w-0 overflow-hidden rounded-xl border border-border bg-card";

const CSS = `
.dh-side{display:none}
.dh-kpis{display:grid;gap:16px;grid-template-columns:repeat(4,minmax(0,1fr))}
.dh-r2{display:grid;gap:16px;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr)}
.dh-r3{display:grid;gap:16px;grid-template-columns:repeat(3,minmax(0,1fr))}
.dh-months{display:grid;gap:24px;grid-template-columns:repeat(3,minmax(0,1fr))}
@media (min-width:768px){.dh-side{display:flex}}
@media (max-width:1180px){.dh-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.dh-r2{grid-template-columns:minmax(0,1fr)}.dh-r3{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:767.98px){.dh-desk{display:none!important}.dh-kpis,.dh-r3{grid-template-columns:minmax(0,1fr)}.dh-months{grid-template-columns:minmax(0,1fr)}}
`;

/** Marco gris: la barra lateral a la izquierda y, a la derecha, la barra superior y el panel blanco. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate flex overflow-hidden rounded-lg bg-surface-muted" style={{ height: 880 } as CSSProperties}>
      <style>{CSS}</style>
      {children}
    </div>
  );
}

type NavEntry = { label: string; icon: LucideIcon; current?: boolean; sub?: string[]; badge?: boolean };
const NAV: NavEntry[] = [
  { label: "Resumen", icon: LayoutGrid, current: true },
  { label: "Productos", icon: Package },
  { label: "Clientes", icon: Users, sub: ["Lista", "Pipeline", "Tareas"] },
  { label: "Cotizaciones", icon: FileText, badge: true },
  { label: "Cobros", icon: Wallet },
  { label: "Facturación", icon: Receipt },
  { label: "Informes", icon: BarChart3 },
  { label: "Analítica", icon: TrendingUp },
];

/** Barra lateral de la referencia: bloque del negocio, «Menú», lista plana y, al pie, modo oscuro, ayuda y configuración. */
function Sidebar() {
  const [open, setOpen] = useState<string | null>(null);
  const link = "flex h-9 w-full items-center gap-3 rounded-lg px-3 text-[13px] outline-none focus-visible:outline-2 focus-visible:outline-ring";
  return (
    <aside className="dh-side shrink-0 flex-col gap-5 p-3" style={{ width: 208 }} aria-label="Navegación principal">
      <div className="flex items-center gap-2.5 rounded-xl bg-card p-2">
        <span aria-hidden="true" className="grid shrink-0 place-items-center rounded-lg bg-surface-muted text-foreground" style={{ width: 36, height: 36 }}>
          <svg viewBox="387.6 239.9 744.4 606" style={{ width: 20 }} shapeRendering="geometricPrecision"><path d={N_PATH} fill="currentColor" /></svg>
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-ui font-semibold text-foreground">Simplapp</span>
          <span className="block truncate text-2xs text-muted-foreground">Medellín</span>
        </span>
        <button type="button" aria-label="Contraer la barra lateral" className="grid size-8 shrink-0 place-items-center rounded-md border border-border text-muted-foreground outline-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring">
          <PanelLeft aria-hidden="true" className="size-4" />
        </button>
      </div>

      <nav aria-label="Menú" className="grid gap-1">
        <p className="px-3 pb-1 text-xs text-muted-foreground">Menú</p>
        {NAV.map((n) => (
          <div key={n.label}>
            {n.sub ? (
              <button type="button" aria-expanded={open === n.label} aria-controls={`sub-${n.label}`} onClick={() => setOpen(open === n.label ? null : n.label)} className={cn(link, "text-muted-foreground hover:bg-card hover:text-foreground")}>
                <n.icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.7} />
                <span className="flex-1 truncate text-left">{n.label}</span>
                <ChevronDown aria-hidden="true" className={cn("size-3.5 transition-transform", open === n.label && "rotate-180")} />
              </button>
            ) : (
              <a href="#" aria-current={n.current ? "page" : undefined} className={cn(link, n.current ? "bg-card font-medium text-foreground" : "text-muted-foreground hover:bg-card hover:text-foreground")}>
                <n.icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.7} />
                <span className="flex-1 truncate">{n.label}</span>
                {n.badge ? <span role="img" aria-label="Con novedades" className="size-1.5 rounded-full bg-danger" /> : null}
              </a>
            )}
            {n.sub && open === n.label ? (
              <ul id={`sub-${n.label}`} className="mt-1 grid gap-0.5 border-l border-border" style={{ marginLeft: 20, paddingLeft: 10 }}>
                {n.sub.map((item) => (
                  <li key={item}><a href="#" className="flex h-8 items-center rounded-md px-2.5 text-[13px] text-muted-foreground outline-none hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">{item}</a></li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </nav>

      <div className="mt-auto grid gap-1">
        <a href="#" className={cn(link, "text-muted-foreground hover:bg-card hover:text-foreground")}><LifeBuoy aria-hidden="true" className="size-4" strokeWidth={1.7} />Centro de ayuda</a>
        <a href="#" className={cn(link, "text-muted-foreground hover:bg-card hover:text-foreground")}><Settings aria-hidden="true" className="size-4" strokeWidth={1.7} />Configuración</a>
      </div>
    </aside>
  );
}

/** Barra superior de la referencia: título de la página, búsqueda en píldora, dos iconos y la persona. Sin marca. */
function Topbar() {
  return (
    <header className="flex shrink-0 items-center gap-3 px-4 md:px-6" style={{ height: 56 }}>
      <h2 className="text-ui font-semibold text-foreground">Resumen del negocio</h2>
      <button type="button" className="dh-desk ml-auto flex h-9 w-full items-center gap-2 rounded-full bg-card pl-3.5 pr-3 text-ui text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" style={{ maxWidth: 360 }}>
        <Search aria-hidden="true" className="size-4 shrink-0" />
        <span className="truncate">Buscar clientes, cobros…</span>
      </button>
      <div className="ml-auto flex shrink-0 items-center gap-1.5 md:ml-0">
        <Button size="icon-sm" variant="outline" aria-label="Mensajes" className="dh-desk rounded-md bg-card"><MessageSquare aria-hidden="true" className="size-4" /></Button>
        <Button size="icon-sm" variant="outline" aria-label="Agenda" className="dh-desk rounded-md bg-card"><CalendarDays aria-hidden="true" className="size-4" /></Button>
        <button type="button" aria-label="Notificaciones" className="relative grid size-9 place-items-center rounded-full text-muted-foreground outline-none hover:bg-card focus-visible:outline-2 focus-visible:outline-ring">
          <Bell aria-hidden="true" className="size-4" />
          <span aria-hidden="true" className="absolute right-2 top-2 size-1.5 rounded-full bg-accent" />
        </button>
        <span className="dh-desk flex items-center gap-2 pl-1.5">
          <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-card text-xs font-semibold text-foreground">SA</span>
          <span className="grid leading-tight"><span className="text-ui font-medium text-foreground">Santiago</span><span className="text-2xs text-muted-foreground">Administrador</span></span>
          <ChevronDown aria-hidden="true" className="size-3.5 text-muted-foreground" />
        </span>
      </div>
    </header>
  );
}

function CardHead({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-ui font-semibold text-foreground">{title}</h3>
      {right ?? <button type="button" aria-label={`Opciones de ${title}`} className="grid size-8 place-items-center rounded-md text-muted-foreground outline-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"><Ellipsis aria-hidden="true" className="size-4" /></button>}
    </div>
  );
}

function Select({ label }: { label: string }) {
  return (
    <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-strong px-3 text-[12.5px] font-medium text-foreground outline-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring">
      {label}
      <ChevronDown aria-hidden="true" className="size-3.5 text-muted-foreground" />
    </button>
  );
}


/** KPI de la referencia: icono y título, descripción corta, valor grande y píldora de tendencia (con flecha y signo, no solo color). */
function Kpi({ label, description, value, delta, icon: Icon, inverse = false }: { label: string; description: string; value: string; delta: number; icon: LucideIcon; inverse?: boolean }) {
  const good = inverse ? delta < 0 : delta > 0;
  const tint = `color-mix(in srgb, var(${good ? "--success" : "--danger"}) 12%, transparent)`;
  return (
    <article className={cn(card, "grid content-start gap-1 p-4")} aria-label={label}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="inline-flex items-center gap-2 text-ui font-medium text-foreground"><Icon aria-hidden="true" className="size-4 text-muted-foreground" strokeWidth={1.7} />{label}</h3>
        <button type="button" aria-label={`Opciones de ${label}`} className="grid size-7 place-items-center rounded-md text-muted-foreground outline-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"><Ellipsis aria-hidden="true" className="size-4" /></button>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      <p className="mt-2 font-semibold tabular-nums tracking-tight text-foreground" style={{ fontSize: 28, lineHeight: 1.15, whiteSpace: "nowrap" }}>{value}</p>
      <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-md px-1.5 py-0.5" style={{ background: tint }}><Delta value={delta} inverse={inverse} /></span>
        vs. periodo anterior
      </p>
    </article>
  );
}

/** Calendario de puntos de un mes: círculo en oro = día con ventas; cuadro gris = sin ventas. La forma sale de una semilla fija, no es dato real. */
function DotMonth({ name, seed }: { name: string; seed: number }) {
  const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const on = (r: number, c: number) => ((r * 7 + c) * seed + r * 3 + c) % 5 < 3 && !(r === 0 && c < seed % 3);
  return (
    <div>
      <p className="mb-3 text-ui font-medium text-foreground">{name}</p>
      <div className="grid gap-x-2 gap-y-2" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
        {Array.from({ length: 5 }).flatMap((_, r) =>
          days.map((d, c) => (
            <span key={`${r}-${c}`} aria-hidden="true" className={cn("block w-full", on(r, c) ? "rounded-full bg-accent" : "rounded-md bg-surface-muted")} style={{ aspectRatio: "1 / 1", maxWidth: 28 }} title={d} />
          )),
        )}
        {days.map((d) => (
          <span key={d} aria-hidden="true" className="text-center text-muted-foreground" style={{ fontSize: 10 }}>{d}</span>
        ))}
      </div>
    </div>
  );
}

/** Dona con total al centro y un tramo por estado (SVG con los colores del sistema). */
function Donut({ parts, total }: { parts: { value: number; color: string }[]; total: number }) {
  const r = 58;
  const c = 2 * Math.PI * r;
  const starts = parts.map((_, i) => parts.slice(0, i).reduce((a, p) => a + (p.value / total) * c, 0));
  return (
    <svg role="img" aria-label={`${total} cotizaciones en total`} viewBox="0 0 150 150" style={{ width: 170, height: 170 }} className="shrink-0">
      <g transform="rotate(-90 75 75)">
        {parts.map((p, i) => (
          <circle key={i} cx="75" cy="75" r={r} fill="none" stroke={p.color} strokeWidth="14" strokeLinecap="round" strokeDasharray={`${Math.max((p.value / total) * c - 4, 0)} ${c}`} strokeDashoffset={-starts[i]!} />
        ))}
      </g>
      <text x="75" y="70" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10 }}>Total</text>
      <text x="75" y="92" textAnchor="middle" className="fill-foreground" style={{ fontSize: 26, fontWeight: 600 }}>{total}</text>
    </svg>
  );
}

const STATES = [
  { label: "Aprobadas", value: 258, color: "var(--accent)" },
  { label: "Enviadas", value: 89, color: "var(--accent-text)" },
  { label: "En borrador", value: 43, color: "var(--nx-graphite-400)" },
  { label: "Vencidas", value: 34, color: "var(--border-strong)" },
];
const TOTAL = STATES.reduce((a, s) => a + s.value, 0);

function Ventas() {
  return (
    <section className={cn(card, "grid content-start gap-5 p-5")} aria-label="Ventas del periodo">
      <CardHead title="Ventas del periodo" right={<Select label="Este año" />} />
      <div className="flex items-center justify-between">
        <p className="font-semibold tracking-tight text-foreground" style={{ fontSize: 40, lineHeight: 1 }}>+124%</p>
        <div className="flex gap-2">
          <button type="button" aria-label="Meses anteriores" className="grid size-8 place-items-center rounded-full border border-border-strong text-foreground outline-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"><ChevronLeft aria-hidden="true" className="size-4" /></button>
          <button type="button" aria-label="Meses siguientes" className="grid size-8 place-items-center rounded-full border border-border-strong text-foreground outline-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"><ChevronRight aria-hidden="true" className="size-4" /></button>
        </div>
      </div>
      <div className="dh-months">
        <DotMonth name="Septiembre" seed={3} />
        <DotMonth name="Octubre" seed={4} />
        <DotMonth name="Noviembre" seed={7} />
      </div>
    </section>
  );
}

function Estado() {
  return (
    <section className={cn(card, "grid content-start gap-4 p-5")} aria-label="Estado de las cotizaciones">
      <CardHead title="Estado de cotizaciones" right={<Select label="Este mes" />} />
      <div className="flex flex-wrap items-center gap-5">
        <Donut parts={STATES} total={TOTAL} />
        <ul className="grid min-w-0 flex-1 gap-3" style={{ minWidth: 170 }}>
          {STATES.map((s) => (
            <li key={s.label} className="grid gap-1">
              <div className="flex items-center justify-between text-ui">
                <span className="inline-flex items-center gap-2 text-foreground"><span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: s.color }} />{s.label}</span>
                <span className="font-semibold tabular-nums text-foreground">{s.value}</span>
              </div>
              <span aria-hidden="true" className="block h-1.5 overflow-hidden rounded-full bg-surface-muted"><span className="block h-full rounded-full" style={{ width: `${(s.value / TOTAL) * 100}%`, background: s.color }} /></span>
            </li>
          ))}
        </ul>
      </div>
      <Button variant="accent" className="w-full">Ver todas</Button>
    </section>
  );
}

const TASKS = [
  { who: "Constructora Andina", what: "Cotización #1042", due: "20 nov · 1:30 pm", level: "alta" },
  { who: "Ferretería El Tornillo", what: "Cotización #1038", due: "21 nov · 9:00 am", level: "baja" },
];
function Tareas() {
  return (
    <section className={cn(card, "grid content-start gap-3 p-5")} aria-label="Tus tareas">
      <CardHead title="Tus tareas" />
      {TASKS.map((t) => (
        <article key={t.what} className="grid gap-3 rounded-lg border border-border p-3.5">
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-muted text-xs font-semibold text-foreground">{t.who.slice(0, 2).toUpperCase()}</span>
            <p className="truncate text-ui font-semibold text-foreground">{t.who}</p>
          </div>
          <div className="flex items-end justify-between gap-2 text-xs">
            <span><span className="block text-foreground">{t.what}</span><span className="text-muted-foreground">Prioridad {t.level}</span></span>
            <span className="text-right text-muted-foreground">{t.due}</span>
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <Button variant="outline" size="sm">Rechazar</Button>
            <Button variant="accent" size="sm">Aprobar</Button>
          </div>
        </article>
      ))}
    </section>
  );
}

const ACTIVITY: { group: string; items: [string, string, LucideIcon][] }[] = [
  { group: "Cobros", items: [["Cobro recibido de Gimnasio Vital", "20 nov · 1:30 pm", Wallet], ["Factura #9345 pagada por Café del Parque", "20 nov · 11:10 am", Wallet]] },
  { group: "Clientes", items: [["Nuevo cliente: Clínica Dental Sonrisa", "19 nov · 4:45 pm", UserPlus], ["Oportunidad movida a Propuesta", "19 nov · 2:20 pm", Target]] },
];
function Actividad() {
  return (
    <section className={cn(card, "grid content-start gap-3 p-5")} aria-label="Actividad reciente">
      <CardHead title="Actividad reciente" right={<Button variant="outline" size="sm">Ver todo</Button>} />
      {ACTIVITY.map((g) => (
        <div key={g.group} className="grid grid-cols-1 gap-2">
          <p className="text-ui text-muted-foreground">{g.group}</p>
          {g.items.map(([title, when, Icon]) => (
            <div key={title} className="flex items-center gap-3 rounded-lg border border-border p-3">
              <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-muted text-accent-text"><Icon className="size-4" strokeWidth={1.7} /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-ui font-medium text-foreground">{title}</span><span className="text-xs text-muted-foreground">{when}</span></span>
              <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

const EVENTS: [string, string, string, boolean][] = [
  ["7:30 am", "Renovación de contrato", "Sara Joon · Constructora Andina", false],
  ["9:00 am", "Visita al cliente", "Johan Smith · Ferretería El Tornillo", true],
  ["10:30 am", "Llamada de seguimiento", "Laura Pérez · Café del Parque", false],
];
function Eventos() {
  const week: [string, number][] = [["Dom", 15], ["Lun", 16], ["Mar", 17], ["Mié", 18], ["Jue", 19], ["Vie", 20]];
  return (
    <section className={cn(card, "grid content-start gap-3 p-5")} aria-label="Próximos eventos">
      <CardHead title="Próximos eventos" right={<Button variant="outline" size="sm">Ver todo</Button>} />
      <div className="flex items-center justify-between">
        <p className="text-ui font-semibold text-foreground">Noviembre 2026</p>
        <div className="flex gap-1.5">
          <button type="button" aria-label="Semana anterior" className="grid size-8 place-items-center rounded-full border border-border-strong outline-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"><ChevronLeft aria-hidden="true" className="size-4" /></button>
          <button type="button" aria-label="Semana siguiente" className="grid size-8 place-items-center rounded-full border border-border-strong outline-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"><ChevronRight aria-hidden="true" className="size-4" /></button>
        </div>
      </div>
      <ol className="grid text-center text-xs" style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}>
        {week.map(([d, n]) => (
          <li key={d} className="grid gap-1"><span className="text-muted-foreground">{d}</span><span aria-current={n === 17 ? "date" : undefined} className={cn("mx-auto grid size-7 place-items-center rounded-full tabular-nums", n === 17 ? "bg-accent font-semibold text-ink" : "text-foreground")}>{n}</span></li>
        ))}
      </ol>
      {EVENTS.map(([time, title, who, active], i) => (
        <div key={title} className="grid gap-2">
          {i === 2 ? (
            <div className="grid items-center gap-3" style={{ gridTemplateColumns: "62px minmax(0, 1fr)" }} role="separator" aria-label="Hora actual">
              <span className="text-right text-xs font-medium text-foreground">9:40 am</span>
              <span aria-hidden="true" className="relative block h-px bg-accent"><span className="absolute rounded-full bg-accent" style={{ left: -3, top: -3, width: 7, height: 7 }} /></span>
            </div>
          ) : null}
          <div className="grid items-start gap-3" style={{ gridTemplateColumns: "62px minmax(0, 1fr)" }}>
            <span className="pt-2 text-xs text-muted-foreground">{time}</span>
            <div className={cn("rounded-lg border p-3", active ? "border-accent" : "border-border")} style={active ? { backgroundImage: "repeating-linear-gradient(135deg, transparent 0 6px, color-mix(in srgb, var(--accent) 14%, transparent) 6px 7px)" } : undefined}>
              <p className="text-ui font-medium text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground">{who}</p>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

function Tablero() {
  return (
    <Frame>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main id="contenido" className="min-h-0 flex-1 overflow-y-auto rounded-2xl bg-card" style={{ margin: "0 12px 12px 0" }}>
          <div className="mx-auto grid gap-4 px-5 pb-16 md:px-6" style={{ maxWidth: 1180, paddingTop: 24 }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="grid gap-1">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Buenos días, <span className="text-accent-text">Santiago</span></h1>
                <p className={eyebrow}>miércoles, 12 de noviembre de 2026</p>
              </div>
              <Button variant="outline" size="sm"><Download aria-hidden="true" className="size-4" />Exportar informe</Button>
            </div>

            <div className="dh-kpis">
              <Kpi label="Ventas del mes" description="Ventas totales de este mes" value={formatCount("cop", 21400000)} delta={12} icon={FileText} />
              <Kpi label="Cobros pendientes" description="Por cobrar de este mes" value={formatCount("cop", 4850000)} delta={8} inverse icon={Wallet} />
              <Kpi label="Clientes activos" description="Clientes con actividad este mes" value="424" delta={12} icon={UserPlus} />
              <Kpi label="Tasa de cierre" description="Oportunidades ganadas" value="78,8%" delta={3.2} icon={Target} />
            </div>

            <div className="dh-r2">
              <Ventas />
              <Estado />
            </div>

            <div className="dh-r3">
              <Tareas />
              <Actividad />
              <Eventos />
            </div>
          </div>
        </main>
      </div>
    </Frame>
  );
}

const meta = {
  title: "Propuestas/Tablero de inicio (referencia)",
  component: Tablero,
  parameters: {
    layout: "fullscreen",
    docs: {
      story: { inline: false, iframeHeight: 920 },
      description: {
        component:
          "Maqueta sin implementar, calcada de una imagen de referencia. Barra lateral plana propia (bloque del negocio, «Menú», insignia roja en Cotizaciones, y al pie modo oscuro, ayuda y configuración), barra superior sin marca y panel blanco con saludo + «Exportar informe», 4 KPI (`KpiCard` real), ventas con calendario de puntos en oro, estado de cotizaciones en dona, tareas, actividad y próximos eventos. Con poco ancho la barra lateral desaparece y las filas se apilan.",
      },
    },
  },
} satisfies Meta<typeof Tablero>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Escritorio: Story = {};
export const Movil: Story = { name: "Móvil", globals: { viewport: { value: "mobile1" } } };
