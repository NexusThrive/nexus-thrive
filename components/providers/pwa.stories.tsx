import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { UpdateNotice } from "./pwa";

const meta = {
  title: "Moléculas/UpdateNotice",
  component: UpdateNotice,
  args: { onUpdate: () => {}, onDismiss: () => {} },
  parameters: {
    layout: "fullscreen",
    docs: {
      story: { inline: false, iframeHeight: 220 },
      description: { component: "Aviso persistente de versión nueva (PWA). No se aplica sola: recargar a mitad de un formulario perdería lo escrito. «Luego» lo oculta hasta la próxima visita." },
    },
  },
} satisfies Meta<typeof UpdateNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: (args) => <div className="h-52"><UpdateNotice {...args} /></div> };
