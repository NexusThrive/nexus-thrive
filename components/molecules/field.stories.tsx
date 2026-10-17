import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Input } from "@/components/atoms/input";
import { Textarea } from "@/components/atoms/textarea";
import { Field } from "./field";

const meta = {
  title: "Moléculas/Field",
  component: Field,
  args: { label: "Celular", hint: "10 dígitos, sin indicativo.", children: (p) => <Input {...p} placeholder="300 123 4567" /> },
  argTypes: { children: { control: false } },
  decorators: [(Story) => <div className="max-w-sm"><Story /></div>],
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithHint: Story = {};

/** El error reemplaza la ayuda y marca el control con `aria-invalid`. */
export const WithError: Story = {
  args: { label: "Nombre completo", required: true, hint: undefined, error: "Escribe el nombre del cliente.", children: (p) => <Input {...p} /> },
};

export const WithAction: Story = {
  args: {
    label: "Contraseña",
    hint: undefined,
    action: <button type="button" className="text-[12.5px] font-medium text-accent-text hover:underline">¿Olvidaste tu contraseña?</button>,
    children: (p) => <Input {...p} type="password" />,
  },
};

export const Multiline: Story = {
  args: { label: "Nota", hint: undefined, children: (p) => <Textarea {...p} placeholder="Ej. Compra de cuchillas y toallas" /> },
};
