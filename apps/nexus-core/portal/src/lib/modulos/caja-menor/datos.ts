/**
 * MÓDULO CAJA MENOR — datos del módulo (rama core/base).
 * Igual que gym: recibe la org activa del usuario (lib/org.ts) y verifica
 * la habilitación en el layout del módulo. Cero mocks: todo sale de la base.
 * El saldo se DERIVA (suma de movimientos no anulados) — nunca se guarda.
 */
import { prisma } from "@/lib/core/prisma";
import type { MonthlyFlow, CategoryExpense } from "@/lib/shared/tipos";
import { rangoFechas, buckets, inRange, type RangoKey } from "@/lib/shared/rango";

/** ¿La org tiene el módulo Caja Menor ACTIVO? (lo usa el layout del módulo). */
export async function cajamenorHabilitado(orgId: string) {
  const mod = await prisma.module.findUnique({ where: { slug: "caja-menor" } });
  if (!mod) return false;
  const om = await prisma.organizationModule.findUnique({
    where: { orgId_moduleId: { orgId, moduleId: mod.id } },
  });
  return om?.estado === "ACTIVO";
}

/** Saldo actual: INGRESOS − EGRESOS de movimientos NO anulados (todas las fechas). */
export async function saldoCaja(orgId: string): Promise<number> {
  const movs = await prisma.movimientoCaja.findMany({
    where: { orgId, anulado: false },
    select: { tipo: true, monto: true },
  });
  let saldo = 0;
  for (const m of movs) saldo += m.tipo === "INGRESO" ? Number(m.monto) : -Number(m.monto);
  return saldo;
}

export interface CajaDashboard {
  orgId: string;
  orgNombre: string;
  rango: RangoKey;
  saldo: number;
  ingresos: number;
  egresos: number;
  movimientos: number;
  flujo: MonthlyFlow[];
  egresosPorCategoria: CategoryExpense[];
  recientes: {
    id: string;
    tipo: "INGRESO" | "EGRESO";
    monto: number;
    categoria: string | null;
    descripcion: string | null;
    fecha: Date;
  }[];
}

/** Datos del dashboard de caja menor — TODO real. */
export async function getCajaDashboard(rango: RangoKey, orgId: string, orgNombre: string): Promise<CajaDashboard> {
  const { desde, hasta } = rangoFechas(rango);

  const movimientos = await prisma.movimientoCaja.findMany({
    where: { orgId, anulado: false },
    include: { categoria: true },
    orderBy: { fecha: "desc" },
  });

  let saldo = 0;
  for (const m of movimientos) saldo += m.tipo === "INGRESO" ? Number(m.monto) : -Number(m.monto);

  const enRango = movimientos.filter((m) => m.fecha >= desde && m.fecha <= hasta);
  let ingresos = 0;
  let egresos = 0;
  for (const m of enRango) {
    if (m.tipo === "INGRESO") ingresos += Number(m.monto);
    else egresos += Number(m.monto);
  }

  const flujo: MonthlyFlow[] = buckets(rango, desde, hasta).map((b) => {
    let income = 0;
    let expenses = 0;
    for (const m of enRango) {
      if (!inRange(m.fecha, b)) continue;
      if (m.tipo === "INGRESO") income += Number(m.monto);
      else expenses += Number(m.monto);
    }
    return { month: b.label, income, expenses };
  });

  const byCat = new Map<string, number>();
  for (const m of enRango) {
    if (m.tipo !== "EGRESO") continue;
    const nombre = m.categoria?.nombre ?? "Sin categoría";
    byCat.set(nombre, (byCat.get(nombre) ?? 0) + Number(m.monto));
  }
  const egresosPorCategoria: CategoryExpense[] = [...byCat.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  return {
    orgId,
    orgNombre,
    rango,
    saldo,
    ingresos,
    egresos,
    movimientos: enRango.length,
    flujo,
    egresosPorCategoria,
    recientes: movimientos.slice(0, 6).map((m) => ({
      id: m.id,
      tipo: m.tipo,
      monto: Number(m.monto),
      categoria: m.categoria?.nombre ?? null,
      descripcion: m.descripcion,
      fecha: m.fecha,
    })),
  };
}

/** Movimientos con filtros opcionales (tipo, categoría), últimos primero. */
export async function getMovimientosCaja(
  orgId: string,
  opts: { tipo?: "INGRESO" | "EGRESO"; categoriaId?: string; limite?: number } = {},
) {
  return prisma.movimientoCaja.findMany({
    where: {
      orgId,
      anulado: false,
      tipo: opts.tipo,
      categoriaId: opts.categoriaId || undefined,
    },
    include: { categoria: true },
    orderBy: { fecha: "desc" },
    take: opts.limite ?? 100,
  });
}

/** Categorías activas de la org, ordenadas por nombre. */
export async function getCategoriasCaja(orgId: string, soloActivas = true) {
  return prisma.cajaCategoria.findMany({
    where: { orgId, ...(soloActivas ? { activo: true } : {}) },
    orderBy: { nombre: "asc" },
  });
}