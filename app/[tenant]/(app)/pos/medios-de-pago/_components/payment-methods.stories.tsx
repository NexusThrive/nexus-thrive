import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { ToastProvider } from "@/components/molecules/toast";
import PaymentMethodsView from "./payment-methods-view";

const meta = {
  title: "Páginas/Dinero/Medios de pago",
  component: PaymentMethodsView,
  decorators: [(Story) => <ToastProvider><div className="p-5"><Story /></div></ToastProvider>],
  parameters: { layout: "fullscreen", docs: { description: { component: "Medios de pago que el negocio ofrece al cobrar: efectivo (entra a la caja del turno) o transferencia/billetera (Nequi, Daviplata, cuenta del banco), con su nombre, instrucciones y orden." } } },
  args: {
    slug: "demo",
    methods: [
      { id: "m1", kind: "CASH", name: "Efectivo", instructions: null, active: true, position: 0 },
      { id: "m2", kind: "TRANSFER", name: "Nequi", instructions: "Cel. 300 123 4567 · a nombre de Gimnasio Norte", active: true, position: 1 },
      { id: "m3", kind: "TRANSFER", name: "Bancolombia", instructions: "Ahorros 123-456789-00", active: false, position: 2 },
    ],
  },
} satisfies Meta<typeof PaymentMethodsView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ConMedios: Story = {};

/** Sin configurar, el negocio ofrece Efectivo y Transferencia. */
export const Basicos: Story = {
  args: { methods: [{ id: "default-cash", kind: "CASH", name: "Efectivo", instructions: null, active: true, position: 0 }, { id: "default-transfer", kind: "TRANSFER", name: "Transferencia", instructions: null, active: true, position: 1 }] },
};

export const NuevoMedioRepetido: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: /Nuevo medio/ }));
    const d = within(await within(document.body).findByRole("dialog"));
    await userEvent.type(d.getByRole("textbox", { name: /Nombre/ }), "Efectivo");
    await userEvent.click(d.getByRole("button", { name: "Crear medio" }));
    await expect(await d.findByText(/Ya tienes un medio llamado/)).toBeVisible();
  },
};
