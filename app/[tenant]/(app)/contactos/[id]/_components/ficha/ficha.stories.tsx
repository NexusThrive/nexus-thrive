import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../../../.storybook/decorators";
import { AppTopbar } from "@/components/organisms/app-topbar";
import { AppShellProvider } from "@/components/providers/shell-context";
import { buildTenantNav } from "@/lib/experience/navigation/tenant-nav";
import FichaView, { type FichaTab } from "./ficha-view";

const groups = buildTenantNav("retail", ["dashboard", "crm", "bookings", "memberships"]);
const now = "2026-11-07T15:00:00.000Z";
const hrefFor = (p: Record<string, string>) => `/demo/contactos/c1?${new URLSearchParams(p).toString()}`;

/** La ficha como se ve en la app: barra del módulo y la vista con datos de muestra. Acciones de muestra. */
function Ficha({ completa, tab }: { completa: boolean; tab: FichaTab }) {
  return (
    <AppShellProvider value={{ brandName: "Simpleapp", brandSub: "simpleapp", groups, activeKey: "/contactos", title: "María Pérez", hrefFor: (href) => `/demo${href}`, quickActions: [], openSearch: () => {} }}>
      <AppTopbar />
      <div className="min-h-dvh bg-background pt-14">
        <FichaView
          slug="demo"
          customer={{ id: "c1", name: "María Pérez", active: true, kind: "PERSON", phone: "3001234567", email: completa ? "maria@correo.com" : null, address: completa ? "Cra 5 # 10-20, Bocagrande" : null, tags: completa ? ["VIP", "Referido"] : [], photoUrl: null }}
          customersLabel="Clientes"
          listHref="/demo/contactos"
          hrefFor={hrefFor}
          canRemove
          bookHref="/demo/bookings?nuevo=1&cliente=c1"
          saleHref="/demo/ventas/cotizaciones?nuevo=1&cliente=c1"
          activityHref="/demo/crm/tareas?nuevo=1&cliente=c1"
          pager={{ index: 1, total: 5, prevHref: null, nextHref: "/demo/contactos/c2" }}
          summary={completa ? { bookings: 3, sales: 2, plan: "Mensual", owed: "$ 80.000", invoiced: "$ 240.000" } : { bookings: 0, sales: 0, plan: null, owed: "$ 0", invoiced: "$ 0" }}
          data={[
            { label: "Tipo de documento", value: completa ? "Cédula de ciudadanía" : null, empty: "Sin registrar", field: "documentType" },
            { label: "Número de documento", value: completa ? "1047123456" : null, empty: "Sin registrar", field: "documentNumber" },
            { label: "Ciudad", value: completa ? "Cartagena, Bolívar" : null, empty: "Sin registrar", field: "city" },
            { label: "País", value: "Colombia", empty: "Sin registrar", field: "country" },
            { label: "¿Cómo nos conoció?", value: completa ? "Instagram" : null, empty: "Sin especificar", field: "source" },
            { label: "Registrado", value: "7 nov 2026", empty: "Sin registrar" },
          ]}
          tab={tab}
          rows={
            completa && tab === "citas"
              ? [
                  { id: "b1", date: "12 nov 2026", title: "Limpieza facial", status: { label: "Pendiente", tone: "pending" } },
                  { id: "b2", date: "28 oct 2026", title: "Masaje relajante", status: { label: "Atendida", tone: "muted" } },
                ]
              : []
          }
          emptyTab={tab === "citas" ? { text: "Aún no tiene citas.", action: { label: "Agendar primera cita", href: "/demo/bookings" } } : { text: "Aún no tiene ventas ni facturas.", action: { label: "Crear primera venta", href: "/demo/ventas/cotizaciones" } }}
          activity={[
            ...(completa
              ? [
                  { id: "a1", date: "2026-11-07T14:20:00.000Z", text: "Cita agendada: Limpieza facial", author: "Santiago", fresh: true },
                  { id: "a2", date: "2026-11-07T13:05:00.000Z", text: "Pago aprobado · $ 120.000", author: null, fresh: true },
                  { id: "a3", date: "2026-10-28T16:00:00.000Z", text: "Nota: prefiere citas en la tarde", author: "Santiago", fresh: false },
                ]
              : []),
            { id: "created", date: completa ? "2026-10-20T15:00:00.000Z" : "2026-11-07T12:00:00.000Z", text: "Cliente creado", author: null, fresh: !completa },
          ]}
          now={now}
        />
      </div>
    </AppShellProvider>
  );
}

const meta = {
  title: "Páginas/Clientes y agenda/Ficha del cliente",
  component: Ficha,
  decorators: [withShell],
  parameters: { layout: "fullscreen", docs: { description: { component: "Ficha del cliente en modo lectura: identidad, resumen que filtra el historial, datos, pestañas y actividad. Los datos que faltan muestran «Añadir», que abre la edición en ese campo." } } },
  args: { completa: true, tab: "citas" },
} satisfies Meta<typeof Ficha>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Completa: Story = {};
export const RecienCreada: Story = { args: { completa: false, tab: "ventas" } };
