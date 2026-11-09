import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CustomerAvatar } from "./customer-avatar";

const meta = {
  title: "Átomos/CustomerAvatar",
  component: CustomerAvatar,
} satisfies Meta<typeof CustomerAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Sin foto: la cara se deriva del nombre. */
export const SinFoto: Story = {
  args: { identity: { name: "María Pérez" }, className: "size-14 rounded-md" },
};

/** Con foto: la imagen cargada tiene prioridad. */
export const ConFoto: Story = {
  args: { identity: { name: "María Pérez" }, photoUrl: "/icons/apple-touch-icon.png", className: "size-14 rounded-md" },
};

/** Misma identidad, misma cara; identidades distintas, caras distintas. */
export const Deterministas: Story = {
  args: { identity: { name: "María Pérez" } },
  render: () => (
    <div className="flex items-end gap-3">
      {["María Pérez", "Laura Gómez", "Sofía Díaz", "María Pérez"].map((name, i) => (
        <CustomerAvatar key={i} identity={{ name }} className="size-14 rounded-md" />
      ))}
    </div>
  ),
};
