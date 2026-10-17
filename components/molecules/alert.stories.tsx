import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Alert } from "./alert";

const meta = {
  title: "Moléculas/Alert",
  component: Alert,
  args: { tone: "danger", title: "Contraseña incorrecta", children: "Inténtalo de nuevo o restablécela." },
  argTypes: { tone: { control: "inline-radio", options: ["danger", "success", "warning", "info"] } },
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Danger: Story = {};
export const Success: Story = { args: { tone: "success", title: "Cotización emitida", children: "La versión 2 reemplaza a la anterior." } };
export const Warning: Story = { args: { tone: "warning", title: "El presupuesto cambió", children: "Vuelve a emitir la cotización antes de aprobarla." } };
export const MessageOnly: Story = { args: { title: undefined, children: "No se pudo guardar la partida." } };
