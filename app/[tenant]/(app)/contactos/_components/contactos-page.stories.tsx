import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import { AppTopbar } from "@/components/organisms/app-topbar";
import { AppShellProvider } from "@/components/providers/shell-context";
import { getVerticalTerms } from "@/lib/core/sectors/terms";
import { buildTenantNav } from "@/lib/experience/navigation/tenant-nav";
import { VerticalTermsProvider } from "../../vertical-terms-context";
import CustomerTable, { type CustomerRow } from "./customer-table";
import CustomerToolbar from "./customer-toolbar";
import { CustomerSelectionProvider } from "./customer-selection";

const groups = buildTenantNav("retail", ["dashboard", "crm", "bookings", "memberships", "quotes", "orders", "finance"]);

const row = (id: string, name: string, extra: Partial<CustomerRow> = {}): CustomerRow => ({
  id,
  name,
  email: `${name.toLowerCase().split(" ")[0]}@correo.com`,
  phone: "300 123 4567",
  active: true,
  createdAt: "4 nov 2026",
  photoId: null,
  tags: [],
  documentId: null,
  hasMembership: true,
  nextAppointment: null,
  owed: 0,
  overdue: 0,
  city: "Bogotá",
  ...extra,
});

const ROWS: CustomerRow[] = [
  row("1", "María Pérez", { nextAppointment: "2026-11-09T15:30:00.000Z", owed: 120_000, overdue: 60_000, documentId: "1.020.345.678", tags: ["VIP"], createdAt: "7 nov 2026" }),
  row("2", "Andrés Gómez", { email: "andres.gomez@empresa-de-logistica.com", createdAt: "6 nov 2026" }),
  row("3", "Restaurante Sol", { phone: "601 555 0101", owed: 850_000, overdue: 850_000, documentId: "900.123.456-7", city: "Medellín", tags: ["Empresa", "Mayorista"], createdAt: "5 nov 2026" }),
  row("4", "Camila Torres", { nextAppointment: "2026-11-08T13:00:00.000Z", createdAt: "3 nov 2026" }),
  row("5", "Gym Center", { email: "", phone: "", createdAt: "2 nov 2026" }),
  row("6", "Laura Restrepo", { owed: 45_000, createdAt: "1 nov 2026" }),
  row("7", "Juan Pablo Ríos", { nextAppointment: "2026-11-12T22:00:00.000Z", createdAt: "30 oct 2026" }),
  row("8", "Distribuidora del Norte S.A.S.", { email: "compras@distribuidoradelnorte.co", createdAt: "28 oct 2026" }),
];

/** La página de Contactos tal como se ve dentro del módulo: barra del módulo, panel de control y tabla. */
function ContactosPage({ rows }: { rows: CustomerRow[] }) {
  return (
    <AppShellProvider value={{ brandName: "Simpleapp", brandSub: "simpleapp", groups, activeKey: "/contactos", title: "Clientes", hrefFor: (href) => `/demo${href}`, quickActions: [], openSearch: () => {} }}>
      <VerticalTermsProvider terms={getVerticalTerms("retail")}>
        <AppTopbar />
        <CustomerSelectionProvider status="active">
          <div data-bleed="" className="flex min-h-dvh flex-col bg-background pt-14">
            <CustomerToolbar tenantSlug="demo" status="active" page={1} pageSize={20} totalPages={1} total={rows.length} />
            <CustomerTable tenantSlug="demo" rows={rows} status="active" sort="recent" query="" canRemove showMembership={false} />
          </div>
        </CustomerSelectionProvider>
      </VerticalTermsProvider>
    </AppShellProvider>
  );
}

const meta = {
  title: "Páginas/Clientes y agenda/Contactos",
  component: ContactosPage,
  decorators: [withShell],
  parameters: { layout: "fullscreen", docs: { description: { component: "Lista de contactos a todo el ancho: barra del módulo, panel de control (Nuevo, título, búsqueda, paginación y vistas) y tabla compacta. Datos de muestra." } } },
  args: { rows: ROWS },
} satisfies Meta<typeof ContactosPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ConClientes: Story = {};
export const SinClientes: Story = { args: { rows: [] } };
