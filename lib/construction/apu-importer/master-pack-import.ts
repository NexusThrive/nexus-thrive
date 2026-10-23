/**
 * Escritura de un pack APU completo en el catálogo del tenant (SERVER ONLY).
 *
 * Todo ocurre en UNA transacción: si algo falla no queda nada a medias.
 * Reglas para que una importación (o reimportación) no pierda datos:
 *
 * - Nunca se borra un insumo, actividad o capítulo que no venga en el archivo.
 * - Las líneas de composición importadas (`origin = IMPORT`) se reemplazan por
 *   las del archivo; las creadas a mano (`MANUAL`) no se tocan. Excepción: la
 *   primera vez que una actividad del importador anterior se adopta, sus líneas
 *   antiguas se sustituyen por las completas (quedan contadas en el registro).
 * - Una foto existente nunca se quita; el archivo solo puede poner o cambiar.
 * - Todo cambio de precio queda en `ApuItemPriceHistory` con su importación.
 * - Cada importación deja un `ApuImportRun` con conteos y verificaciones.
 * - Los presupuestos de obra copian el APU al importarlo, así que reimportar
 *   el catálogo nunca altera un presupuesto existente.
 */
import { db } from "@/prisma/db";
import type { MasterPackParse } from "./master-pack";
import {
  itemSourceKey,
  type MasterPackPlan,
  type PlannedPackActivity,
} from "./master-pack-plan";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type MasterPackImportResult = {
  importRunId: string;
  chapters: { created: number; updated: number };
  items: { created: number; updated: number; unchanged: number; adopted: number };
  activities: { created: number; updated: number; unchanged: number; adopted: number };
  lines: { written: number; replacedImported: number; replacedLegacy: number; manualKept: number };
  images: { stored: number; reused: number; linked: number };
  prices: { changed: number };
  verification: { activities: number; mismatches: number };
};

const CHUNK = 500;

function chunks<T>(list: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < list.length; index += size) out.push(list.slice(index, index + size));
  return out;
}

function same(a: unknown, b: unknown): boolean {
  if (a === null || a === undefined) return b === null || b === undefined;
  if (b === null || b === undefined) return false;
  return String(a) === String(b);
}

/** Igualdad numérica de decimales en texto ("30000" = "30000.00"). */
function sameDecimal(a: unknown, b: unknown): boolean {
  if (a === null || a === undefined || b === null || b === undefined) return same(a, b);
  const norm = (value: unknown) => {
    const [i, f = ""] = String(value).split(".");
    const frac = f.replace(/0+$/, "");
    return `${i.replace(/^0+(?=\d)/, "")}${frac ? `.${frac}` : ""}`;
  };
  return norm(a) === norm(b);
}

function nameKey(name: string, unit: string): string {
  return itemSourceKey(name, unit);
}

