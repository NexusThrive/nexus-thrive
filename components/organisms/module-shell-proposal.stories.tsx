import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Bell, BarChart3, ChevronLeft, Columns3, FileText, LayoutGrid, List, Package, Plus, Search, Settings, ShoppingCart, Target, Users, Wallet, type LucideIcon } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Kbd } from "@/components/atoms/kbd";
import { cn } from "@/lib/utils";

/**
 * PROPUESTA, sin implementar: maqueta con datos de muestra para comparar cómo se navega un módulo en PC.
 * No usa `AppTopbar` ni `AppSidebar`; nada de aquí llega a la app. Sirve para decidir antes de abrir las historias.
 */

type AppId = "clientes" | "ventas" | "facturacion" | "inventario" | "finanzas";
type App = { id: AppId; label: string; icon: LucideIcon; sections: { id: string; label: string; icon: LucideIcon }[] };

const APPS: App[] = [
  {
    id: "clientes",
    label: "Clientes",
    icon: Users,
    sections: [
      { id: "lista", label: "Clientes", icon: Users },
      { id: "pipeline", label: "Pipeline", icon: Target },
      { id: "tareas", label: "Tareas", icon: List },
      { id: "informes", label: "Informes", icon: BarChart3 },
      { id: "config", label: "Configuración", icon: Settings },
    ],
  },
  {
    id: "ventas",
    label: "Ventas y cobros",
    icon: ShoppingCart,
    sections: [
      { id: "cotizaciones", label: "Cotizaciones", icon: FileText },
      { id: "pedidos", label: "Pedidos", icon: ShoppingCart },
      { id: "cobros", label: "Cobros", icon: Wallet },
    ],
  },
  { id: "facturacion", label: "Facturación", icon: FileText, sections: [{ id: "facturas", label: "Facturas", icon: FileText }, { id: "config", label: "Configuración", icon: Settings }] },
  { id: "inventario", label: "Inventario", icon: Package, sections: [{ id: "productos", label: "Productos", icon: Package }, { id: "existencias", label: "Existencias", icon: List }] },
  { id: "finanzas", label: "Finanzas", icon: Wallet, sections: [{ id: "dinero", label: "Dinero", icon: Wallet }, { id: "cartera", label: "Cartera", icon: List }] },
];

const CLIENTES = [
  { name: "Ferretería El Tornillo", city: "Medellín", stage: "Propuesta", value: "$ 4.200.000", owner: "Laura" },
  { name: "Constructora Andina", city: "Bogotá", stage: "Calificado", value: "$ 18.500.000", owner: "Mateo" },
  { name: "Café del Parque", city: "Cali", stage: "Nuevo", value: "$ 1.300.000", owner: "Laura" },
  { name: "Gimnasio Vital", city: "Bogotá", stage: "Ganado", value: "$ 2.900.000", owner: "Sofía" },
  { name: "Clínica Dental Sonrisa", city: "Pereira", stage: "Propuesta", value: "$ 6.700.000", owner: "Mateo" },
];
const STAGES = ["Nuevo", "Calificado", "Propuesta", "Ganado"] as const;

