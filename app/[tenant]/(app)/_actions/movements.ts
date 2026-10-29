"use server";

import { bogotaRange } from "@/lib/finance/series";
import type { MovementRow } from "@/lib/tenant/db";
import { requireTenantContext } from "@/lib/tenant/context";

export type MovementsResult = { ok: true; rows: MovementRow[]; truncated: boolean } | { ok: false; message: string };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const LIMIT = 40;
const MAX_SPAN_DAYS = 370;

/**
 * Movimientos (pagos aprobados y gastos) de un rango de días de Bogotá, para la
 * hoja que abre al hacer clic en una barra de la gráfica. Verifica sesión,
 * pertenencia y que Finanzas esté activa (`requireTenantContext` con la ruta);
 * siempre filtra por `tenantId` y el límite lo pone el servidor.
 */
export async function loadMovementsAction(tenantSlug: string, from: string, to: string): Promise<MovementsResult> {
  if (!DAY.test(from) || !DAY.test(to) || from > to) return { ok: false, message: "El rango no es válido." };
  const span = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
  if (span > MAX_SPAN_DAYS) return { ok: false, message: "El rango es demasiado largo." };
  const ctx = await requireTenantContext(tenantSlug, "/finance");
  if (!ctx) return { ok: false, message: "No tienes acceso a Finanzas." };
  try {
    const rows = await ctx.tenantDb.finance.getMovements(LIMIT + 1, bogotaRange(from, to));
    return { ok: true, rows: rows.slice(0, LIMIT), truncated: rows.length > LIMIT };
  } catch {
    return { ok: false, message: "No pudimos cargar los movimientos." };
  }
}
