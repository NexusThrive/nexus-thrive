import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QrCode } from "./qr-code";

const meta = {
  title: "Átomos/QrCode",
  component: QrCode,
  args: { value: "https://nexusthrive.com/c/demo", label: "Carnet de Camila Ruiz" },
} satisfies Meta<typeof QrCode>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Large: Story = { args: { size: 240 } };
