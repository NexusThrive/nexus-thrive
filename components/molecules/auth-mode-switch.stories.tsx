import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AuthModeSwitch } from "./auth-mode-switch";

const meta = {
  title: "Moléculas/AuthModeSwitch",
  component: AuthModeSwitch,
  args: { mode: "sign-in" },
  argTypes: { mode: { control: "inline-radio", options: ["sign-in", "sign-up"] } },
  decorators: [(Story) => <div className="max-w-[440px]"><Story /></div>],
} satisfies Meta<typeof AuthModeSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SignIn: Story = {};
export const SignUp: Story = { args: { mode: "sign-up" } };
