"use client";

import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/components/atoms/button";
import { CHART_CATALOG, type ChartType } from "@/lib/experience/dashboard/chart-catalog";
import { AddWidgetPanel, type BlockOption } from "./add-widget-panel";

const meta = {
  title: "Organismos/AddWidgetPanel",
  component: AddWidgetPanel,
  parameters: {
    docs: { description: { component: "Panel lateral «Elementos del inicio»: todo lo que se puede poner en el inicio, en un solo lugar. **Bloques** son los del sistema (cifras, accesos, actividad): los ocultos se agregan con un toque. **Gráficos** son el catálogo con vista previa. Lo que ya está puesto sale atenuado y no se puede elegir (se quita desde su tarjeta); lo que aún no existe va marcado «Pronto». Se compone con `ResponsiveSheet`." } },
  },
} satisfies Meta<typeof AddWidgetPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const BLOQUES: BlockOption[] = [
  { id: "cifras", label: "Cifras clave", hidden: false },
  { id: "accesos", label: "Accesos rápidos", hidden: true },
  { id: "actividad", label: "Actividad reciente", hidden: true },
  { id: "agenda", label: "Agenda de hoy", hidden: false },
];

function Demo({ blocks, present }: { blocks: BlockOption[]; present: ChartType[] }) {
  const [open, setOpen] = useState(true);
  const [added, setAdded] = useState<ChartType[]>(present);
  const [shown, setShown] = useState(blocks);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Elementos del inicio
      </Button>
      <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
        En tu inicio: {added.length} gráficos y {shown.filter((b) => !b.hidden).length} bloques.
      </p>
      <AddWidgetPanel
        open={open}
        onOpenChange={setOpen}
        entries={CHART_CATALOG}
        blocks={shown}
        presentCharts={new Set(added)}
        onAdd={(type) => setAdded((prev) => [...prev, type])}
        onShowBlock={(id) => setShown((prev) => prev.map((b) => (b.id === id ? { ...b, hidden: false } : b)))}
      />
    </>
  );
}

const unused = { open: true, onOpenChange: () => undefined, entries: CHART_CATALOG, blocks: BLOQUES, presentCharts: new Set<ChartType>(), onAdd: () => undefined, onShowBlock: () => undefined };

/** Con algo ya puesto: lo agregado sale atenuado y se actualiza al elegir. */
export const Default: Story = { args: unused, render: () => <Demo blocks={BLOQUES} present={["bars"]} /> };

/** Inicio vacío: todo está disponible para agregar. */
export const InicioVacio: Story = {
  args: unused,
  render: () => <Demo blocks={BLOQUES.map((b) => ({ ...b, hidden: true }))} present={[]} />,
};

/** Todo puesto: no queda nada por agregar y el panel lo deja ver. */
export const TodoPuesto: Story = {
  args: unused,
  render: () => <Demo blocks={BLOQUES.map((b) => ({ ...b, hidden: false }))} present={CHART_CATALOG.map((c) => c.type)} />,
};
