import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Skeleton } from "./skeleton";

const meta = {
  title: "Átomos/Skeleton",
  component: Skeleton,
  args: { className: "h-4 w-48" },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Line: Story = {};

/** Esqueleto de una tarjeta KPI mientras carga el dashboard. */
export const KpiCard: Story = {
  render: () => (
    <div className="w-64 space-y-3 rounded-lg border border-border bg-card p-5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-3 w-40" />
    </div>
  ),
};
