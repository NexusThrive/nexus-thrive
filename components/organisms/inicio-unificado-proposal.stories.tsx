import type { CSSProperties, ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ArrowRight, Bell, Building2, Check, ChevronDown, Ellipsis, House, MapPin, Plus, Search, type LucideIcon } from "lucide-react";
import { N_PATH, THRIVE_LETTERS } from "@nexus/brand/BrandLogo";
import { Button } from "@/components/atoms/button";
import { Kbd } from "@/components/atoms/kbd";
import { GridBackdrop } from "@/components/molecules/grid-backdrop";
import { AppSidebar } from "@/components/organisms/app-sidebar";
import { BalanceCard } from "@/components/organisms/balance-card";
import { FirstStepsIndicator, type WelcomeStep } from "@/components/organisms/first-steps-indicator";
import { AppShellProvider } from "@/components/providers/shell-context";
import { buildTenantNav } from "@/lib/experience/navigation/tenant-nav";
import { cn } from "@/lib/utils";
import styles from "./app-topbar.module.css";

/**
 * PROPUESTA, sin implementar. Inicio dentro del mismo armazón que los módulos: la barra lateral real (`AppSidebar`), una barra
 * superior que no se esconde en Inicio, y el contenido ordenado por «qué hago ahora». Las apps pasan de ser el centro a una fila
 * compacta de «Mis apps». Usa los tokens, el logo y los componentes actuales; los datos son de muestra y nada de aquí llega a la app.
 */

const eyebrow = "text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground";
const MODULES = ["dashboard", "crm", "quotes", "inventory", "billing", "payments", "finance"] as const;
const groups = buildTenantNav("general", [...MODULES]);

const STEPS: WelcomeStep[] = [
  { id: "customer", title: "Agrega tu primer cliente", description: "Con un cliente puedes cotizar, cobrar y llevar su historial.", cta: "Agregar cliente", href: "#", done: true, icon: "customer" },
  { id: "catalog", title: "Carga tus servicios o productos", description: "Es lo que vas a cotizar y facturar.", cta: "Cargar catálogo", href: "#", done: false, icon: "catalog" },
  { id: "payment", title: "Registra tu primer cobro", description: "Así tu balance empieza a contar.", cta: "Registrar cobro", href: "#", done: false, icon: "payment" },
  { id: "expense", title: "Anota un gasto", description: "Para ver cuánto te queda de verdad.", cta: "Anotar gasto", href: "#", done: false, icon: "expense" },
];

/** Marco que contiene los elementos fijos (barra lateral y superior) dentro de la historia. */
function Frame({ children, height = 780 }: { children: ReactNode; height?: number }) {
  return (
    <div
      className="relative isolate overflow-hidden rounded-lg border border-border bg-background"
      style={{ height, transform: "translateZ(0)", "--sw": "248px", "--topbar-height": "60px" } as CSSProperties}
    >
      <style>{".pf-main{margin-left:0}@media (min-width:768px){.pf-main{margin-left:var(--sw)}.pf-mobile{display:none}}@media (max-width:767.98px){.pf-desk{display:none}}@media (min-width:900px){.pf-next{grid-template-columns:minmax(0,1fr) minmax(0,340px)}}"}</style>
      {children}
    </div>
  );
}

/** Barra superior constante: la marca sobre el fondo de la barra lateral, el negocio, la búsqueda, «Crear», avisos y cuenta. */
function Topbar({ withSteps }: { withSteps: boolean }) {
  return (
    <header className="fixed inset-x-0 top-0 z-10 flex items-stretch" style={{ height: 60 }}>
      <a href="#" aria-label="Simplapp: inicio" className={cn(styles.brand, "pl-4 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring md:pl-3")}>
        <span className={cn(styles.logo, styles.mark)}>
          <svg role="img" aria-label="NEXUS THRIVE" viewBox="387.6 239.9 744.4 779.5" shapeRendering="geometricPrecision">
            <path d={N_PATH} fill="currentColor" />
            <g className={styles.letters}>
              {THRIVE_LETTERS.map((l, i) => (
                <path key={i} transform={`translate(${l.x} ${l.y})`} d={l.d} fill="currentColor" />
              ))}
            </g>
          </svg>
        </span>
      </a>
      <div className="flex min-w-0 flex-1 items-center gap-3 border-b border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] px-3 text-[var(--sidebar-fg)] md:gap-4 md:px-6">
        <button type="button" className="pf-desk hidden h-10 shrink-0 items-center gap-2 rounded-md px-2.5 text-ui font-medium outline-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring md:inline-flex">
          <Building2 aria-hidden="true" className="size-4 text-accent-text" strokeWidth={1.8} />
          Simplapp
          <ChevronDown aria-hidden="true" className="size-3.5 text-muted-foreground" />
        </button>
        <button type="button" className="group hidden h-10 w-full max-w-[520px] items-center gap-2.5 rounded-md border border-border bg-surface-muted pl-3.5 pr-2.5 text-ui text-muted-foreground outline-none transition-colors hover:border-border-input hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:flex">
          <Search aria-hidden="true" className="size-4 shrink-0" />
          <span className="truncate">Buscar clientes, cobros o secciones…</span>
          <Kbd className="ml-auto shrink-0">Ctrl K</Kbd>
        </button>
        <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-3">
          {withSteps ? <FirstStepsIndicator steps={STEPS} /> : null}
          <Button variant="accent" className="hidden md:inline-flex"><Plus aria-hidden="true" className="size-4" />Crear</Button>
          <button type="button" aria-label="Buscar" className="grid size-10 place-items-center rounded-md hover:bg-surface-muted md:hidden"><Search aria-hidden="true" className="size-[18px]" /></button>
          <button type="button" aria-label="Notificaciones" className="relative grid size-10 place-items-center rounded-md text-muted-foreground outline-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring">
            <Bell aria-hidden="true" className="size-[18px]" />
            <span aria-hidden="true" className="absolute right-2.5 top-2.5 size-2 rounded-full bg-accent" />
          </button>
          <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-surface-muted text-xs font-semibold text-foreground">SA</span>
        </div>
      </div>
    </header>
  );
}

