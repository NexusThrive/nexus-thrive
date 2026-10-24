import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { KpiCard } from "@/components/molecules/kpi-card";
import { PageHeader } from "@/components/molecules/page-header";
import { Wallet, Users, TrendingUp } from "lucide-react";
import { CustomizableDashboard, type DashboardWidget } from "./customizable-dashboard";

const widgets: DashboardWidget[] = [
  {
    id: "kpis",
    label: "Métricas",
    node: (
      <section aria-label="Métricas del negocio" className="grid grid-cols-2 gap-3.5 lg:grid-cols-3">
        <KpiCard index={0} label="Ingresos" value={4850000} format="cop" icon={TrendingUp} trend={[3, 5, 4, 7, 6, 9, 8]} hint="Cobros del periodo" />
        <KpiCard index={1} label="Socios activos" value={128} icon={Users} trend={[100, 104, 110, 118, 128]} hint="en tu cartera" />
        <KpiCard index={2} label="Balance" value={3120000} format="cop" icon={Wallet} trend={[1, 2, 2, 3, 3, 4]} hint="ingresos menos gastos" />
      </section>
    ),
  },
  {
    id: "chart",
    label: "Ingresos y gastos",
    span: 8,
    node: <div className="rounded-lg border border-border bg-surface p-5 text-sm text-muted-foreground">Gráfico de ingresos y gastos (muestra)</div>,
  },
  {
    id: "activity",
    label: "Actividad reciente",
    span: 4,
    node: <div className="rounded-lg border border-border bg-surface p-5 text-sm text-muted-foreground">Últimos movimientos (muestra)</div>,
  },
];

const meta = {
  title: "Organismos/CustomizableDashboard",
  component: CustomizableDashboard,
  args: {
    scope: "storybook",
    widgets,
    header: <PageHeader eyebrow="Viernes, 23 de octubre" title="Buenas tardes, Camila" description="Así va tu negocio esta semana." />,
  },
  parameters: {
    docs: {
      description: {
        component:
          "Inicio personalizable de 12 columnas. «Personalizar» entra al modo de edición (barra de edición, bloques con borde discontinuo): cada bloque se arrastra (asa, teclado o botones ↑ ↓), cambia de ancho (¼, ⅓, ½, ⅔, todo; desde lg) y se muestra u oculta. Se ve en vivo y solo se guarda con «Guardar»; «Cancelar» descarta y «Restablecer» vuelve al diseño por defecto. La preferencia está versionada y hoy se guarda por persona en este navegador (`localStorage`). Los bloques se resuelven en el servidor: mover u ocultar no cambia datos ni permisos.",
      },
    },
  },
} satisfies Meta<typeof CustomizableDashboard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
