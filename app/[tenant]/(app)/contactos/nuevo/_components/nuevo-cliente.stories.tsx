import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../../.storybook/decorators";
import { AppTopbar } from "@/components/organisms/app-topbar";
import { AppShellProvider } from "@/components/providers/shell-context";
import { buildTenantNav } from "@/lib/experience/navigation/tenant-nav";
import NewCustomerForm from "./new-customer-form";

const groups = buildTenantNav("retail", ["dashboard", "crm", "bookings", "memberships"]);

/** La vista como se ve en la app: barra del módulo y el formulario. Acciones de muestra. */
function NuevoCliente({ canBook }: { canBook: boolean }) {
  return (
    <AppShellProvider value={{ brandName: "Simpleapp", brandSub: "simpleapp", groups, activeKey: "/contactos", title: "Nuevo cliente", hrefFor: (href) => `/demo${href}`, quickActions: [], openSearch: () => {} }}>
      <AppTopbar />
      <div className="min-h-dvh bg-background pt-14">
        <NewCustomerForm slug="demo" customersLabel="Clientes" canBook={canBook} />
      </div>
    </AppShellProvider>
  );
}

const meta = {
  title: "Páginas/Clientes y agenda/Nuevo cliente",
  component: NuevoCliente,
  decorators: [withShell],
  parameters: { layout: "fullscreen", docs: { description: { component: "Alta completa de un cliente: identidad, contacto, ubicación, secciones opcionales y vista previa en vivo. Solo el nombre es obligatorio; salir con cambios pide confirmación." } } },
  args: { canBook: true },
} satisfies Meta<typeof NuevoCliente>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Vacio: Story = {};
export const SinAgenda: Story = { args: { canBook: false } };
