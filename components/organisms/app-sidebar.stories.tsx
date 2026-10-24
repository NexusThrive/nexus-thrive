import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../.storybook/decorators";
import { AppShellProvider } from "@/components/providers/shell-context";
import { opsNavFor } from "@/lib/ops/nav";
import { AppSidebar } from "./app-sidebar";

const meta = {
  title: "Organismos/AppSidebar",
  component: AppSidebar,
  decorators: [withShell],
  parameters: {
    layout: "fullscreen",
    nextjs: { navigation: { pathname: "/constructora/projects" } },
    docs: {
      story: { inline: false, iframeHeight: 640 },
      description: {
        component:
          "Riel de 76 px en tablet o contraída; 248 px desde 1200 px. En riel, al pasar el mouse (o enfocar con teclado) se despliega por encima del contenido, sin moverlo, para elegir; al elegir o salir vuelve a riel. El fondo del activo se desliza con el corte oro. Arranca debajo de la navbar y no lleva logo ni negocio (eso vive en la navbar). Oculta en móvil.",
      },
    },
  },
} satisfies Meta<typeof AppSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** `--sw` (ancho de la barra) lo define la plantilla; aquí se fija a mano. */
const sized = (width: string) => ({ "--sw": width }) as React.CSSProperties;

export const Desktop: Story = { render: () => <div className="h-[640px]" style={sized("248px")}><AppSidebar /></div> };
/** Riel: pasa el mouse por la barra para verla desplegarse por encima. */
export const Tablet: Story = {
  render: () => <div className="h-[640px]" style={sized("76px")}><AppSidebar /></div>,
  globals: { viewport: { value: "tablet" } },
};

/** Panel CEO (Operations Center) con todos los permisos: grupos por responsabilidad. */
export const OperationsCenter: Story = {
  render: () => {
    const groups = opsNavFor(["accounts.view", "tickets.view", "leads.view", "presence.view", "billing.view", "catalog.edit", "team.invite", "audit.view"]);
    return (
      <AppShellProvider
        value={{
          brandName: "Operations Center",
          brandSub: "dirección",
          groups,
          activeKey: "inicio",
          title: "Inicio",
          hrefFor: (href) => href,
          quickActions: [],
          openSearch: () => {},
        }}
      >
        <div className="h-[720px]" style={sized("248px")}>
          <AppSidebar />
        </div>
      </AppShellProvider>
    );
  },
};
