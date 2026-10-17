import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Textarea } from "./textarea";

const meta = {
  title: "Átomos/Textarea",
  component: Textarea,
  args: { placeholder: "Observaciones de la visita…" },
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
/** Crece con el contenido (`field-sizing: content`). */
export const LongText: Story = {
  args: {
    defaultValue:
      "Se fundió la placa del segundo piso.\nPendiente: retiro de formaleta el jueves.\nClima: lluvia en la tarde.",
  },
};
export const Invalid: Story = { args: { "aria-invalid": true } };
export const Disabled: Story = { args: { disabled: true } };
