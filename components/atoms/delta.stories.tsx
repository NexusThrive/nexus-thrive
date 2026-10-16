import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Delta } from "./delta";

const meta = { title: "Átomos/Delta", component: Delta, args: { value: 12 } } satisfies Meta<typeof Delta>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Up: Story = {};
export const Down: Story = { args: { value: -8 } };
/** En gastos subir es malo: `inverse` lo pinta de rojo. */
export const InverseUp: Story = { args: { value: 15, inverse: true } };
export const NoPrevious: Story = { args: { value: null } };
