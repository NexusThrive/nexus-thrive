import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TenantAccessDenied } from "./tenant-access-denied";

const meta = {
  title: "Moléculas/TenantAccessDenied",
  component: TenantAccessDenied,
  parameters: { layout: "fullscreen" },
  args: { tenantName: "Northline Market", email: "santiagocastellar2203@gmail.com", name: "Santiago Castellar Garcia" },
} satisfies Meta<typeof TenantAccessDenied>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ConCuenta: Story = {};
export const SinCorreo: Story = { args: { email: null, name: null } };
