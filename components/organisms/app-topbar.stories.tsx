import { startTransition, useState } from "react";
import { Bell } from "lucide-react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { AppShellProvider } from "@/components/providers/shell-context";
import { buildTenantNav } from "@/lib/experience/navigation/tenant-nav";
import { withShell } from "../../.storybook/decorators";
import { AppTopbar } from "./app-topbar";
import { CommandPalette } from "./command-palette";
import { BusinessSwitcher } from "./business-switcher";
import { NavbarSearch } from "./navbar-search";

const meta = {
  title: "Organismos/AppTopbar",
  component: AppTopbar,
  decorators: [withShell],
  parameters: {
    layout: "fullscreen",
    nextjs: { navigation: { pathname: "/constructora/quotes" } },
    docs: {
      description: {
        component:
          "Navbar global fija de 60 px, por encima de la barra lateral. Izquierda: celda de marca con el fondo de la barra lateral (logo con THRIVE; con el riel, THRIVE se desvanece y queda la N). Centro: negocio y sección actual. Derecha: buscador (Ctrl K), «Crear» con las acciones del negocio, notificaciones, tema y cuenta. Móvil: la N, el negocio y la búsqueda.",
      },
    },
  },
} satisfies Meta<typeof AppTopbar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** `--sw` lo define la plantilla del negocio; aquí se fija al ancho de la barra completa. */
export const Desktop: Story = {
  render: () => (
    <div style={{ "--sw": "248px", minHeight: 140 } as React.CSSProperties}>
      <AppTopbar
        search={<NavbarSearch />}
        switcher={<BusinessSwitcher currentSlug="constructora" currentName="Constructora Andina" businesses={[{ slug: "constructora", name: "Constructora Andina" }]} />}
      />
      <CommandPalette inlineOnDesktop />
    </div>
  ),
};
export const Mobile: Story = { ...Desktop, globals: { viewport: { value: "mobile1" } } };

/** Con el riel (tablet o barra contraída) el logo se recorta a la N, más chica. */
export const Rail: Story = {
  render: () => (
    <div style={{ "--sw": "76px", minHeight: 140 } as React.CSSProperties}>
      <AppTopbar search={<NavbarSearch />} />
    </div>
  ),
  globals: { viewport: { value: "tablet" } },
};

const groups = buildTenantNav("retail", ["dashboard", "crm", "bookings", "memberships"]);

/**
 * Cambio de barra como en una navegación (dentro de `startTransition`): logo, negocio, tema y cuenta viajan a su nuevo lugar; el módulo,
 * sus pestañas y los avisos aparecen. Con movimiento reducido el cambio es inmediato.
 */
function BarSwitch() {
  const [inModule, setInModule] = useState(false);
  // La barra es de Inicio cuando la ruta actual es la raíz del negocio: se cambia la raíz para pasar de una barra a la otra.
  const hrefFor = (href: string) => `${inModule ? "/otro" : "/demo"}${href}`;
  return (
    <AppShellProvider value={{ brandName: "Simpleapp", brandSub: "simpleapp", groups, activeKey: "/contactos", title: "Clientes", hrefFor, quickActions: [], openSearch: () => {} }}>
      <AppTopbar
        notifications={
          <button type="button" aria-label="Notificaciones" className="grid place-items-center rounded-md text-muted-foreground hover:bg-surface-muted">
            <Bell aria-hidden="true" />
          </button>
        }
      />
      <div className="min-h-dvh bg-background pt-24 text-center">
        <button type="button" onClick={() => startTransition(() => setInModule((v) => !v))} className="rounded-md border border-border px-4 py-2 text-sm">
          {inModule ? "Volver al inicio" : "Entrar a Clientes"}
        </button>
      </div>
    </AppShellProvider>
  );
}

export const CambioDeBarra: Story = {
  parameters: { nextjs: { navigation: { pathname: "/demo" } } },
  render: () => <BarSwitch />,
};

const inventoryGroups = buildTenantNav("retail", ["dashboard", "inventory"], "ADMIN");

/**
 * La barra de una app con sus menús desplegables al final, como en Odoo: **Informes** y **Configuración**. Las entradas con pantalla son
 * enlaces; las que aún no existen se ven apagadas con «Pronto» (nunca un enlace roto). Solo quien gerencia el negocio ve los menús.
 */
export const MenusDeLaApp: Story = {
  parameters: { nextjs: { navigation: { pathname: "/demo/inventario/existencias" } } },
  render: () => (
    <AppShellProvider value={{ brandName: "Simpleapp", brandSub: "simpleapp", groups: inventoryGroups, activeKey: "/inventario/productos", title: "Catálogo", hrefFor: (href) => `/demo${href}`, quickActions: [], openSearch: () => {} }}>
      <AppTopbar />
    </AppShellProvider>
  ),
  play: async ({ canvasElement }) => {
    const bar = within(canvasElement);
    await userEvent.click(await bar.findByRole("button", { name: "Configuración" }));
    const menu = await within(document.body).findByRole("menu");
    await expect(within(menu).getByRole("menuitem", { name: /Ubicaciones y bodegas/ })).toBeVisible();
    await expect(within(menu).getByRole("menuitem", { name: /Categorías/ })).toHaveAttribute("aria-disabled", "true");
  },
};
