import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ManagedAccessNotice } from "./managed-access-notice";

const meta = {
  title: "Moléculas/Avisos y estados/ManagedAccessNotice",
  component: ManagedAccessNotice,
  parameters: { layout: "fullscreen" },
  args: { reason: "preparing" },
  argTypes: { reason: { control: "select", options: ["preparing", "suspended", "unauthorized"] } },
} satisfies Meta<typeof ManagedAccessNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Preparing: Story = { name: "En preparación" };
export const Suspended: Story = { name: "Acceso suspendido", args: { reason: "suspended" } };
export const Unauthorized: Story = { name: "Sin autorización", args: { reason: "unauthorized" } };
