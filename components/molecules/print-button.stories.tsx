import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PrintButton } from "./print-button";

const meta = { title: "Moléculas/PrintButton", component: PrintButton } satisfies Meta<typeof PrintButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const CustomLabel: Story = { args: { label: "Imprimir recibo" } };
