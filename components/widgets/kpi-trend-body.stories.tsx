import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { KpiTrendBody } from "./kpi-trend-body";

const meta = {
  title: "Widgets/KpiTrendBody",
  component: KpiTrendBody,
  args: { value: 4860000, format: "cop", compact: false, trend: [12, 18, 15, 24, 21, 30, 27, 36], delay: 0 },
  argTypes: { format: { control: "inline-radio", options: ["number", "cop"] }, children: { control: false }, trendColor: { control: "color" } },
  parameters: {
    docs: { description: { component: "La parte interactiva de `KpiCard`: la cifra se ajusta al ancho de su tarjeta y crece con el hover (`group/kpi`); al recorrer la línea con el puntero, la cifra rueda hasta el valor de ese punto y vuelve al salir. Va aparte para que `KpiCard` siga siendo de servidor. Prueba con el puntero sobre la línea." } },
  },
  decorators: [
    (Story) => (
      <div className="group/kpi flex min-h-40 flex-col rounded-lg border border-border bg-card p-5" style={{ maxWidth: 280 }}>
        <p className="text-ui font-medium text-muted-foreground">Ingresos del mes</p>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof KpiTrendBody>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Cifra en pesos con tendencia. */
export const ConTendencia: Story = {};

/** Sin línea: solo la cifra. */
export const SinTendencia: Story = { args: { trend: undefined } };

/** Una cifra larga se reduce para caber en su tarjeta (no se corta). */
export const CifraLarga: Story = { args: { value: 1248600000 } };

/** Texto en lugar de número: no rueda ni se formatea. */
export const ValorDeTexto: Story = { args: { value: "12 obras", trend: undefined } };

/** Compacta, para tarjetas pequeñas. */
export const Compacta: Story = { args: { compact: true, format: "number", value: 128 } };
