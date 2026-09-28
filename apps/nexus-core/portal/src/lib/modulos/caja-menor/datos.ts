/**
 * MÓDULO CAJA MENOR — datos del módulo (rama core/base).
 * Igual que gym: recibe la org activa del usuario (lib/org.ts) y el acceso lo
 * cuida `components/core/GuardModulo.tsx`. Cero mocks: todo sale de la base.
 * El saldo se DERIVA (suma de movimientos no anulados) — nunca se guarda.
 */
import type { Prisma, TipoMovimientoCaja } from "@prisma/client";
import { prisma } from "@/lib/core/prisma";
import type { MonthlyFlow, CategoryExpense } from "@/lib/shared/tipos";
import { rangoFechas, buckets, inRange, type RangoKey } from "@/lib/shared/rango";

/**
 * Saldo actual: INGRESOS − EGRESOS de movimientos NO anulados (todas las fechas).
 *
 * Se resuelve con `groupBy` en SQL. Antes traía TODOS los movimientos del
 * negocio fila por fila para sumarlos en JavaScript, y esto corre en el CAMINO
 * DE ESCRITURA: cada egreso lo llama para comprobar que no deja el saldo en
 * negativo. El costo crecía con el tamaño del negocio, y justo cuando más
 * filas hay.
 */
export async function saldoCaja(orgId: string): Promise<number> {
  const porTipo = await prisma.movimientoCaja.groupBy({
    by: ["tipo"],
    where: { orgId, anulado: false },
    _sum: { monto: true },
  });
  let saldo = 0;
  for (const t of porTipo) {
    const monto = Number(t._sum.monto ?? 0);
    saldo += t.tipo === "INGRESO" ? monto : -monto;
  }
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
export async function getCajaDashboard(
  rango: RangoKey,
  orgId: string,
  orgNombre: string,
): Promise<CajaDashboard> {
  const { desde, hasta } = rangoFechas(rango);

  // Igual que el dashboard de Gym: los totales y el saldo salen de SQL. Antes
  // se traían todos los movimientos de todas las fechas para sumarlos en JS.
  const [porTipo, movimientosRango, recientes, porCategoria] = await Promise.all([
    prisma.movimientoCaja.groupBy({
      by: ["tipo"],
      where: { orgId, anulado: false },
      _sum: { monto: true },
    }),
    prisma.movimientoCaja.findMany({
      where: { orgId, anulado: false, fecha: { gte: desde, lte: hasta } },
      select: { tipo: true, monto: true, fecha: true, categoriaId: true },
    }),
    prisma.movimientoCaja.findMany({
      where: { orgId, anulado: false },
      include: { categoria: true },
      orderBy: { fecha: "desc" },
      take: 6,
    }),
    prisma.movimientoCaja.groupBy({
      by: ["tipo"],
      where: { orgId, anulado: false, fecha: { gte: desde, lte: hasta } },
      _sum: { monto: true },
    }),
  ]);

  const totalDe = (
    filas: { tipo: TipoMovimientoCaja; _sum: { monto: Prisma.Decimal | null } }[],
    tipo: TipoMovimientoCaja,
  ) => Number(filas.find((f) => f.tipo === tipo)?._sum.monto ?? 0);

  const saldo = totalDe(porTipo, "INGRESO") - totalDe(porTipo, "EGRESO");
  const ingresos = totalDe(porCategoria, "INGRESO");
  const egresos = totalDe(porCategoria, "EGRESO");

  const flujo: MonthlyFlow[] = buckets(rango, desde, hasta).map((b) => {
    let income = 0;
    let expenses = 0;
    for (const m of movimientosRango) {
      if (!inRange(m.fecha, b)) continue;
      if (m.tipo === "INGRESO") income += Number(m.monto);
      else expenses += Number(m.monto);
    }
    return { month: b.label, income, expenses };
  });

  // Los egresos por categoría necesitan el NOMBRE de la categoría, que es una
  // relación y no se puede agrupar por `groupBy`; se resuelve con la lista del
  // rango, acotada a los egresos.
  const egresosRango = movimientosRango.filter((m) => m.tipo === "EGRESO");
  const catIds = [...new Set(egresosRango.map((m) => m.categoriaId).filter((id): id is string => Boolean(id)))];
  const cats = catIds.length
    ? await prisma.cajaCategoria.findMany({ where: { orgId, id: { in: catIds } }, select: { id: true, nombre: true } })
    : [];
  const nombreCat = new Map(cats.map((c) => [c.id, c.nombre]));

  const byCat = new Map<string, number>();
  for (const m of egresosRango) {
    const catId = m.categoriaId;
    const nombre = (catId && nombreCat.get(catId)) || "Sin categoría";
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
    movimientos: movimientosRango.length,
    flujo,
    egresosPorCategoria,
    recientes: recientes.map((m) => ({
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