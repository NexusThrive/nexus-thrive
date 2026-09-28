/**
 * PLANTILLA GYM — datos del dashboard del gimnasio (rama core/base).
 * El módulo ya no busca "la org del gym": recibe la org activa del usuario
 * (lib/org.ts) y verifica la habilitación en el layout del módulo.
 * Cero mocks: todo se calcula sobre la base real.
 *
 * HABILITACIÓN (2026-09-22): con la tabla Plantilla real, "gym" es una
 * PLANTILLA (un conjunto de módulos) y no un Module. La org está
 * habilitada si tiene ACTIVO al menos un módulo miembro de la plantilla.
 */
import { prisma } from "@/lib/core/prisma";
import { moduloActivoEnOrg } from "@/lib/core/requiere-modulo";
import type { MonthlyFlow, CategoryExpense } from "@/lib/shared/tipos";
import { rangoFechas, buckets, inRange, type RangoKey } from "@/lib/shared/rango";

// Re-export para compatibilidad (FiltroRango y páginas del módulo Gym).
export { RANGOS, isRango, rangoFechas, buckets } from "@/lib/shared/rango";
export type { RangoKey } from "@/lib/shared/rango";

/**
 * ¿La org tiene la plantilla Gym habilitada? (lo usa el layout del módulo).
 *
 * DELGADO: la decisión vive en `lib/core/requiere-modulo.ts` — es el mismo
 * gate que usan las server actions. Acá solo se adapta al nombre del dominio.
 */
export async function gymHabilitado(orgId: string) {
  return moduloActivoEnOrg("gym", orgId);
}

/**
 * Deriva el estado real de cada cliente: si su membresía ya venció, pasa a
 * VENCIDO; si está al día (porque cobraron), vuelve a ACTIVO.
 * Se llama en cada lectura del dashboard: el estado SIEMPRE refleja los pagos.
 */
export async function derivaEstadosClientes(orgId: string) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  await prisma.cliente.updateMany({
    where: { orgId, estado: "ACTIVO", periodoFin: { not: null, lt: hoy } },
    data: { estado: "VENCIDO" },
  });
  await prisma.cliente.updateMany({
    where: { orgId, estado: "VENCIDO", periodoFin: { gte: hoy } },
    data: { estado: "ACTIVO" },
  });
}

export interface GymDashboard {
  orgId: string;
  orgNombre: string;
  rango: RangoKey;
  ingresos: number;
  gastos: number;
  balance: number;
  sociosActivos: number;
  sociosVencidos: number;
  porVencer: { id: string; nombre: string; vence: Date }[];
  flujo: MonthlyFlow[];
  egresosPorCategoria: CategoryExpense[];
  pagosPorMetodo: CategoryExpense[];
}

/** Datos del dashboard del gym en el rango pedido — TODO real. */
export async function getGymDashboard(rango: RangoKey, orgId: string, orgNombre: string): Promise<GymDashboard> {
  const { desde, hasta } = rangoFechas(rango);
  await derivaEstadosClientes(orgId);

  const [pagos, gastos, clientes] = await Promise.all([
    prisma.pago.findMany({ where: { orgId, anulado: false, pagadoEl: { gte: desde, lte: hasta } } }),
    prisma.gasto.findMany({ where: { orgId, anulado: false, fecha: { gte: desde, lte: hasta } } }),
    prisma.cliente.findMany({ where: { orgId }, select: { id: true, nombre: true, estado: true, periodoFin: true } }),
  ]);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const en7d = new Date(hoy);
  en7d.setDate(hoy.getDate() + 7);

  let ingresos = 0;
  let gastosTotal = 0;
  for (const p of pagos) ingresos += Number(p.monto);
  for (const g of gastos) gastosTotal += Number(g.monto);

  const flujo: MonthlyFlow[] = buckets(rango, desde, hasta).map((b) => {
    let income = 0;
    let expenses = 0;
    for (const p of pagos) if (inRange(p.pagadoEl, b)) income += Number(p.monto);
    for (const g of gastos) if (inRange(g.fecha, b)) expenses += Number(g.monto);
    return { month: b.label, income, expenses };
  });

  const byCat = new Map<string, number>();
  for (const g of gastos) {
    byCat.set(g.categoria, (byCat.get(g.categoria) ?? 0) + Number(g.monto));
  }
  const egresosPorCategoria: CategoryExpense[] = [...byCat.entries()]
    .map(([category, amount]) => ({ category: category.toLowerCase(), amount }))
    .sort((a, b) => b.amount - a.amount);

  const byMetodo = new Map<string, number>();
  for (const p of pagos) {
    byMetodo.set(p.metodo, (byMetodo.get(p.metodo) ?? 0) + Number(p.monto));
  }
  const pagosPorMetodo: CategoryExpense[] = [...byMetodo.entries()]
    .map(([category, amount]) => ({ category: category.toLowerCase(), amount }))
    .sort((a, b) => b.amount - a.amount);

  const sociosActivos = clientes.filter((c) => c.estado === "ACTIVO").length;
  const sociosVencidos = clientes.filter((c) => c.estado === "VENCIDO").length;
  const porVencer = clientes
    .filter((c) => c.estado === "ACTIVO" && c.periodoFin && c.periodoFin >= hoy && c.periodoFin <= en7d)
    .sort((a, b) => (a.periodoFin! > b.periodoFin! ? 1 : -1))
    .map((c) => ({ id: c.id, nombre: c.nombre, vence: c.periodoFin! }));

  return {
    orgId,
    orgNombre,
    rango,
    ingresos,
    gastos: gastosTotal,
    balance: ingresos - gastosTotal,
    sociosActivos,
    sociosVencidos,
    porVencer,
    flujo,
    egresosPorCategoria,
    pagosPorMetodo,
  };
}