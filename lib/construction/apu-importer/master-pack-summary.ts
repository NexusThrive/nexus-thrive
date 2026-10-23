/**
 * Resumen previo a importar un pack APU: qué se crea, qué ya existe y qué
 * cambia, comparando el plan con el catálogo actual del tenant. Solo lee.
 */
import { db } from "@/prisma/db";
import type { MasterPackParse } from "./master-pack";
import { itemSourceKey, type MasterPackPlan, type PackMismatch } from "./master-pack-plan";

export type MasterPackSummary = {
  fileName: string;
  sheets: {
    chapters: number;
    activities: number;
    auxiliaries: number;
    materials: number;
    lines: number;
    images: number;
  };
  items: { total: number; new: number; existing: number; priceChanges: number; withImage: number };
  activities: { total: number; new: number; existing: number };
  imagesNew: number;
  verification: { checked: number; mismatches: PackMismatch[] };
  /** Líneas creadas a mano en actividades del archivo (se conservan). */
  manualLines: number;
  warnings: string[];
  lastImport: { fileName: string; createdAt: string } | null;
};

function sameDecimal(a: unknown, b: string): boolean {
  const norm = (value: string) => {
    const [i, f = ""] = value.split(".");
    const frac = f.replace(/0+$/, "");
    return `${i.replace(/^0+(?=\d)/, "")}${frac ? `.${frac}` : ""}`;
  };
  return norm(String(a)) === norm(b);
}

export async function summarizeMasterPack(input: {
  tenantId: string;
  fileName: string;
  parse: MasterPackParse;
  plan: MasterPackPlan;
}): Promise<MasterPackSummary> {
  const { tenantId, parse, plan } = input;
  const [items, activities, images, lastRun] = await Promise.all([
    db.orm.public.ApuItem.where({ tenantId }).select("name", "unit", "unitPrice", "sourceKey").all(),
    db.orm.public.ApuActivity.where({ tenantId }).select("id", "code", "name", "unit", "sourceKey").all(),
    db.orm.public.ApuImage.where({ tenantId }).select("sha256").all(),
    db.orm.public.ApuImportRun.where({ tenantId })
      .orderBy((run) => run.createdAt.desc())
      .select("fileName", "createdAt")
      .first(),
  ]);

  const itemByKey = new Map<string, (typeof items)[number]>();
  for (const item of items) {
    const key = item.sourceKey ?? itemSourceKey(item.name, item.unit);
    if (!itemByKey.has(key)) itemByKey.set(key, item);
  }
  let itemsExisting = 0;
  let priceChanges = 0;
  for (const planned of plan.items) {
    const existing = itemByKey.get(planned.sourceKey);
    if (!existing) continue;
    itemsExisting += 1;
    if (!planned.isPercent && !sameDecimal(existing.unitPrice, planned.unitPrice)) priceChanges += 1;
  }

  const activityKeys = new Set<string>();
  const activityIdByKey = new Map<string, string>();
  for (const activity of activities) {
    const keys = [
      activity.sourceKey,
      activity.code ? `APU:${activity.code.trim()}` : null,
      `AUX:${itemSourceKey(activity.name, activity.unit)}`,
    ].filter((key): key is string => Boolean(key));
    for (const key of keys) {
      activityKeys.add(key);
      activityIdByKey.set(key, activity.id);
    }
  }
  const matchedIds = plan.activities
    .map((planned) => activityIdByKey.get(planned.sourceKey))
    .filter((id): id is string => Boolean(id));
  const activitiesExisting = matchedIds.length;

  let manualLines = 0;
  for (let index = 0; index < matchedIds.length; index += 500) {
    const batch = matchedIds.slice(index, index + 500);
    manualLines += (
      await db.orm.public.ApuActivityComposition.where((line) => line.activityId.in(batch))
        .where({ origin: "MANUAL" })
        .select("id")
        .all()
    ).length;
  }

  const knownShas = new Set(images.map((image) => image.sha256));
  const usedShas = new Set(plan.items.map((item) => item.imageSha256).filter((sha): sha is string => Boolean(sha)));

  return {
    fileName: input.fileName,
    sheets: {
      chapters: parse.chapters.length,
      activities: parse.apus.length,
      auxiliaries: parse.auxiliaries.length,
      materials: parse.materials.length,
      lines: plan.lineCount,
      images: usedShas.size,
    },
    items: {
      total: plan.items.length,
      new: plan.items.length - itemsExisting,
      existing: itemsExisting,
      priceChanges,
      withImage: plan.items.filter((item) => item.imageSha256).length,
    },
    activities: {
      total: plan.activities.length,
      new: plan.activities.length - activitiesExisting,
      existing: activitiesExisting,
    },
    imagesNew: [...usedShas].filter((sha) => !knownShas.has(sha)).length,
    verification: { checked: plan.activities.length, mismatches: plan.mismatches.slice(0, 50) },
    manualLines,
    warnings: parse.warnings.slice(0, 50),
    lastImport: lastRun ? { fileName: lastRun.fileName, createdAt: String(lastRun.createdAt) } : null,
  };
}
