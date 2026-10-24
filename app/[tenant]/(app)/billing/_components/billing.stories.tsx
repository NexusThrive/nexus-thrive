import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import BillingList from "./billing-list";

const rows = [
  { id: "b1", kind: "BILL" as const, number: 12, customerName: "Gimnasio Atlas", issueDate: "2026-10-01", dueDate: "2026-10-31", status: "ISSUED" as const, total: 1_404_200 },
  { id: "n1", kind: "CREDIT_NOTE" as const, number: 3, customerName: "Gimnasio Atlas", issueDate: "2026-10-10", dueDate: null, status: "ISSUED" as const, total: 119_000 },
  { id: "n2", kind: "DEBIT_NOTE" as const, number: 1, customerName: "Gimnasio Atlas", issueDate: "2026-10-12", dueDate: null, status: "ISSUED" as const, total: 50_000 },
];

const meta = {
  title: "Páginas/Finanzas/Facturación y notas",
  component: BillingList,
  decorators: [withShell],
  parameters: { layout: "fullscreen", docs: { description: { component: "Dos tipos de modal: el AVANZADO es pantalla completa con estilo de factura (facturas y notas crédito/débito se ven así, con emisor, adquirente, impuestos, retenciones, saldo y documentos relacionados); el PEQUEÑO es el de las acciones rápidas (cobrar, anular, emitir una nota) que se abre encima sin perder el documento." } } },
  args: { slug: "demo", rows, customers: [], products: [], today: "2026-10-24", canCreate: true, initialNew: false, initialDoc: null, canManage: true },
} satisfies Meta<typeof BillingList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Lista: Story = {};
export const FacturaEnPantallaCompleta: Story = { args: { initialDoc: "b1" } };
export const NotaCredito: Story = { args: { initialDoc: "n1" } };
export const NotaDebito: Story = { args: { initialDoc: "n2" } };
