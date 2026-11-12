import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AuthMountFallback } from "./auth-mount-fallback";

const meta = {
  title: "Moléculas/Avisos y estados/AuthMountFallback",
  id: "moléculas-authmountfallback",
  component: AuthMountFallback,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div style={{ width: 440, padding: 32, borderRadius: 28, background: "var(--card)", border: "1px solid var(--border)" }}>
        <Story />
      </div>
    ),
  ],
  args: { children: null },
} satisfies Meta<typeof AuthMountFallback>;
export default meta;
type Story = StoryObj<typeof meta>;

/** El formulario de Clerk todavía no está: solo la forma del formulario, sin texto de «Cargando…». */
export const Cargando: Story = {};
