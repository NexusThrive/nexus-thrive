import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Info } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

const meta = {
  title: "Moléculas/Tooltip",
  component: Tooltip,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Tooltip {...args}>
      <TooltipTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Qué es el AIU">
          <Info />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Administración, imprevistos y utilidad sobre el costo directo.</TooltipContent>
    </Tooltip>
  ),
};

/** Abierto para revisar el diseño sin pasar el cursor. */
export const Open: Story = { ...Default, args: { defaultOpen: true } };
