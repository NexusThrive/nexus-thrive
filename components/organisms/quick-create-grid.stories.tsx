import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../.storybook/decorators";
import { QuickCreateGrid } from "./quick-create-grid";

const meta = {
  title: "Organismos/QuickCreateGrid",
  component: QuickCreateGrid,
  decorators: [withShell, (Story) => <div className="max-w-sm"><Story /></div>],
  parameters: { docs: { description: { component: "Acciones de crear según los módulos activos; entran una a una con rebote." } } },
} satisfies Meta<typeof QuickCreateGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Construction: Story = {};
