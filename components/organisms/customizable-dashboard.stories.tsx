import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { KpiCard } from "@/components/molecules/kpi-card";
import { PageHeader } from "@/components/molecules/page-header";
import { Wallet, Users, TrendingUp } from "lucide-react";
import { CHART_CATALOG } from "@/lib/dashboard/chart-catalog";
import { CustomizableDashboard, DashboardMenu, type DashboardWidget } from "./customizable-dashboard";

const widgets: DashboardWidget[] = [
  {
    id: "kpi-income",
    label: "Ingresos",
    span: 3,
    half: true,
    node: <KpiCard className="h-full" index={0} label="Ingresos" value={4850000} format="cop" icon={TrendingUp} trend={[3, 5, 4, 7, 6, 9, 8]} hint="Cobros del periodo" />,
  },
  {
    id: "kpi-customers",
    label: "Socios activos",
    span: 3,
    half: true,
    node: <KpiCard className="h-full" index={1} label="Socios activos" value={128} icon={Users} trend={[100, 104, 110, 118, 128]} hint="en tu cartera" />,
  },
  {
    id: "kpi-expenses",
    label: "Gastos",
    span: 3,
    half: true,
    node: <KpiCard className="h-full" index={2} label="Gastos" value={1730000} format="cop" icon={Wallet} trend={[2, 3, 2, 4, 3, 4]} hint="caja menor y fijos" />,
  },
  {
    id: "kpi-balance",
    label: "Balance",
    span: 3,
    half: true,
    node: <KpiCard className="h-full" index={3} label="Balance" value={3120000} format="cop" icon={Wallet} trend={[1, 2, 2, 3, 3, 4]} hint="ingresos menos gastos" />,
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
    header: <PageHeader eyebrow="Viernes, 23 de octubre" title="Buenas tardes, Camila" description="Así va tu negocio esta semana." actions={<DashboardMenu />} />,
  },
  parameters: {
    docs: {
      description: {
        component:
          "Inicio personalizable. Sin botón de «Personalizar»: mantener presionado un bloque entra al modo de edición y lo toma; el menú de tres puntos del encabezado (`DashboardMenu`, junto al selector de periodo) ofrece «Agregar gráfico» y «Editar diseño» (la alternativa sin arrastrar). En edición (barra de edición, bloques con borde discontinuo y esquinas): cada bloque se arrastra (también con teclado o botones ↑ ↓), cambia de ancho arrastrando una esquina (continuo, al píxel; el selector ofrece ¼, ⅓, ½, ⅔ y todo; desde lg) y se muestra u oculta. «Agregar» abre un panel lateral con gráficos nuevos (barras, líneas, área, dona, medidor, clientes) que también cambian de alto por las esquinas y se pueden quitar. Se ve en vivo y solo se guarda con «Guardar»; «Cancelar» descarta y «Restablecer» vuelve al diseño por defecto. La preferencia está versionada y hoy se guarda por persona en este navegador (`localStorage`). Los bloques se resuelven en el servidor: mover u ocultar no cambia datos ni permisos.",
      },
    },
  },
} satisfies Meta<typeof CustomizableDashboard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const sample = {
  points: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((label, i) => ({
    label,
    full: `${label} ${14 + i} de oct.`,
    income: [420000, 380000, 510000, 460000, 640000, 720000, 300000][i]!,
    expenses: [210000, 260000, 180000, 330000, 250000, 290000, 150000][i]!,
  })),
  methods: [
    { label: "Efectivo", total: 1450000 },
    { label: "Transferencia", total: 2100000 },
    { label: "Tarjeta", total: 980000 },
    { label: "Nequi", total: 320000 },
  ],
  customers: [100, 104, 110, 118, 121, 128, 133],
  income: 3430000,
  expenses: 1670000,
  balance: 1760000,
};

/** Con el botón «Agregar» y el catálogo de gráficos. */
export const ConGraficos: Story = {
  args: {
    charts: { data: sample, entries: CHART_CATALOG, subtitle: "Esta semana" },
  },
};
