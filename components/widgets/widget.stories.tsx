import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Banknote, FilePlus2, UserPlus } from "lucide-react";
import { DeltaPill, HatchBars, LineArea, QuickTile, Widget, WidgetHead, WidgetValue, widgetRow } from "./widget";

const money = (n: number) => `$ ${n.toLocaleString("es-CO")}`;
const days = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

const meta = {
  title: "Widgets/Widget",
  component: Widget,
  parameters: {
    layout: "padded",
    docs: { description: { component: "La tarjeta de los tableros: esquinas suaves, borde casi invisible, botón circular con flecha, cifra grande y píldora de variación. Tipos: cifra, barras con fondo rayado, línea sobre oro, fichas de acceso y filas interiores. Una sola tarjeta de oro por tablero." } },
  },
} satisfies Meta<typeof Widget>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Todos los tipos juntos, como el catálogo de referencia. */
export const Catalogo: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", alignItems: "start" }}>
      <Widget aria-labelledby="w-cifra">
        <WidgetHead id="w-cifra" title="Ventas del mes" subtitle="Ventas totales de este mes" href="#" actionLabel="Ir a ventas" />
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <WidgetValue>{money(48600000)}</WidgetValue>
          <DeltaPill value={12} />
        </div>
        <p className="text-xs text-muted-foreground">frente al mes anterior</p>
      </Widget>

      <Widget aria-labelledby="w-barras">
        <WidgetHead id="w-barras" title="Ventas de la semana" subtitle="Parte del mejor día" href="#" actionLabel="Ver ventas" />
        <WidgetValue>{money(1120000)}</WidgetValue>
        <HatchBars values={[640, 520, 460, 710, 880, 300, 1000]} labels={days} format={money} ariaLabel="Ingresos de los últimos 7 días" />
      </Widget>

      <Widget variant="accent" aria-labelledby="w-linea">
        <WidgetHead id="w-linea" title="Balance" subtitle="Últimos 30 días" href="#" actionLabel="Ver finanzas" onAccent />
        <WidgetValue>{money(27000)}</WidgetValue>
        <LineArea values={[2, 4, 3, 6, 5, 7, 4, 8, 6, 9, 7, 10, 8, 12, 9]} labels={["12 oct", "11 nov"]} format={(n) => `$ ${n} k`} ariaLabel="Ingresos por día" />
      </Widget>

      <Widget aria-labelledby="w-acc">
        <WidgetHead id="w-acc" title="Accesos rápidos" subtitle="Lo que haces cada día" />
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          <QuickTile icon={UserPlus} label="Cliente" href="#" />
          <QuickTile icon={Banknote} label="Cobro" href="#" />
          <QuickTile icon={FilePlus2} label="Cotización" href="#" />
        </div>
      </Widget>

      <Widget aria-labelledby="w-filas">
        <WidgetHead id="w-filas" title="Para hoy" />
        <div className={widgetRow}>
          <p className="text-ui font-semibold">3 facturas vencidas</p>
          <p className="text-xs text-muted-foreground">$ 7,2 M por cobrar</p>
        </div>
        <div className={widgetRow}>
          <p className="text-ui font-semibold">2 membresías por vencer</p>
          <p className="text-xs text-muted-foreground">En los próximos 3 días</p>
        </div>
      </Widget>
    </div>
  ),
};

export const Oro: Story = {
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <Widget variant="accent" aria-labelledby="w-oro">
        <WidgetHead id="w-oro" title="Balance" subtitle="Últimos 30 días" href="#" actionLabel="Ver finanzas" onAccent />
        <WidgetValue>{money(27000)}</WidgetValue>
      </Widget>
    </div>
  ),
};
