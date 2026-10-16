import { useEffect } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { usePalette } from "@/components/providers/shell-context";
import { withShell } from "../../.storybook/decorators";
import { CommandPalette } from "./command-palette";

function OpenPalette() {
  const { setOpen } = usePalette();
  useEffect(() => setOpen(true), [setOpen]);
  return <CommandPalette />;
}

const meta = {
  title: "Organismos/CommandPalette",
  component: CommandPalette,
  decorators: [withShell],
  parameters: {
    layout: "fullscreen",
    docs: {
      story: { inline: false, iframeHeight: 560 },
      description: { component: "Ctrl/⌘ K desde cualquier pantalla: secciones, acciones de crear y cambio de tema." },
    },
  },
} satisfies Meta<typeof CommandPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = { render: () => <div className="h-[560px]"><OpenPalette /></div> };