/** Contenido de muestra de la sección de Clientes: lista o tablero sobre los mismos datos. */
function ClientesContent({ view, onView, section }: { view: "lista" | "tablero"; onView: (v: "lista" | "tablero") => void; section: string }) {
  if (section !== "lista" && section !== "pipeline") {
    return <div className="grid h-72 place-items-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">Contenido de «{section}»</div>;
  }
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div role="group" aria-label="Vista" className="inline-flex rounded-md border border-border-strong p-0.5">
            {([["lista", "Lista", List], ["tablero", "Tablero", Columns3]] as const).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                aria-pressed={view === id}
                onClick={() => onView(id)}
                className={cn("inline-flex h-8 items-center gap-1.5 rounded-xs px-3 text-[12.5px] font-medium outline-none focus-visible:outline-2 focus-visible:outline-ring", view === id ? "bg-surface-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">{CLIENTES.length} clientes · 4 con oportunidad abierta</span>
        </div>
        <Button size="sm" variant="accent"><Plus aria-hidden="true" className="size-4" />Nuevo cliente</Button>
      </div>

      {view === "lista" ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Cliente</th>
                <th scope="col" className="px-4 py-2 font-medium">Ciudad</th>
                <th scope="col" className="px-4 py-2 font-medium">Etapa</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Valor</th>
                <th scope="col" className="px-4 py-2 font-medium">Responsable</th>
              </tr>
            </thead>
            <tbody>
              {CLIENTES.map((c) => (
                <tr key={c.name} className="border-t border-border hover:bg-surface-muted/60">
                  <th scope="row" className="px-4 py-2.5 font-medium text-foreground">{c.name}</th>
                  <td className="px-4 py-2.5 text-muted-foreground">{c.city}</td>
                  <td className="px-4 py-2.5"><span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-foreground">{c.stage}</span></td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-foreground">{c.value}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{c.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="grid gap-3" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          {STAGES.map((stage) => (
            <li key={stage} className="grid content-start gap-2 rounded-lg bg-surface-muted p-2.5">
              <h3 className="px-1 text-xs font-semibold text-muted-foreground">{stage} · {CLIENTES.filter((c) => c.stage === stage).length}</h3>
              {CLIENTES.filter((c) => c.stage === stage).map((c) => (
                <div key={c.name} className="rounded-md border border-border bg-card p-3 text-sm">
                  <p className="font-medium text-foreground">{c.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.city} · {c.owner}</p>
                  <p className="mt-2 text-xs tabular-nums text-foreground">{c.value}</p>
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PlaceholderContent({ app, section }: { app: App; section: string }) {
  const label = app.sections.find((s) => s.id === section)?.label ?? app.label;
  return (
    <div className="grid gap-3">
      <div className="h-9 w-48 rounded-md bg-surface-muted" />
      {[0, 1, 2].map((i) => <div key={i} className="h-14 rounded-lg border border-border bg-card" />)}
      <p className="text-xs text-muted-foreground">Contenido de muestra de «{label}».</p>
    </div>
  );
}

/** Utilidades transversales de la barra superior: búsqueda, crear rápido y avisos. */
function Utilities() {
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label="Buscar (Ctrl K)" className="inline-flex h-8 w-56 items-center gap-2 rounded-md border border-border-strong px-3 text-[12.5px] text-muted-foreground outline-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring">
        <Search aria-hidden="true" className="size-4" />
        <span className="flex-1 text-left">Buscar</span>
        <Kbd>Ctrl K</Kbd>
      </button>
      <Button size="sm" variant="accent"><Plus aria-hidden="true" className="size-4" />Crear</Button>
      <Button size="icon-sm" variant="ghost" aria-label="Avisos"><Bell aria-hidden="true" className="size-4" /></Button>
      <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-surface-muted text-xs font-semibold text-foreground">SA</span>
    </div>
  );
}

/** Marco de pantalla de PC (1280 de ancho) para las dos maquetas. */
const Frame = ({ children }: { children: React.ReactNode }) => <div className="h-[640px] overflow-hidden rounded-lg border border-border bg-background">{children}</div>;

/** Hoy: una barra superior con las secciones del módulo; para cambiar de módulo hay que volver a Inicio. */
function Actual() {
  const [section, setSection] = useState("lista");
  const app = APPS[0]!;
  return (
    <Frame>
      <header className="flex h-12 items-center gap-4 border-b border-border px-4">
        <Button size="icon-sm" variant="ghost" aria-label="Volver a Inicio"><ChevronLeft aria-hidden="true" className="size-4" /></Button>
        <p className="text-sm font-semibold text-foreground">{app.label}</p>
        <nav aria-label="Secciones de Clientes" className="flex gap-1">
          {app.sections.slice(0, 4).map((s) => (
            <button key={s.id} type="button" aria-current={section === s.id ? "page" : undefined} onClick={() => setSection(s.id)} className={cn("h-8 rounded-md px-3 text-[12.5px] font-medium outline-none focus-visible:outline-2 focus-visible:outline-ring", section === s.id ? "bg-surface-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>{s.label}</button>
          ))}
        </nav>
        <div className="ml-auto"><Utilities /></div>
      </header>
      <main className="h-[calc(100%-3rem)] overflow-auto p-6">
        <p className="mb-4 rounded-md bg-surface-muted px-3 py-2 text-xs text-muted-foreground">Para ir a Cobros o Facturación hay que volver a Inicio y abrir esa app. CRM y Clientes son dos apps distintas.</p>
        <ClientesContent view="lista" onView={() => {}} section={section} />
      </main>
    </Frame>
  );
}

/** Propuesta: riel de apps (cambio en un clic), secciones del módulo en un panel y Clientes con el pipeline como vista. */
function Propuesta({ initialApp = "clientes" as AppId, initialView = "lista" as "lista" | "tablero" }) {
  const [appId, setAppId] = useState<AppId>(initialApp);
  const [section, setSection] = useState("lista");
  const [view, setView] = useState<"lista" | "tablero">(initialView);
  const app = APPS.find((a) => a.id === appId)!;
  const pick = (id: AppId) => { setAppId(id); setSection(APPS.find((a) => a.id === id)!.sections[0]!.id); };
  return (
    <Frame>
      <div className="grid h-full" style={{ gridTemplateColumns: "64px 208px minmax(0, 1fr)" }}>
        <nav aria-label="Aplicaciones" className="flex flex-col items-center gap-1 border-r border-border bg-card py-3">
          <button type="button" aria-label="Inicio: todas las aplicaciones" className="mb-2 grid size-10 place-items-center rounded-lg text-muted-foreground outline-none hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><LayoutGrid aria-hidden="true" className="size-5" /></button>
          {APPS.map((a) => (
            <button key={a.id} type="button" aria-label={a.label} title={a.label} aria-current={a.id === appId ? "page" : undefined} onClick={() => pick(a.id)} className={cn("relative grid size-10 place-items-center rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-ring", a.id === appId ? "bg-surface-muted text-accent-text" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground")}>
              {a.id === appId && <span aria-hidden="true" className="absolute -left-3 h-5 w-1 rounded-r bg-accent" />}
              <a.icon aria-hidden="true" className="size-5" />
            </button>
          ))}
        </nav>
        <nav aria-label={`Secciones de ${app.label}`} className="border-r border-border p-3">
          <p className="px-2 pb-2 pt-1 text-xs font-semibold text-muted-foreground">{app.label}</p>
          <ul className="grid gap-0.5">
            {app.sections.map((s) => (
              <li key={s.id}>
                <button type="button" aria-current={section === s.id ? "page" : undefined} onClick={() => { setSection(s.id); if (appId === "clientes" && (s.id === "lista" || s.id === "pipeline")) setView(s.id === "lista" ? "lista" : "tablero"); }} className={cn("flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] outline-none focus-visible:outline-2 focus-visible:outline-ring", section === s.id ? "bg-surface-muted font-medium text-foreground" : "text-muted-foreground hover:bg-surface-muted/60 hover:text-foreground")}>
                  <s.icon aria-hidden="true" className="size-4" />
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="grid min-w-0" style={{ gridTemplateRows: "48px minmax(0, 1fr)" }}>
          <header className="flex items-center justify-between border-b border-border px-5">
            <h1 className="text-sm font-semibold text-foreground">{app.sections.find((s) => s.id === section)?.label}</h1>
            <Utilities />
          </header>
          <main className="overflow-auto p-6">
            {appId === "clientes" ? <ClientesContent view={view} onView={setView} section={section} /> : <PlaceholderContent app={app} section={section} />}
          </main>
        </div>
      </div>
    </Frame>
  );
}

const meta = {
  title: "Propuestas/Navegación de módulo en PC",
  component: Propuesta,
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "desktop" },
    docs: {
      story: { inline: false, iframeHeight: 700 },
      description: {
        component:
          "Maqueta sin implementar. **Hoy**: barra superior con pestañas; cambiar de módulo exige volver a Inicio, y CRM y Clientes son dos apps. **Propuesta**: riel de apps (un clic para saltar entre módulos), panel con las secciones del módulo y la barra superior solo para búsqueda, «Crear», avisos y cuenta. «Clientes» reúne la lista y el pipeline como dos vistas de los mismos datos. En móvil no cambia (barra inferior y «Más»).",
      },
    },
  },
} satisfies Meta<typeof Propuesta>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Hoy: Story = { render: () => <Actual /> };
export const PropuestaRielYSecciones: Story = { name: "Propuesta · riel + secciones", args: {} };
export const PropuestaPipelineComoVista: Story = { name: "Propuesta · pipeline como vista de Clientes", args: { initialView: "tablero" } };
export const PropuestaOtroModulo: Story = { name: "Propuesta · saltar a otro módulo", args: { initialApp: "ventas" } };