export async function executeMasterPackImport(input: {
  tenantId: string;
  parse: MasterPackParse;
  plan: MasterPackPlan;
  fileName: string;
  fileSha256: string;
  importedBy: string | null;
  updatePrices: boolean;
}): Promise<MasterPackImportResult> {
  const { tenantId, parse, plan } = input;
  const now = Temporal.Instant.fromEpochMilliseconds(Date.now());

  return db.transaction(async (tx: Tx) => {
    const result: Omit<MasterPackImportResult, "importRunId"> = {
      chapters: { created: 0, updated: 0 },
      items: { created: 0, updated: 0, unchanged: 0, adopted: 0 },
      activities: { created: 0, updated: 0, unchanged: 0, adopted: 0 },
      lines: { written: 0, replacedImported: 0, replacedLegacy: 0, manualKept: 0 },
      images: { stored: 0, reused: 0, linked: 0 },
      prices: { changed: 0 },
      verification: { activities: plan.activities.length, mismatches: plan.mismatches.length },
    };

    const run = await tx.orm.public.ApuImportRun.create({
      tenantId,
      fileName: input.fileName,
      fileSha256: input.fileSha256,
      importedBy: input.importedBy,
      stats: {} as never,
    });

    /* ----- 1. Fotos (deduplicadas por contenido) ----- */
    const neededShas = new Set(
      plan.items.map((item) => item.imageSha256).filter((sha): sha is string => Boolean(sha)),
    );
    const existingImages = await tx.orm.public.ApuImage.where({ tenantId })
      .select("id", "sha256")
      .all();
    const imageIdBySha = new Map(existingImages.map((image) => [image.sha256, image.id]));
    const toStore = [...neededShas].filter((sha) => !imageIdBySha.has(sha));
    result.images.reused = neededShas.size - toStore.length;
    for (const batch of chunks(toStore, 25)) {
      const created = await tx.orm.public.ApuImage.select("id", "sha256")
        .createAll(
          batch.map((sha) => {
            const image = parse.images.get(sha)!;
            return {
              tenantId,
              sha256: sha,
              mimeType: image.mimeType,
              byteSize: image.data.byteLength,
              data: image.data,
            };
          }),
        )
        .toArray();
      for (const row of created) imageIdBySha.set(row.sha256, row.id);
      result.images.stored += created.length;
    }

    /* ----- 2. Capítulos ----- */
    const existingChapters = await tx.orm.public.ApuChapter.where({ tenantId }).all();
    const chapterIdByCode = new Map(existingChapters.map((chapter) => [chapter.code, chapter.id]));
    const chapterByCode = new Map(existingChapters.map((chapter) => [chapter.code, chapter]));
    const newChapters = plan.chapters.filter((chapter) => !chapterIdByCode.has(chapter.code));
    for (const batch of chunks(newChapters)) {
      const created = await tx.orm.public.ApuChapter.select("id", "code")
        .createAll(
          batch.map((chapter) => ({
            tenantId,
            code: chapter.code,
            parentCode: chapter.parentCode,
            name: chapter.name,
            order: chapter.order,
          })),
        )
        .toArray();
      for (const row of created) chapterIdByCode.set(row.code, row.id);
      result.chapters.created += created.length;
    }
    for (const chapter of plan.chapters) {
      const existing = chapterByCode.get(chapter.code);
      if (
        existing &&
        (!same(existing.name, chapter.name) ||
          existing.order !== chapter.order ||
          !same(existing.parentCode, chapter.parentCode))
      ) {
        await tx.orm.public.ApuChapter.where({ id: existing.id, tenantId }).update({
          name: chapter.name,
          order: chapter.order,
          parentCode: chapter.parentCode,
        });
        result.chapters.updated += 1;
      }
    }

    /* ----- 3. Insumos ----- */
    const existingItems = await tx.orm.public.ApuItem.where({ tenantId })
      .select("id", "code", "name", "unit", "category", "unitPrice", "imageId", "sourceKey")
      .all();
    const itemBySourceKey = new Map<string, (typeof existingItems)[number]>();
    const legacyItemByName = new Map<string, (typeof existingItems)[number]>();
    for (const item of existingItems) {
      if (item.sourceKey) itemBySourceKey.set(item.sourceKey, item);
      else {
        const key = nameKey(item.name, item.unit);
        if (!legacyItemByName.has(key)) legacyItemByName.set(key, item);
      }
    }
    let nextCode = existingItems.reduce((max, item) => {
      const match = /^IN-0*(\d+)$/.exec((item.code ?? "").trim());
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    const itemIdByKey = new Map<string, string>();
    const priceHistory: { itemId: string; price: string; source: string }[] = [];

    const toCreate: typeof plan.items = [];
    for (const planned of plan.items) {
      let existing = itemBySourceKey.get(planned.sourceKey);
      let adopted = false;
      if (!existing) {
        existing = legacyItemByName.get(planned.sourceKey);
        if (existing) {
          adopted = true;
          legacyItemByName.delete(planned.sourceKey);
        }
      }
      if (!existing) {
        toCreate.push(planned);
        continue;
      }
      itemIdByKey.set(planned.sourceKey, existing.id);

      const imageId = planned.imageSha256 ? (imageIdBySha.get(planned.imageSha256) ?? null) : null;
      const patch: Record<string, unknown> = {};
      if (adopted) patch.sourceKey = planned.sourceKey;
      if (!same(existing.name, planned.name)) patch.name = planned.name;
      if (!same(existing.unit, planned.unit)) patch.unit = planned.unit;
      if (!same(existing.category, planned.category)) patch.category = planned.category;
      if (imageId && existing.imageId !== imageId) {
        patch.imageId = imageId;
        result.images.linked += 1;
      }
      const priceChanged = !planned.isPercent && !sameDecimal(existing.unitPrice, planned.unitPrice);
      if (priceChanged && input.updatePrices) {
        patch.unitPrice = planned.unitPrice;
        priceHistory.push({ itemId: existing.id, price: String(existing.unitPrice), source: "ANTERIOR" });
        priceHistory.push({ itemId: existing.id, price: planned.unitPrice, source: "IMPORT" });
        result.prices.changed += 1;
      }
      if (Object.keys(patch).length > 0) {
        patch.importedAt = now;
        await tx.orm.public.ApuItem.where({ id: existing.id, tenantId }).update(patch as never);
        if (adopted) result.items.adopted += 1;
        else result.items.updated += 1;
      } else {
        result.items.unchanged += 1;
      }
    }

    for (const batch of chunks(toCreate)) {
      const created = await tx.orm.public.ApuItem.select("id", "sourceKey")
        .createAll(
          batch.map((planned) => {
            nextCode += 1;
            const imageId = planned.imageSha256 ? (imageIdBySha.get(planned.imageSha256) ?? null) : null;
            if (imageId) result.images.linked += 1;
            return {
              tenantId,
              code: `IN-${String(nextCode).padStart(7, "0")}`,
              name: planned.name,
              unit: planned.unit,
              category: planned.category,
              unitPrice: planned.unitPrice,
              imageId,
              sourceKey: planned.sourceKey,
              importedAt: now,
            };
          }),
        )
        .toArray();
      for (const row of created) {
        if (row.sourceKey) itemIdByKey.set(row.sourceKey, row.id);
      }
      result.items.created += created.length;
    }
    for (const planned of toCreate) {
      if (!planned.isPercent) {
        priceHistory.push({ itemId: itemIdByKey.get(planned.sourceKey)!, price: planned.unitPrice, source: "IMPORT" });
      }
    }

    /* ----- 4. Actividades (auxiliares primero) ----- */
    const existingActivities = await tx.orm.public.ApuActivity.where({ tenantId })
      .select("id", "code", "name", "unit", "chapterId", "isAuxiliary", "referenceUnitPrice", "sortKey", "sourceKey", "sourceExtras")
      .all();
    const activityBySourceKey = new Map<string, (typeof existingActivities)[number]>();
    const legacyActivityByCode = new Map<string, (typeof existingActivities)[number]>();
    const legacyActivityByName = new Map<string, (typeof existingActivities)[number]>();
    for (const activity of existingActivities) {
      if (activity.sourceKey) activityBySourceKey.set(activity.sourceKey, activity);
      else if (activity.code) legacyActivityByCode.set(activity.code.trim(), activity);
      else legacyActivityByName.set(nameKey(activity.name, activity.unit), activity);
    }
    const activityIdByKey = new Map<string, string>();
    const adoptedActivityIds = new Set<string>();

    const activityFields = (planned: PlannedPackActivity) => ({
      code: planned.code,
      name: planned.name,
      unit: planned.unit,
      chapterId: planned.chapterCode ? (chapterIdByCode.get(planned.chapterCode) ?? null) : null,
      isAuxiliary: planned.isAuxiliary,
      referenceUnitPrice: planned.referenceUnitPrice,
      sortKey: planned.sortKey,
      sourceKey: planned.sourceKey,
      sourceExtras: (planned.extras.length ? planned.extras : null) as never,
    });

    const activitiesToCreate: PlannedPackActivity[] = [];
    for (const planned of plan.activities) {
      let existing = activityBySourceKey.get(planned.sourceKey);
      let adopted = false;
      if (!existing) {
        existing = planned.code
          ? legacyActivityByCode.get(planned.code)
          : legacyActivityByName.get(nameKey(planned.name, planned.unit));
        adopted = Boolean(existing);
      }
      if (!existing) {
        activitiesToCreate.push(planned);
        continue;
      }
      activityIdByKey.set(planned.sourceKey, existing.id);
      if (adopted) adoptedActivityIds.add(existing.id);
      const fields = activityFields(planned);
      const changed =
        adopted ||
        !same(existing.name, fields.name) ||
        !same(existing.unit, fields.unit) ||
        !same(existing.chapterId, fields.chapterId) ||
        existing.isAuxiliary !== fields.isAuxiliary ||
        !sameDecimal(existing.referenceUnitPrice, fields.referenceUnitPrice) ||
        !same(existing.sortKey, fields.sortKey) ||
        JSON.stringify(existing.sourceExtras ?? null) !== JSON.stringify(fields.sourceExtras ?? null);
      if (changed) {
        // El código de una actividad adoptada se conserva (puede ser el del usuario).
        const { code: _code, ...rest } = fields;
        await tx.orm.public.ApuActivity.where({ id: existing.id, tenantId }).update({
          ...rest,
          ...(existing.code ? {} : { code: fields.code }),
          importedAt: now,
        } as never);
        if (adopted) result.activities.adopted += 1;
        else result.activities.updated += 1;
      } else {
        result.activities.unchanged += 1;
      }
    }
    for (const batch of chunks(activitiesToCreate)) {
      const created = await tx.orm.public.ApuActivity.select("id", "sourceKey")
        .createAll(batch.map((planned) => ({ tenantId, ...activityFields(planned), importedAt: now })) as never)
        .toArray();
      for (const row of created) {
        if (row.sourceKey) activityIdByKey.set(row.sourceKey, row.id);
      }
      result.activities.created += created.length;
    }

    /* ----- 5. Insumos que son APU auxiliares (APU compuesto) ----- */
    for (const planned of plan.items) {
      if (!planned.auxiliarySourceKey) continue;
      const itemId = itemIdByKey.get(planned.sourceKey);
      const activityId = activityIdByKey.get(planned.auxiliarySourceKey);
      if (itemId && activityId) {
        await tx.orm.public.ApuItem.where({ id: itemId, tenantId }).update({
          auxiliaryActivityId: activityId,
        });
      }
    }

    /* ----- 6. Composición ----- */
    const activityIds = [...activityIdByKey.values()];
    for (const batch of chunks(activityIds)) {
      result.lines.replacedImported += await tx.orm.public.ApuActivityComposition
        .where((line) => line.activityId.in(batch))
        .where({ origin: "IMPORT" })
        .deleteAndCount();
    }
    // Primera adopción de una actividad del importador anterior: sus líneas
    // antiguas (sin sección ni orden) se sustituyen por las completas.
    const adopted = [...adoptedActivityIds];
    for (const batch of chunks(adopted)) {
      result.lines.replacedLegacy += await tx.orm.public.ApuActivityComposition
        .where((line) => line.activityId.in(batch))
        .where({ origin: "MANUAL" })
        .deleteAndCount();
    }
    for (const batch of chunks(activityIds)) {
      result.lines.manualKept += (
        await tx.orm.public.ApuActivityComposition
          .where((line) => line.activityId.in(batch))
          .where({ origin: "MANUAL" })
          .select("id")
          .all()
      ).length;
    }

    const rows = plan.activities.flatMap((planned) => {
      const activityId = activityIdByKey.get(planned.sourceKey)!;
      return planned.lines.map((line) => ({
        activityId,
        itemId: itemIdByKey.get(line.itemSourceKey)!,
        consumption: line.consumption,
        wastePercent: "0",
        order: line.order,
        section: line.section,
        lineUnit: line.lineUnit,
        lineQuantity: line.lineQuantity,
        lineUnitPrice: line.lineUnitPrice,
        linePartial: line.linePartial,
        origin: "IMPORT" as const,
      }));
    });
    for (const batch of chunks(rows, 1000)) {
      result.lines.written += await tx.orm.public.ApuActivityComposition.createAndCount(batch);
    }

    /* ----- 7. Historial de precios y registro ----- */
    for (const batch of chunks(priceHistory)) {
      await tx.orm.public.ApuItemPriceHistory.createAndCount(
        batch.map((entry) => ({ tenantId, importRunId: run.id, ...entry })),
      );
    }
    await tx.orm.public.ApuImportRun.where({ id: run.id, tenantId }).update({
      stats: {
        ...result,
        mismatches: plan.mismatches,
        priceConflicts: plan.priceConflicts,
        unassignedImages: parse.unassignedImages,
        warnings: parse.warnings,
        sheets: {
          chapters: parse.chapters.length,
          activities: parse.activityRows.length,
          apus: parse.apus.length,
          auxiliaries: parse.auxiliaries.length,
          materials: parse.materials.length,
        },
      } as never,
    });

    return { importRunId: run.id, ...result };
  });
}
