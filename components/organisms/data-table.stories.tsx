import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Badge, StatusDot } from "@/components/atoms/badge";
import { DataTable } from "./data-table";

const rows = [
  { code: "OB-2026-014", name: "Torre Calle 80", client: "Inversiones Sabana", status: "Contratada", total: "$ 1.284.500.000" },
  { code: "OB-2026-015", name: "Bodega Funza", client: "Logística del Norte", status: "En cotización", total: "$ 642.180.000" },
  { code: "OB-2026-016", name: "Casa Chía", client: "Laura Méndez", status: "Borrador", total: "$ 318.900.000" },
];

const meta = {
  title: "Organismos/DataTable",
  component: DataTable,
  args: { minWidth: 720, children: null },
} satisfies Meta<typeof DataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Prueba en móvil: la tabla se desplaza y la primera columna queda fija. */
export const Projects: Story = {
  render: (args) => (
    <div className="rounded-lg border border-border bg-card">
      <DataTable {...args}>
        <thead>
          <tr>
            <th className="px-4 text-left">Obra</th>
            <th className="px-4 text-left">Cliente</th>
            <th className="px-4 text-left">Estado</th>
            <th className="px-4 text-right">Presupuesto</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.code} className="border-t border-border">
              <td className="px-4">
                <span className="block text-sm font-medium">{row.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{row.code}</span>
              </td>
              <td className="px-4 text-sm">{row.client}</td>
              <td className="px-4">
                <Badge><StatusDot tone={row.status === "Contratada" ? "success" : row.status === "Borrador" ? "muted" : "warning"} />{row.status}</Badge>
              </td>
              <td className="px-4 text-right text-sm tabular-nums">{row.total}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  ),
};
