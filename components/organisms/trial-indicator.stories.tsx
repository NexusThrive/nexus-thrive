import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TrialIndicator } from "./trial-indicator";

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

const meta = {
  title: "Organismos/TrialIndicator",
  component: TrialIndicator,
  parameters: { layout: "centered" },
  args: { planName: "Signature", planHref: "#plan", daysLeft: 12, endsAt: inDays(12), level: "ok" },
} satisfies Meta<typeof TrialIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Con margen: discreto, sin invitaciones a pagar. */
export const ConMargen: Story = {};

/** Faltan 3 días o menos: se resalta para avisar a tiempo. */
export const Pronto: Story = { args: { daysLeft: 3, endsAt: inDays(3), level: "soon" } };

/** El último día (singular). */
export const UltimoDia: Story = { args: { daysLeft: 1, endsAt: inDays(1), level: "soon" } };
