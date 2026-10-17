import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { UploadProgress } from "./upload-progress";

const meta = {
  title: "Moléculas/UploadProgress",
  component: UploadProgress,
  args: { progress: 0.46, filename: "BASE DE DATOS APU 2026 - MASTER PACK COL.xlsx" },
  argTypes: { progress: { control: { type: "range", min: 0, max: 1, step: 0.01 } } },
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
} satisfies Meta<typeof UploadProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Uploading: Story = {};
export const Done: Story = { args: { progress: 1 } };