/** Barra inferior del móvil: Inicio, dos apps, «Crear» al centro y «Más» (ahí vive el lanzador completo). */
function MobileTabBar() {
  const tab = (label: string, Icon: LucideIcon, current = false) => (
    <button type="button" aria-current={current ? "page" : undefined} className={cn("flex min-w-14 flex-col items-center gap-0.5 py-1.5 text-2xs outline-none focus-visible:outline-2 focus-visible:outline-ring", current ? "font-semibold text-accent-text" : "text-muted-foreground")}>
      <Icon aria-hidden="true" className="size-5" />
      {label}
    </button>
  );
  return (
    <nav aria-label="Navegación" className="pf-mobile fixed inset-x-0 bottom-0 z-10 flex items-center justify-around border-t border-border bg-[var(--sidebar-bg)] px-2 pb-[env(safe-area-inset-bottom,0px)] pt-1">
      {tab("Inicio", House, true)}
      {tab("Clientes", groups[1]?.icon ?? House)}
      <Button size="icon" variant="accent" aria-label="Crear" className="-mt-5 size-12 rounded-full"><Plus aria-hidden="true" className="size-5" /></Button>
      {tab("Ventas", groups[2]?.icon ?? House)}
      {tab("Más", Ellipsis)}
    </nav>
  );
}

/** Saludo y una sola línea de contexto: lo que ya no son tres píldoras compitiendo. */
function Greeting({ line }: { line: string }) {
  return (
    <div className="grid gap-1.5">
      <p className={eyebrow}>martes, 11 de noviembre</p>
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        Buenos días, <span className="text-accent-text">Santiago</span>
      </h1>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ui text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><MapPin aria-hidden="true" className="size-3.5 text-accent-text" strokeWidth={1.8} />Medellín</span>
        <span aria-hidden="true">·</span>
        {line}
      </p>
    </div>
  );
}

