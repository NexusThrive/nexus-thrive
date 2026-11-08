import { crmSearchDefs } from "@/lib/business/growth/crm-search";
import { toSchema } from "@/lib/foundation/list-search";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../../.storybook/decorators";
import { AppTopbar } from "@/components/organisms/app-topbar";
import { AppShellProvider } from "@/components/providers/shell-context";
import { buildTenantNav } from "@/lib/experience/navigation/tenant-nav";
import type { PipelineCard, PipelineStage } from "@/lib/business/growth/pipeline-db";
import PipelineView from "./pipeline-view";

const groups = buildTenantNav("retail", ["dashboard", "crm", "bookings", "memberships"]);
/** Instante a `days` días de hoy, a la hora dada de Bogotá. */
const at = (days: number, hour = 17) => new Date(Date.parse(`${new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10)}T${String(hour + 5).padStart(2, "0")}:00:00Z`) + days * 86_400_000).toISOString();

const stages: PipelineStage[] = [
  { id: "s1", name: "Nuevo", position: 0, probability: 20, isWon: false },
  { id: "s2", name: "Calificado", position: 1, probability: 40, isWon: false },
  { id: "s3", name: "Propuesta", position: 2, probability: 60, isWon: false },
  { id: "s4", name: "Ganado", position: 3, probability: 100, isWon: true },
];
const owner = { id: "u1", name: "Santiago Ortiz" };
const base = { tags: [] as string[], owner, orderId: null, orderPaid: null, orderCanceled: false, position: null, expectedClose: null, createdAt: "2026-11-01T12:00:00Z", won: false };
const next = (kind: "CALL" | "MEETING" | "PROPOSAL" | "OTHER", days: number, title = "") => ({ id: `t-${kind}-${days}`, kind, title, dueAt: at(days), assigneeId: "u1" });
const cards: PipelineCard[] = [
  { ...base, id: "o1", name: "Uniformes · 200 camisetas", value: 4_800_000, probability: 20, stageId: "s1", customer: { id: "c1", name: "Colegio San José" }, tags: ["Mayorista"], priority: 2, next: next("CALL", 0, "Llamar") },
  { ...base, id: "o2", name: "Plan corporativo · 15 socios", value: 3_200_000, probability: 20, stageId: "s1", customer: { id: "c2", name: "Constructora Bolívar" }, priority: 1, next: null },
  { ...base, id: "o3", name: "Visita guiada · grupo de 40", value: 1_600_000, probability: 20, stageId: "s1", customer: { id: "c3", name: "Fundación Cartagena" }, priority: 3, next: next("CALL", -2) },
  { ...base, id: "o4", name: "Reposición · 120 polos oversize", value: 4_100_000, probability: 40, stageId: "s2", customer: { id: "c4", name: "Tienda Moda Centro" }, tags: ["Distribuidor"], priority: 2, next: next("MEETING", 5) },
  { ...base, id: "o5", name: "Membresía anual · familia Torres", value: 2_900_000, probability: 40, stageId: "s2", customer: { id: "c5", name: "Familia Torres" }, priority: 1, next: next("PROPOSAL", 0) },
  { ...base, id: "o6", name: "Evento corporativo · museo", value: 6_500_000, probability: 60, stageId: "s3", customer: { id: "c6", name: "Banco Gran Caribe" }, tags: ["Evento"], priority: 3, next: next("OTHER", 6) },
  { ...base, id: "o7", name: "Dotación · 80 camisas bordadas", value: 4_900_000, probability: 60, stageId: "s3", customer: { id: "c7", name: "Hotel Marbella" }, priority: 2, next: next("CALL", -5) },
  { ...base, id: "o8", name: "Camisetas · torneo interbarrios", value: 2_800_000, probability: 100, stageId: "s4", customer: { id: "c8", name: "Liga Deportiva" }, priority: 2, next: null, won: true, orderId: "p1", orderPaid: false },
  { ...base, id: "o9", name: "Plan semestral · 6 socios", value: 1_900_000, probability: 100, stageId: "s4", customer: { id: "c9", name: "Agencia Tropical" }, priority: 1, next: null, won: true, orderId: "p2", orderPaid: true },
];

const SCHEMA = toSchema(crmSearchDefs({ me: owner.id, owners: [owner], stages, tags: ["Distribuidor", "Evento", "Mayorista"] }));

/** El pipeline como se ve en la app: barra del módulo CRM y el tablero con datos de muestra. Acciones de muestra. */
function Pipeline({ quick, empty, vista }: { quick: boolean; empty: boolean; vista: "tablero" | "lista" | "grafico" }) {
  return (
    <AppShellProvider value={{ brandName: "Simpleapp", brandSub: "simpleapp", groups, activeKey: "/crm", title: "Ventas", hrefFor: (href) => `/demo${href}`, quickActions: [], openSearch: () => {} }}>
      <AppTopbar />
      <div className="min-h-dvh bg-background pt-14">
        <PipelineView
          key={`${quick}-${empty}-${vista}`}
          slug="demo"
          view={vista}
          stages={stages}
          cards={empty ? [] : cards}
          lost={empty ? { count: 0, total: 0 } : { count: 4, total: 6_300_000 }}
          lostRows={[]}
          activities={[]}
          month="2026-11"
          customerName={null}
          schema={SCHEMA}
          favorites={[]}
          preset={null}
          hasAny={!empty}
          canConfig
        />
      </div>
    </AppShellProvider>
  );
}

const meta = {
  title: "Páginas/CRM/Pipeline",
  component: Pipeline,
  decorators: [withShell],
  parameters: { layout: "fullscreen", nextjs: { navigation: { pathname: "/demo/crm", query: {} } }, docs: { description: { component: "App CRM › Ventas: el pipeline en tablero con creación rápida, arrastrar y soltar, Perdidos plegada y las demás vistas." } } },
  args: { quick: false, empty: false, vista: "tablero" },
} satisfies Meta<typeof Pipeline>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Tablero: Story = {};
export const CreacionRapida: Story = { parameters: { nextjs: { navigation: { pathname: "/demo/crm", query: { nueva: "1" } } } } };
export const Lista: Story = { args: { vista: "lista" } };
export const Grafico: Story = { args: { vista: "grafico" } };
export const SinOportunidades: Story = { args: { empty: true } };
