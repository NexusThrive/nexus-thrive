import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { GROUP_ICON_NAMES, GroupIcon, groupIconLabel } from "./group-icon";

const meta = {
  title: "Átomos/Presentación/GroupIcon",
  id: "átomos-groupicon",
  component: GroupIcon,
  args: { name: "star" },
  argTypes: { name: { control: "select", options: [...GROUP_ICON_NAMES, "no-existe"] } },
  parameters: {
    docs: { description: { component: "Icono de un grupo o agrupación por su nombre guardado. Un nombre desconocido cae en «users». Decorativo (`aria-hidden`): el nombre del grupo va siempre en texto al lado. La lista que se ofrece al crear un grupo es `GROUP_ICON_NAMES`." } },
  },
} satisfies Meta<typeof GroupIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { className: "size-6" } };

/** Los diez que se pueden elegir al crear un grupo. */
export const Catalogo: Story = {
  render: () => (
    <ul className="grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-5">
      {GROUP_ICON_NAMES.map((name) => (
        <li key={name} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-ui">
          <GroupIcon name={name} className="size-4 text-accent-text" /> {groupIconLabel(name)}
        </li>
      ))}
    </ul>
  ),
};

/** Un nombre que no se conoce cae en «users». */
export const NombreDesconocido: Story = { args: { name: "no-existe", className: "size-6" } };
