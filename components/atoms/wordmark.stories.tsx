import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Wordmark } from "./wordmark";

const meta = { title: "Átomos/Marca/Wordmark", id: "átomos-wordmark", component: Wordmark, args: { size: 28 } } satisfies Meta<typeof Wordmark>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
