import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { quickCreateActions } from "@/lib/experience/navigation/quick-create";
import QuickActions from "./quick-actions";

const meta = {
  title: "Organismos/Inicio/QuickActions",
  id: "organismos-quickactions",
  component: QuickActions,
  args: { tenantSlug: "gym-norte", actions: quickCreateActions("gym", ["crm", "finance", "bookings"]) },
  argTypes: { actions: { control: false } },
  decorators: [(Story) => <div className="max-w-sm"><Story /></div>],
} satisfies Meta<typeof QuickActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Gym: Story = {};
export const Construction: Story = {
  args: { tenantSlug: "constructora", actions: quickCreateActions("construction", ["construction", "crm", "finance"]) },
};
export const NoModules: Story = { args: { actions: [] } };
