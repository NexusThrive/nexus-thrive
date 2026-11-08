import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../../../.storybook/decorators";
import { AppTopbar } from "@/components/organisms/app-topbar";
import { AppShellProvider } from "@/components/providers/shell-context";
import { buildTenantNav } from "@/lib/experience/navigation/tenant-nav";
import type { OpportunityDetail as Detail } from "@/lib/business/growth/pipeline-read";
import OpportunityDetail from "./opportunity-detail";

const groups = buildTenantNav("retail", ["dashboard", "crm", "bookings", "memberships"]);
const today = new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10);
const at = (hour: number, days = 0) => new Date(Date.parse(`${today}T${String(hour + 5).padStart(2, "0")}:24:00Z`) + days * 86_400_000).toISOString();

const detail: Detail = {
  id: "o1",
  name: "Uniformes · 200 camisetas",
  status: "OPEN",
  value: 4_800_000,
  probability: 20,
  priority: 2,
  expectedClose: null,
  tags: ["Mayorista"],
  description: null,
  source: null,
  lostReason: null,
  stageId: "s1",
  stageSince: at(9, -2),
  createdAt: at(9, -2),
  customer: { id: "c1", name: "Colegio San José", email: "compras@colegiosanjose.edu.co", phone: "3001234567" },
  owner: { id: "u1", name: "Santiago Ortiz" },
  order: null,
  stages: [
    { id: "s1", name: "Nuevo", position: 0, probability: 20, isWon: false },
    { id: "s2", name: "Calificado", position: 1, probability: 40, isWon: false },
    { id: "s3", name: "Propuesta", position: 2, probability: 60, isWon: false },
    { id: "s4", name: "Ganado", position: 3, probability: 100, isWon: true },
  ],
  activities: [{ id: "t1", kind: "CALL", title: "Llamar para confirmar cantidades", dueAt: at(17), assigneeId: "u1", assignee: "Santiago", done: false }],
  events: [
    { id: "e3", kind: "STAGE", data: { from: "Calificado", to: "Nuevo" }, author: "Santiago", at: at(18) },
    { id: "e2", kind: "STAGE", data: { from: "Nuevo", to: "Calificado" }, author: "Santiago", at: at(18) },
    { id: "e1", kind: "CREATED", data: { stage: "Nuevo" }, author: "Santiago", at: at(18) },
  ],
  team: [{ id: "u1", name: "Santiago Ortiz" }],
  reasons: [
    { id: "r1", name: "Precio" },
    { id: "r2", name: "Eligió a la competencia" },
  ],
  files: [],
};

/** El detalle de la oportunidad como se ve en la app (pantalla 9). Acciones de muestra. */
function Oportunidad() {
  return (
    <AppShellProvider value={{ brandName: "Simpleapp", brandSub: "simpleapp", groups, activeKey: "/crm", title: "Ventas", hrefFor: (href) => `/demo${href}`, quickActions: [], openSearch: () => {} }}>
      <AppTopbar />
      <div className="min-h-dvh bg-background pt-14">
        <OpportunityDetail slug="demo" o={detail} now={new Date().toISOString()} backHref="/demo/crm" pager={{ index: 1, total: 10, prevHref: null, nextHref: "/demo/crm/oportunidades/o2" }} />
      </div>
    </AppShellProvider>
  );
}

const meta = {
  title: "Páginas/CRM/Oportunidad",
  component: Oportunidad,
  decorators: [withShell],
  parameters: { layout: "fullscreen", docs: { description: { component: "Detalle de la oportunidad: etapas a un clic, cifras editables, contacto y responsable, próxima actividad y chatter." } } },
} satisfies Meta<typeof Oportunidad>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Detalle: Story = {};