/** «Mis apps»: las apps del negocio en una fila compacta con el mismo icono que la barra lateral. Ya no son el centro de Inicio. */
function MyApps() {
  const apps = groups.filter((g) => g.label !== "Sistema" && g.label !== "General" && g.items.length > 0);
  return (
    <section aria-labelledby="mis-apps">
      <div className="flex items-baseline justify-between">
        <h2 id="mis-apps" className={eyebrow}>Mis apps</h2>
        <a href="#" className="text-ui text-accent-text underline-offset-4 hover:underline">Ver todas</a>
      </div>
      <ul className="mt-3 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(176px, 1fr))" }}>
        {apps.map((g) => {
          const Icon = g.icon ?? g.items[0]!.icon;
          return (
            <li key={g.label}>
              <a href="#" className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 outline-none transition-colors hover:border-border-input hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-muted text-accent-text group-hover:bg-card"><Icon aria-hidden="true" className="size-5" strokeWidth={1.6} /></span>
                <span className="min-w-0">
                  <span className="block truncate text-ui font-medium text-foreground">{g.label}</span>
                  <span className="block text-2xs text-muted-foreground">{g.items.length} {g.items.length === 1 ? "sección" : "secciones"}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Negocio nuevo: la pregunta de Inicio es «¿cuál es mi siguiente paso?». Una tarjeta principal y el resto en orden. */
function NextStep() {
  const done = STEPS.filter((s) => s.done).length;
  const next = STEPS.find((s) => !s.done)!;
  return (
    <section aria-labelledby="siguiente" className="pf-next grid gap-5 rounded-xl border border-border bg-card p-5 md:p-6">
      <div className="grid content-start gap-3">
        <p className={eyebrow}>Tu siguiente paso · {done} de {STEPS.length}</p>
        <h2 id="siguiente" className="text-xl font-semibold tracking-tight text-foreground">{next.title}</h2>
        <p className="max-w-prose text-ui text-muted-foreground">{next.description}</p>
        <div className="flex items-center gap-3 pt-1">
          <Button variant="accent">{next.cta}<ArrowRight aria-hidden="true" className="size-4" /></Button>
          <button type="button" className="text-ui text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring">Ahora no</button>
        </div>
      </div>
      <ol className="grid content-start gap-1.5">
        {STEPS.map((s) => (
          <li key={s.id} className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-ui", s.id === next.id ? "bg-surface-muted font-medium text-foreground" : "text-muted-foreground")}>
            <span aria-hidden="true" className={cn("grid size-5 shrink-0 place-items-center rounded-full border", s.done ? "border-transparent bg-accent text-ink" : "border-border-strong")}>{s.done ? <Check className="size-3" strokeWidth={3} /> : null}</span>
            <span className={s.done ? "line-through" : undefined}>{s.title}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Negocio activo: lo que pide atención hoy, con salida a cada cosa. */
function Attention() {
  const items = [
    { title: "3 facturas vencidas", hint: "Suman $ 4.850.000 · la más antigua, 12 días", cta: "Cobrar" },
    { title: "2 oportunidades sin actividad", hint: "Constructora Andina y Café del Parque", cta: "Ver pipeline" },
    { title: "Cotización por aprobar", hint: "Ferretería El Tornillo · $ 4.200.000", cta: "Revisar" },
  ];
  return (
    <section aria-labelledby="atencion">
      <h2 id="atencion" className={eyebrow}>Para hoy</h2>
      <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {items.map((i) => (
          <li key={i.title} className="flex items-center gap-3 px-4 py-3">
            <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-accent" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-ui font-medium text-foreground">{i.title}</span>
              <span className="block truncate text-xs text-muted-foreground">{i.hint}</span>
            </span>
            <Button size="sm" variant="outline">{i.cta}</Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Month() {
  return (
    <section aria-labelledby="mes" className="grid content-start gap-3">
      <h2 id="mes" className={eyebrow}>Este mes</h2>
      <BalanceCard label="Balance de noviembre" balance={12850000} income={21400000} expenses={8550000} />
    </section>
  );
}

type Mode = "nuevo" | "activo";

function Inicio({ mode }: { mode: Mode }) {
  return (
    <AppShellProvider value={{ brandName: "Simplapp", brandSub: "simplapp", groups, activeKey: "home", title: "Inicio", hrefFor: (href) => href, quickActions: [], openSearch: () => {} }}>
      <Frame>
        <Topbar withSteps={mode === "nuevo"} />
        <AppSidebar />
        <main className="pf-main absolute inset-0 overflow-y-auto" style={{ paddingTop: 60 }} id="contenido">
          <div className="relative isolate">
            <GridBackdrop variant="home" />
            <div className="mx-auto grid gap-7 px-5 pb-28 pt-6 md:px-8 md:pb-16" style={{ maxWidth: 1080, paddingTop: 32 }}>
              <Greeting line={mode === "nuevo" ? "Prueba gratuita: 12 días" : "Todo al día, con 3 cosas por revisar"} />
              {mode === "nuevo" ? (
                <>
                  <NextStep />
                  <MyApps />
                </>
              ) : (
                <>
                  <Attention />
                  <Month />
                  <MyApps />
                </>
              )}
            </div>
          </div>
        </main>
        <MobileTabBar />
      </Frame>
    </AppShellProvider>
  );
}

const meta = {
  title: "Propuestas/Inicio con armazón unificado",
  component: Inicio,
  parameters: {
    layout: "fullscreen",
    docs: {
      story: { inline: false, iframeHeight: 820 },
      description: {
        component:
          "Maqueta sin implementar. **Lo que cambia frente a hoy:** Inicio usa el mismo armazón que los módulos (barra lateral real + barra superior que no se esconde); el centro de apps pasa a «Mis apps» en una fila compacta; y el contenido responde una sola pregunta: negocio nuevo → *¿cuál es mi siguiente paso?*; negocio activo → *¿qué requiere atención hoy?*. En móvil: barra inferior con Inicio, dos apps, «Crear» y «Más».",
      },
    },
  },
} satisfies Meta<typeof Inicio>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Primer día: un siguiente paso claro, el anillo de primeros pasos en la barra y las apps debajo. */
export const NegocioNuevo: Story = { name: "Negocio nuevo", args: { mode: "nuevo" } };
/** Con uso: lo que pide atención, el mes y las apps. */
export const NegocioActivo: Story = { name: "Negocio activo", args: { mode: "activo" } };
/** Móvil: sin barra lateral; barra inferior con «Crear» al centro. */
export const Movil: Story = { name: "Móvil · negocio nuevo", args: { mode: "nuevo" }, globals: { viewport: { value: "mobile1" } } };
