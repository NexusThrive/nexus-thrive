import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AlertTriangle, MinusCircle, TrendingUp, Users, Wallet } from "lucide-react";
import { Delta } from "@/components/atoms/delta";
import { KpiCard } from "./kpi-card";

const meta = {
  title: "Moléculas/KpiCard",
  component: KpiCard,
  args: { label: "Obras activas", value: 12, hint: "3 en ejecución" },
  argTypes: { icon: { control: false } },
} satisfies Meta<typeof KpiCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const narrow = [(Story: React.ComponentType) => <div className="max-w-xs"><Story /></div>];

/** El valor cuenta hasta su cifra al aparecer. */
export const Default: Story = { decorators: narrow };

/** Con variación y tendencia que se dibuja; toda la tarjeta navega. */
export const WithTrend: Story = {
  decorators: narrow,
  args: {
    label: "Ingresos",
    value: 4820000,
    format: "cop",
    icon: TrendingUp,
    delta: <Delta value={12} />,
    hint: "vs. periodo anterior",
    trend: [12, 18, 14, 22, 19, 27, 24, 31, 28, 36, 33, 41, 38, 44],
    href: "#",
  },
};

export const Alert: Story = {
  decorators: narrow,
  args: { label: "Cuotas vencidas", value: 4, hint: "Desde hace más de 30 días", icon: AlertTriangle, alert: true },
};

/** Fila del inicio: entradas escalonadas con `index`. */
export const Row: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      <KpiCard index={0} label="Ingresos" value={4820000} format="cop" icon={TrendingUp} delta={<Delta value={12} />} hint="vs. periodo anterior" trend={[3, 5, 4, 7, 6, 9, 8, 11]} href="#" />
      <KpiCard index={1} label="Clientes activos" value={248} icon={Users} delta={<Delta value={4} />} hint="nuevos" trend={[200, 210, 215, 222, 230, 238, 244, 248]} href="#" />
      <KpiCard index={2} label="Gastos" value={987000} format="cop" icon={MinusCircle} delta={<Delta value={9} inverse />} hint="caja menor y fijos" trend={[4, 6, 5, 9, 7, 11, 8, 12]} trendColor="var(--danger)" href="#" />
      <KpiCard index={3} label="Balance" value={3833000} format="cop" icon={Wallet} delta={<Delta value={13} />} hint="ingresos menos gastos" trend={[2, 3, 3, 5, 5, 7, 7, 9]} trendColor="var(--nx-gold-600)" href="#" />
    </div>
  ),
};

/** Cada cifra responde ¿cuánto hay?, ¿cómo va? y ¿qué puedo hacer?: variación, «?» con el cálculo y una acción. */
export const ConContexto: Story = {
  decorators: narrow,
  args: {
    label: "Ingresos",
    value: 50286088,
    format: "cop",
    icon: TrendingUp,
    delta: <Delta value={12} />,
    hint: "6 cobros registrados · vs. periodo anterior",
    info: "Suma de los pagos aprobados del periodo. La variación compara con el periodo anterior del mismo largo.",
    action: { label: "Ver cobros" },
    trend: [3, 5, 4, 7, 6, 9, 8, 11],
    href: "#",
  },
};

/** Sin periodo previo no se inventa un 0 %: se dice que no hay variación. */
export const SinVariacion: Story = {
  decorators: narrow,
  args: {
    label: "Gastos",
    value: 60000,
    format: "cop",
    icon: MinusCircle,
    hint: "Sin variación disponible · caja menor y fijos",
    info: "Suma de los gastos registrados en el periodo, sin los anulados.",
    action: { label: "Ver gastos" },
  },
};
