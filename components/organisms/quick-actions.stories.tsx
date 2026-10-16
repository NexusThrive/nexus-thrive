import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getVerticalTerms } from "@/lib/vertical-terms";
import QuickActions from "./quick-actions";

const meta = {
  title: "Organismos/QuickActions",
  component: QuickActions,
  args: { tenantSlug: "gym-norte", terms: getVerticalTerms("gym") },
  argTypes: { terms: { control: false } },
  decorators: [(Story) => <div className="max-w-sm"><Story /></div>],
} satisfies Meta<typeof QuickActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Gym: Story = {};
export const Construction: Story = { args: { tenantSlug: "constructora", terms: getVerticalTerms("construction") } };
