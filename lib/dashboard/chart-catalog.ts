import type { ModuleValue } from "@/lib/admin/catalogs";
import type { Span } from "./layout";

/**
 * Catálogo de gráficos que se pueden agregar al inicio («Agregar»). Lógica pura
 * (sin React): el panel y el tablero lo leen, y el servidor decide cuáles ofrecer
 * según los módulos activos del negocio.
 */
export const CHART_TYPES = ["bars", "line", "area", "donut", "gauge", "customers"] as const;
export type ChartType = (typeof CHART_TYPES)[number];

export const isChartType = (value: unknown): value is ChartType => CHART_TYPES.includes(value as ChartType);

export type ChartEntry = {
  type: ChartType;
  label: string;
  description: string;
  /** Columnas (de 12) con las que nace. */
  span: Span;
  /** Alto con el que nace, en filas de `ROW_PX`. */
  rows: number;
  /** Módulo que debe estar activo para ofrecerlo. */
  needs: ModuleValue;
};

/** Alto de una fila de la cuadrícula de gráficos (px). */
export const ROW_PX = 40;
export const MIN_ROWS = 5;
export const MAX_ROWS = 14;

export const CHART_CATALOG: readonly ChartEntry[] = [
  { type: "bars", label: "Ingresos y gastos · barras", description: "Compara lo que entra y lo que sale en cada día u hora.", span: 6, rows: 8, needs: "finance" },
  { type: "line", label: "Ingresos y gastos · líneas", description: "Dos líneas para ver la tendencia del periodo.", span: 6, rows: 8, needs: "finance" },
  { type: "area", label: "Balance acumulado · área", description: "Cómo crece o cae tu balance a lo largo del periodo.", span: 6, rows: 8, needs: "finance" },
  { type: "donut", label: "Ingresos por método de pago", description: "Reparto del mes entre efectivo, transferencia, tarjeta…", span: 4, rows: 8, needs: "finance" },
  { type: "gauge", label: "Medidor del balance", description: "Qué parte de los ingresos del periodo te queda después de gastos.", span: 4, rows: 6, needs: "finance" },
  { type: "customers", label: "Tendencia de clientes", description: "Cómo crece tu cartera de clientes activos.", span: 4, rows: 6, needs: "crm" },
];

/** Lo que todavía no existe: se muestra desactivado en el panel («Pronto»). */
export const COMING_SOON = [
  { label: "Lista de tareas", description: "Pendientes del equipo con fecha y responsable, junto al sistema de productividad." },
] as const;

export const entryOf = (type: ChartType): ChartEntry => CHART_CATALOG.find((e) => e.type === type)!;

/** Datos serializables que reciben los gráficos agregados (los arma la página en el servidor). */
export type ChartData = {
  /** Serie del periodo: por hora o por día. */
  points: { label: string; full: string; income: number; expenses: number }[];
  /** Ingresos del mes por método de pago. */
  methods: { label: string; total: number }[];
  /** Clientes activos por punto del periodo. */
  customers: number[];
  income: number;
  expenses: number;
  balance: number;
};
