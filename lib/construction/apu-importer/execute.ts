/**
 * Ejecución transaccional del plan de importación (SERVER ONLY).
 *
 * `executeImport` recibe un `ExecutionPlan` ya validado y escribe en
 * PostgreSQL dentro de UNA transacción:
 * - Insumos: upsert por (tenantId + code) o por nombre normalizado.
 * - Actividades: upsert por code o nombre; composición reemplazada por
 *   completo (idempotente) y líneas fusionadas por insumo (suma de consumo).
 * - Si falla cualquier operación, el ROLLBACK deshace todo.
 *
 * No importa de aquí nada en un Client Component (depende de @/prisma/db).
 */
import { db } from "@/prisma/db";
import type { ApuItemCategoryValue } from "@/lib/construction/apu-engine";
import { inferCategory } from "./category-classifier";
import type { ExecutionPlan } from "./index";
import type { ImportResult, PriceChange } from "./types";

type ItemRow = {
  id: string;
  code: string | null;
  name: string;
  unit: string;
  unitPrice: unknown;
  category: string;
};

type ActivityRow = { id: string; code: string | null; name: string };

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function itemByNameKey(item: ItemRow): string {
  return normalizeKey(item.name);
}

export async function executeImport(
  tenantId: string,
  plan: ExecutionPlan,
  updatePrices: boolean = false,
): Promise<ImportResult> {
  const result: ImportResult = {
    createdItems: 0,
    updatedItems: 0,
    createdActivities: 0,
    updatedActivities: 0,
    createdCompositions: 0,
    omittedRows: plan.skippedRows,
    warnings: plan.warnings.length,
    errors: [],
    totalProcessed: plan.items.length + plan.activities.length,
    priceChanges: [],
  };

  const [existingItems, existingActivities] = await Promise.all([
    db.orm.public.ApuItem.where({ tenantId })
      .select("id", "code", "name", "unit", "unitPrice", "category")
      .all() as unknown as Promise<ItemRow[]>,
    db.orm.public.ApuActivity.where({ tenantId })
      .select("id", "code", "name")
      .all() as unknown as Promise<ActivityRow[]>,
  ]);

  const itemsByCode = new Map<string, ItemRow>();
  const itemsByName = new Map<string, ItemRow>();
  for (const item of existingItems) {
    if (item.code) itemsByCode.set(item.code.trim().toUpperCase(), item);
    const nameKey = itemByNameKey(item);
    if (nameKey && !itemsByName.has(nameKey)) itemsByName.set(nameKey, item);
  }
  const activitiesByCode = new Map<string, ActivityRow>();
  const activitiesByName = new Map<string, ActivityRow>();
  for (const activity of existingActivities) {
    if (activity.code) activitiesByCode.set(activity.code.trim().toUpperCase(), activity);
    const nameKey = normalizeKey(activity.name);
    if (nameKey) activitiesByName.set(nameKey, activity);
  }

  // Código secuencial para insumos creados sin código propio ("IN-0002157"…).
  let nextItemCodeNumber = existingItems.reduce((max, item) => {
    const match = /^IN-0*(\d+)$/.exec((item.code ?? "").trim());
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  const nextItemCode = (): string => {
    nextItemCodeNumber += 1;
    return `IN-${String(nextItemCodeNumber).padStart(7, "0")}`;
  };

  await db.transaction(async (tx) => {
    /* ----- 1. Insumos (upsert) ----- */
    for (const item of plan.items) {
      const codeKey = item.code ? item.code.trim().toUpperCase() : null;
      const nameKey = normalizeKey(item.name);
      const existing = codeKey
        ? itemsByCode.get(codeKey)
        : itemsByName.get(nameKey);

      if (existing) {
        const currentPrice = String(existing.unitPrice);
        const newPrice = item.unitPrice;
        let priceChanged = false;
        let variationPct = 0;
        if (currentPrice !== newPrice) {
          priceChanged = true;
          const curr = Number(currentPrice);
          const nw = Number(newPrice);
          if (curr !== 0) {
            variationPct = ((nw - curr) / curr) * 100;
          }
          result.priceChanges.push({
            itemId: existing.id,
            code: existing.code,
            name: existing.name,
            currentPrice,
            newPrice,
            variationPct,
          });
        }
        await tx.orm.public.ApuItem.where({
          id: existing.id,
          tenantId,
        }).update({
          code: item.code?.trim() || existing.code,
          name: item.name,
          unit: item.unit,
          category: item.category ?? "MATERIAL",
          ...(updatePrices ? { unitPrice: item.unitPrice } : {}),
        });
        result.updatedItems += 1;
      } else {
        await tx.orm.public.ApuItem.create({
          tenantId,
          code: item.code?.trim() || nextItemCode(),
          name: item.name,
          unit: item.unit,
          category: item.category ?? "MATERIAL",
          unitPrice: item.unitPrice,
        });
        result.createdItems += 1;
      }
    }

    /* ----- 2. Actividades + composiciones ----- */
    for (const activity of plan.activities) {
      const codeKey = activity.code ? activity.code.trim().toUpperCase() : null;
      const nameKey = normalizeKey(activity.name);
      const existing = codeKey
        ? activitiesByCode.get(codeKey)
        : activitiesByName.get(nameKey);

      // Composiciones: insumo por nombre normalizado, creándolo si falta.
      const merged = new Map<
        string,
        { itemId: string; consumption: number }
      >();
      for (const line of activity.lines) {
        if (line.skipReason) {
          result.warnings += 1;
          continue;
        }
        const lineNameKey = normalizeKey(line.itemName);
        const lineCategory: ApuItemCategoryValue =
          line.category ?? inferCategory(line.itemName);

        let itemId = itemsByName.get(lineNameKey)?.id;
        if (!itemId) {
          const createdCode = nextItemCode();
          const created = await tx.orm.public.ApuItem.create({
            tenantId,
            code: createdCode,
            name: line.itemName,
            unit: line.unit || "UND",
            category: lineCategory,
            unitPrice: line.unitPrice,
          });
          itemsByName.set(lineNameKey, {
            id: created.id,
            code: createdCode,
            name: line.itemName,
            unit: line.unit || "UND",
            unitPrice: line.unitPrice,
            category: lineCategory,
          });
          itemId = created.id;
          result.createdItems += 1;
        }

        const current = merged.get(itemId);
        const consumption = Number(line.quantity) || 0;
        merged.set(itemId, {
          itemId,
          consumption: (current?.consumption ?? 0) + consumption,
        });
      }

      if (existing) {
        await tx.orm.public.ApuActivity.where({
          id: existing.id,
          tenantId,
        }).update({
          code: activity.code?.trim() || existing.code,
          name: activity.name,
          unit: activity.unit,
        });
        await tx.orm.public.ApuActivityComposition.where({
          activityId: existing.id,
        }).deleteAll();
        for (const [, comp] of merged) {
          await tx.orm.public.ApuActivityComposition.create({
            activityId: existing.id,
            itemId: comp.itemId,
            consumption: String(comp.consumption),
            wastePercent: "0",
          });
          result.createdCompositions += 1;
        }
        result.updatedActivities += 1;
      } else {
        const created = await tx.orm.public.ApuActivity.create({
          tenantId,
          code: activity.code?.trim() || null,
          name: activity.name,
          unit: activity.unit,
        });
        for (const [, comp] of merged) {
          await tx.orm.public.ApuActivityComposition.create({
            activityId: created.id,
            itemId: comp.itemId,
            consumption: String(comp.consumption),
            wastePercent: "0",
          });
          result.createdCompositions += 1;
        }
        result.createdActivities += 1;
      }
    }
  });

  return result;
}