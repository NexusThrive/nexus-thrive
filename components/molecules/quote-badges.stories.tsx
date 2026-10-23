import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { APU_ITEM_CATEGORIES, QUOTE_STATUSES } from "@/lib/construction/apu-engine";
import { ApuCategoryBadge, QuoteStatusBadge } from "./quote-badges";

const meta = {
  title: "Moléculas/QuoteBadges",
  component: QuoteStatusBadge,
  args: { status: "APPROVED" },
  argTypes: { status: { control: "select", options: QUOTE_STATUSES.map((s) => s.value) } },
} satisfies Meta<typeof QuoteStatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Status: Story = {};

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {QUOTE_STATUSES.map((s) => (
        <QuoteStatusBadge key={s.value} status={s.value} />
      ))}
    </div>
  ),
};

/** Categoría del insumo APU (material, mano de obra, equipo…). */
export const Categories: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {APU_ITEM_CATEGORIES.map((c) => (
        <ApuCategoryBadge key={c.value} category={c.value} />
      ))}
    </div>
  ),
};
