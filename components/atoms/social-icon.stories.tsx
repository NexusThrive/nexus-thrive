import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SocialIcon, type SocialName } from "./social-icon";

const meta = {
  title: "Átomos/SocialIcon",
  component: SocialIcon,
  args: { name: "instagram", className: "size-6" },
} satisfies Meta<typeof SocialIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const All: Story = {
  render: () => (
    <div className="flex gap-4">
      {(["instagram", "whatsapp", "google"] as SocialName[]).map((name) => (
        <SocialIcon key={name} name={name} aria-label={name} className="size-6" />
      ))}
    </div>
  ),
};
