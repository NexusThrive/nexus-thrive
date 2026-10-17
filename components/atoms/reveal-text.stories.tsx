import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { RevealText } from "./reveal-text";

const meta = {
  title: "Átomos/RevealText",
  component: RevealText,
  args: {
    as: "h1",
    parts: ["Buenas tardes, ", { text: "Juan", gold: true }],
    className: "font-display text-[34px] font-bold tracking-[-0.02em]",
  },
  argTypes: { parts: { control: "object" }, as: { control: false } },
} satisfies Meta<typeof RevealText>;

export default meta;
type Story = StoryObj<typeof meta>;

/** El saludo del inicio: el nombre en oro. Recarga la historia para repetirla. */
export const Greeting: Story = {};
export const Plain: Story = { args: { parts: ["Tu negocio te espera donde lo dejaste."] } };
