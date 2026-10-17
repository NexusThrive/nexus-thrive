import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PageSkeleton } from "./page-skeleton";

const meta = {
  title: "Organismos/PageSkeleton",
  component: PageSkeleton,
  args: { variant: "table" },
  argTypes: { variant: { control: "inline-radio", options: ["dashboard", "table", "detail", "form"] } },
  parameters: { docs: { description: { component: "Precarga con la forma de cada pantalla mientras el servidor responde (loading.tsx de cada módulo)." } } },
} satisfies Meta<typeof PageSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Table: Story = {};
export const Dashboard: Story = { args: { variant: "dashboard" } };
export const Detail: Story = { args: { variant: "detail" } };
export const Form: Story = { args: { variant: "form" } };
