import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MoreHorizontal } from "lucide-react";
import { Badge, StatusDot } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { EmptyState } from "@/components/molecules/empty-state";
import { AdaptiveTable, type AdaptiveColumn } from "./adaptive-table";

type Sale = { id: string; customer: string; ref: string; method: string; status: "Pagada" | "Pendiente" | "Anulada"; total: string; date: string };

const rows: Sale[] = [
  { id: "1", customer: "Camila Torres", ref: "V-2026-0412", method: "Transferencia", status: "Pagada", total: "$ 120.000", date: "12 de octubre de 2026" },
  { id: "2", customer: "Inversiones Sabana S. A. S.", ref: "V-2026-0413", method: "Tarjeta", status: "Pendiente", total: "$ 1.284.500.000", date: "13 de octubre de 2026" },
  { id: "3", customer: "Logística del Norte y Compañía Limitada", ref: "V-2026-0414", method: "Efectivo", status: "Anulada", total: "$ 642.180", date: "14 de octubre de 2026" },
];

const tone = { Pagada: "success", Pendiente: "warning", Anulada: "muted" } as const;

const columns: AdaptiveColumn<Sale>[] = [
  { key: "customer", header: "Cliente", role: "primary", cell: (r) => r.customer, className: "min-w-48" },
  { key: "ref", header: "Referencia", role: "secondary", cell: (r) => <span className="font-mono">{r.ref}</span> },
  { key: "method", header: "Medio de pago", role: "detail", cell: (r) => r.method },
  { key: "date", header: "Fecha", role: "detail", cell: (r) => r.date },
  { key: "status", header: "Estado", role: "status", cell: (r) => <Badge><StatusDot tone={tone[r.status]} />{r.status}</Badge> },
  { key: "total", header: "Total", role: "figure", cell: (r) => r.total },
  {
    key: "actions",
    header: "Acciones",
    role: "action",
    cell: (r) => (
      <Button size="icon" variant="ghost" aria-label={`Acciones de la venta ${r.ref}`}>
        <MoreHorizontal aria-hidden="true" />
      </Button>
    ),
  },
];

const meta = {
  title: "Organismos/AdaptiveTable",
  component: AdaptiveTable<Sale>,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
  args: { caption: "Ventas recientes", columns, rows, getRowId: (r: Sale) => r.id },
} satisfies Meta<typeof AdaptiveTable<Sale>>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Tabla en un contenedor ancho; lista en uno angosto. Cambia el ancho de la ventana para verlo. */
export const Default: Story = {};

/** La fila entera lleva al detalle. */
export const ConEnlace: Story = {
  args: { getRowHref: (r: Sale) => `#venta-${r.id}`, rowLabel: (r: Sale) => `Abrir venta ${r.ref} de ${r.customer}` },
};

/** Nombres largos e importes grandes: no se recortan ni desbordan en 320 px. */
export const ContenidoExigente: Story = {};

/** Sin filas: el estado vacío ocupa el lugar de la tabla. */
export const Vacio: Story = {
  args: {
    rows: [],
    empty: <EmptyState title="Aún no tienes ventas" description="Registra la primera venta para ver aquí su estado y su cobro." />,
  },
};

/** Una columna angosta de escritorio también pasa a lista (el cambio es por el ancho del contenedor). */
export const EnColumnaAngosta: Story = {
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
};
