import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DonutChart } from "./donut-chart";
import { GaugeChart } from "./gauge-chart";
import { SeriesChart } from "./series-chart";

const money = (n: number) => `$ ${Math.round(n).toLocaleString("es-CO")}`;
const days = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
const fulls = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const meta = {
  title: "Widgets/Gráficas",
  parameters: {
    docs: { description: { component: "Gráficas propias en SVG, sin librerías: se revelan al aparecer, se recorren con el puntero y respetan movimiento reducido. Cada una lleva `ariaLabel` que resume el dato, porque el dibujo solo no lo cuenta. Rellenan el alto y ancho de su contenedor: dale una altura." } },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const box = (height: number, children: React.ReactNode) => <div style={{ height, maxWidth: 560 }}>{children}</div>;

/** Ingresos y gastos en líneas: la guía y los puntos siguen el cursor. */
export const Lineas: Story = {
  render: () =>
    box(
      300,
      <SeriesChart
        labels={days}
        fulls={fulls}
        format={money}
        ariaLabel="Ingresos y gastos de la semana"
        series={[
          { name: "Ingresos", tone: "gold", values: [640000, 520000, 460000, 710000, 880000, 300000, 1000000] },
          { name: "Gastos", tone: "soft", values: [200000, 180000, 240000, 150000, 310000, 120000, 90000] },
        ]}
      />,
    ),
};

/** Una sola serie rellena, para el balance acumulado. */
export const Area: Story = {
  render: () =>
    box(
      300,
      <SeriesChart labels={days} fulls={fulls} area format={money} ariaLabel="Balance acumulado de la semana" series={[{ name: "Balance", tone: "ink", values: [440000, 780000, 1000000, 1560000, 2130000, 2310000, 3220000] }]} />,
    ),
};

/** Con valores negativos el eje baja del cero. */
export const ConNegativos: Story = {
  render: () =>
    box(300, <SeriesChart labels={days} fulls={fulls} format={money} ariaLabel="Balance diario" series={[{ name: "Balance", tone: "ink", values: [300000, -120000, 80000, -250000, 400000, 90000, -60000] }]} />),
};

/** Reparto de los ingresos del mes por medio de pago. */
export const Dona: Story = {
  render: () =>
    box(
      260,
      <DonutChart
        ariaLabel="Ingresos del mes por medio de pago"
        parts={[
          { label: "Efectivo", total: 2400000 },
          { label: "Transferencia", total: 1700000 },
          { label: "Tarjeta", total: 760000 },
        ]}
      />,
    ),
};

/** Qué parte de los ingresos queda después de los gastos. */
export const Medidor: Story = { render: () => box(200, <GaugeChart value={64} of={100} ariaLabel="El 64 % de los ingresos queda como balance" />) };

/** Medidor vacío: sin ingresos no hay proporción (0 %), no un error. */
export const MedidorSinIngresos: Story = { render: () => box(200, <GaugeChart value={0} of={0} ariaLabel="Sin ingresos en el periodo" />) };
