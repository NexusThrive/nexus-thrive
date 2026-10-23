import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Input } from "@/components/atoms/input";
import { Textarea } from "@/components/atoms/textarea";
import { ContextHelp } from "./context-help";
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

/** El error se suma a la descripción (que sigue visible) y marca el control con `aria-invalid`. */
export const WithError: Story = {
  args: { label: "Nombre completo", required: true, hint: "Como aparece en su documento.", error: "Escribe el nombre del cliente.", children: (p) => <Input {...p} /> },
};

/** Ayuda contextual "?": un extra; lo imprescindible va en la descripción. */
export const WithHelp: Story = {
  args: {
    label: "Correo electrónico",
    hint: "Le llegan los recibos y la invitación a su carné.",
    help: (
      <ContextHelp topic="el correo electrónico">
        Solo se usa para enviar recibos y avisos del negocio. No se comparte ni se usa para publicidad.
      </ContextHelp>
    ),
    children: (p) => <Input {...p} type="email" autoComplete="email" />,
  },
};

export const Optional: Story = {
  args: { label: "Empresa", optional: true, hint: undefined, children: (p) => <Input {...p} autoComplete="organization" /> },
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
