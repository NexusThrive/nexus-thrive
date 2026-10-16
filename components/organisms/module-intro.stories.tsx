import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ModuleIntro } from "./module-intro";

const meta = {
  title: "Organismos/ModuleIntro",
  component: ModuleIntro,
  args: {
    moduleKey: `storybook-${Date.now()}`,
    children: (
      <div className="space-y-2">
        <h1 className="font-display text-xl font-semibold">Obras</h1>
        <p className="text-sm text-muted-foreground">El contenido del módulo aparece tras la intro.</p>
      </div>
    ),
  },
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Entrada a un módulo: la N se traza, se rellena y se abre como ventana hacia el contenido. Corre una vez por sesión y por `moduleKey` (≤ 4 s). `ModuleEntry` la dispara según la ruta. Recarga la historia para repetirla.",
      },
    },
  },
  decorators: [(Story) => <div className="h-[420px] p-6"><Story /></div>],
} satisfies Meta<typeof ModuleIntro>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
