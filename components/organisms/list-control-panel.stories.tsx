import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../.storybook/decorators";
import { buttonVariants } from "@/components/atoms/button-variants";
import { SearchField } from "@/components/molecules/search-field";
import { ListControlPanel } from "./list-control-panel";

type View = "lista" | "tablero";

function Demo({ initial = "lista", withFilters = true }: { initial?: View; withFilters?: boolean }) {
  const [view, setView] = useState<View>(initial);
  const [q, setQ] = useState("");
  return (
    <div className="grid gap-4">
      <ListControlPanel<View>
        crumbs={[{ label: "Inicio", href: "/demo" }, { label: "Clientes", href: "/demo/contactos" }]}
        actions={<button type="button" className={buttonVariants({ size: "sm" })}>Nuevo cliente</button>}
        search={<SearchField value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, teléfono o correo" aria-label="Buscar clientes" />}
        filters={withFilters ? <span className="text-sm text-muted-foreground">Etiqueta: todas · Ciudad: todas</span> : undefined}
        views={{ ariaLabel: "Vista", value: view, onChange: setView, options: [{ value: "lista", label: "Lista" }, { value: "tablero", label: "Tablero" }] }}
        pager={<span className="text-sm text-muted-foreground">1–25 de 120</span>}
      />
      <p className="text-sm text-muted-foreground">Vista activa: {view}</p>
    </div>
  );
}

const meta = {
  title: "Organismos/Datos/Panel de control de lista",
  id: "organismos-panel-de-control-de-lista",
  component: ListControlPanel,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Panel de control de una lista: migas por registro, acciones, búsqueda, filtros, selector de vistas y paginador. Base de Odoo, con diseño de Nexus. Cada pantalla lo llena con sus controles." } } },
  render: () => <Demo />,
} satisfies Meta<typeof ListControlPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Lista: Story = {};
export const SinFiltros: Story = { render: () => <Demo withFilters={false} /> };
export const TableroActivo: Story = { render: () => <Demo initial="tablero" /> };
