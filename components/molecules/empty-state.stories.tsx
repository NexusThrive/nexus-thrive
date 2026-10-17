import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Plus } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { EmptyState } from "./empty-state";

const meta = {
  title: "Moléculas/EmptyState",
  component: EmptyState,
  args: {
    title: "Todavía no hay obras",
    description: "Crea la primera obra para empezar su presupuesto y su cotización.",
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAction: Story = {
  args: {
    action: (
      <Button variant="outline">
        <Plus aria-hidden="true" /> Nueva obra
      </Button>
    ),
  },
};

export const TitleOnly: Story = { args: { description: undefined, title: "Sin resultados" } };
