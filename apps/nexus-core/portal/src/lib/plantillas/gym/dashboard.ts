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
import { derivarEstadosMembresias } from "@/lib/modulos/clientes/estado";
import type { MonthlyFlow, CategoryExpense } from "@/lib/shared/tipos";
import { rangoFechas, buckets, inRange, type RangoKey } from "@/lib/shared/rango";

// Re-export para compatibilidad (FiltroRango y páginas del módulo Gym).
export { RANGOS, isRango, rangoFechas, buckets } from "@/lib/shared/rango";
export type { RangoKey } from "@/lib/shared/rango";

/**
 * La derivación de estado es de la MEMBRESÍA (módulo Clientes, Eje B), no de
 * esta plantilla. Antes vivía acá y el dashboard hacía `updateMany` sobre la
 * tabla de otro módulo; ahora se llama a su dueño.
 */

/**
 * EL GATE SOLO VIVE EN `lib/core/requiere-modulo.ts`.
 * Hasta el Eje A este archivo exportaba `gymHabilitado()` y el layout de la
 * plantilla lo llamaba. Con `moduloActivoEnOrg("gym")` + `GuardModulo` el
 * acceso se decidió en UN solo lado; la envoltura se borró y el layout llama
 * a `requiereModuloActivo` directo.
 * Si el criterio de "tiene la plantilla" cambia, cambia en ese archivo.
 */

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

/** Días hacia adelante que se consideran "por vencer". */
const MAX_POR_VENCER = 10;

/** Datos del dashboard del gym en el rango pedido — TODO real. */
export async function getGymDashboard(
  rango: RangoKey,
  orgId: string,
  orgNombre: string,
): Promise<GymDashboard> {
  const { desde, hasta } = rangoFechas(rango);
  await derivarEstadosMembresias(orgId);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const en7d = new Date(hoy);
  en7d.setDate(hoy.getDate() + 7);

  // Los totales, los conteos y los agrupamientos se resuelven EN SQL.
  // Antes esta función traía TODAS las filas de pagos, gastos y clientes del
  // negocio y las sumaba en JavaScript: el costo crecía con el tamaño del
  // negocio en cada lectura, para producir cuatro números y dos gráficas.
  const [sumPagos, sumGastos, activos, vencidos, porVencer, pagosFlujo, gastosFlujo, porCategoria, porMetodo] =
    await Promise.all([
      prisma.pago.aggregate({
        where: { orgId, anulado: false, pagadoEl: { gte: desde, lte: hasta } },
        _sum: { monto: true },
      }),
      prisma.gasto.aggregate({
        where: { orgId, anulado: false, fecha: { gte: desde, lte: hasta } },
        _sum: { monto: true },
      }),
      prisma.membresia.count({ where: { orgId, estado: "ACTIVO" } }),
      prisma.membresia.count({ where: { orgId, estado: "VENCIDO" } }),
      prisma.membresia.findMany({
        where: { orgId, estado: "ACTIVO", periodoFin: { gte: hoy, lte: en7d } },
        select: { periodoFin: true, cliente: { select: { id: true, nombre: true } } },
        orderBy: { periodoFin: "asc" },
        take: MAX_POR_VENCER,
      }),
      // `flujo` sí necesita filas: los buckets son ventanas calendario
      // irregulares (7 días, 5 semanas, 12 meses), no `date_trunc`, así que no
      // se pueden agrupar en SQL sin N predicados. Pero solo se piden las dos
      // columnas que la gráfica usa, no la fila completa.
      prisma.pago.findMany({
        where: { orgId, anulado: false, pagadoEl: { gte: desde, lte: hasta } },
        select: { monto: true, pagadoEl: true },
      }),
      prisma.gasto.findMany({
        where: { orgId, anulado: false, fecha: { gte: desde, lte: hasta } },
        select: { monto: true, fecha: true },
      }),
      prisma.gasto.groupBy({
        by: ["categoria"],
        where: { orgId, anulado: false, fecha: { gte: desde, lte: hasta } },
        _sum: { monto: true },
      }),
      prisma.pago.groupBy({
        by: ["metodo"],
        where: { orgId, anulado: false, pagadoEl: { gte: desde, lte: hasta } },
        _sum: { monto: true },
      }),
    ]);

  const ingresos = Number(sumPagos._sum.monto ?? 0);
  const gastosTotal = Number(sumGastos._sum.monto ?? 0);

  const flujo: MonthlyFlow[] = buckets(rango, desde, hasta).map((b) => {
    let income = 0;
    let expenses = 0;
    for (const p of pagosFlujo) if (inRange(p.pagadoEl, b)) income += Number(p.monto);
    for (const g of gastosFlujo) if (inRange(g.fecha, b)) expenses += Number(g.monto);
    return { month: b.label, income, expenses };
  });

  const egresosPorCategoria: CategoryExpense[] = porCategoria
    .map((g) => ({ category: g.categoria.toLowerCase(), amount: Number(g._sum.monto ?? 0) }))
    .sort((a, b) => b.amount - a.amount);

  const pagosPorMetodo: CategoryExpense[] = porMetodo
    .map((p) => ({ category: p.metodo.toLowerCase(), amount: Number(p._sum.monto ?? 0) }))
    .sort((a, b) => b.amount - a.amount);

  return {
    orgId,
    orgNombre,
    rango,
    ingresos,
    gastos: gastosTotal,
    balance: ingresos - gastosTotal,
    sociosActivos: activos,
    sociosVencidos: vencidos,
    porVencer: porVencer.map((m) => ({ id: m.cliente.id, nombre: m.cliente.nombre, vence: m.periodoFin! })),
    flujo,
    egresosPorCategoria,
    pagosPorMetodo,
  };
}
