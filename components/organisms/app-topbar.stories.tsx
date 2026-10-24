import type { Meta, StoryObj } from "@storybook/nextjs-vite";
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
