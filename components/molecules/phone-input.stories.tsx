import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PhoneInput } from "./phone-input";

function Demo() {
  const [value, setValue] = useState("");
  return <div className="max-w-xs"><PhoneInput value={value} onChange={setValue} /></div>;
}

const meta = {
  title: "Moléculas/PhoneInput",
  component: PhoneInput,
  args: { value: "", onChange: () => {} },
} satisfies Meta<typeof PhoneInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: () => <Demo /> };
export const Disabled: Story = { args: { value: "3001234567", disabled: true } };
