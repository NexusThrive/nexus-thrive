import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Switch } from "@/components/atoms/switch";
import { SettingsRow } from "./settings-row";

const meta = {
  title: "Moléculas/SettingsRow",
  component: SettingsRow,
  args: {
    title: "Actividad en vivo",
    description: "Nuevos cobros aparecen en Inicio",
    htmlFor: "live",
    control: <Switch id="live" defaultChecked />,
  },
  argTypes: { control: { control: false } },
  decorators: [(Story) => <div className="max-w-md overflow-hidden rounded-lg border border-border bg-card"><Story /></div>],
} satisfies Meta<typeof SettingsRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
