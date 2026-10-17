/**
 * Catálogo APU del tenant: insumos, actividades y composición.
 * Extraído de `lib/tenant-db.ts`; `createTenantDb` lo compone. Todo
 * acceso va acotado al `tenantId` recibido.
 */
import { createHash } from "node:crypto";
import {
  or,
} from "@prisma/orm-postgres/orm-client";
import {
  db,
} from "@/prisma/db";
import {
  compositionUnitPrice,
  activityUnitCost,
  isStrictlyPositive,
  isValidPercent,
} from "@/lib/apu-engine";
import {
  type ApuActivityDetail,
  type ApuActivityListInput,
  type ApuChapterRow,
  type ApuActivityRow,
  type ApuItemRow,
  type ApuListInput,
  countActivityQuoteUsage,
  countItemCompositionUsage,
  escapeLike,
  getApuActivityDetail,
} from "./shared";

/** Igualdad de decimales en texto ("30000" = "30000.00"). */
function sameDecimalText(a: unknown, b: unknown): boolean {
  const norm = (value: unknown) => {
    const [i, f = ""] = String(value).split(".");
    const frac = f.replace(/0+$/, "");
    return `${i.replace(/^0+(?=\d)/, "")}${frac ? `.${frac}` : ""}`;
  };
  return norm(a) === norm(b);
}

export function createCatalogDb(tenantId: string) {
  // --- APU p99 cache (closure-scoped, avoids 'this') ---
  let _p99Cache: { ts: number; data: { activityUnitCost: Record<string, string>; itemConsumption: Record<string, string>; activityUnitCostMedian: Record<string, string>; itemConsumptionMedian: Record<string, string>; activityUnitCostP99: Record<string, string>; itemConsumptionP99: Record<string, string> } } | null = null;
  const _p99CacheTtlMs = 60_000;
  function invalidateP99(): void {
    _p99Cache = null;
  }

  return {
      listItems: async ({
        q,
        category,
        unit,
        active,
        page = 1,
        limit = 10,
      }: ApuListInput = {}): Promise<{ rows: ApuItemRow[]; total: number }> => {
        const text = (q ?? "").trim();
        const pattern = text ? `%${escapeLike(text)}%` : null;
        const safePage = Math.max(1, Math.trunc(page));
        const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit)));

        let filtered = db.orm.public.ApuItem.where({ tenantId });
        if (text) {
          filtered = filtered.where((item) =>
            or(item.name.ilike(pattern!), item.code.ilike(pattern!)),
          );
        }
        if (category) {
          filtered = filtered.where((item) => item.category.eq(category));
        }
        if (unit) {
          filtered = filtered.where((item) => item.unit.eq(unit));
        }
        if (typeof active === "boolean") {
          filtered = filtered.where((item) => item.active.eq(active));
        }

        const [rows, { total }] = await Promise.all([
          filtered
            .orderBy((item) => item.name.asc())
            .limit(safeLimit)
            .offset((safePage - 1) * safeLimit)
            .all(),
          filtered.aggregate((aggregate) => ({ total: aggregate.count() })),
        ]);

        return {
          rows: rows.map((row) => ({
            id: row.id,
            code: row.code,
            name: row.name,
            unit: row.unit,
            category: row.category,
            unitPrice: String(row.unitPrice),
            active: row.active,
            imageUrl: row.imageUrl,
            imageId: row.imageId ?? null,
            updatedAt: String(row.updatedAt),
          })),
          total,
        };
      },

      /** Unidades distintas presentes en el banco (para el filtro de la UI). */
      listUnits: async (): Promise<string[]> => {
        const rows = await db.orm.public.ApuItem
          .where({ tenantId })
          .distinct("unit")
          .all();
        return rows
          .map((row) => row.unit)
          .filter((unit): unit is string => Boolean(unit))
          .sort((a, b) => a.localeCompare(b));
      },

      getItem: (id: string) =>
        db.orm.public.ApuItem.where({ id, tenantId }).first(),

      createItem: async function(
        data: Omit<
          Parameters<typeof db.orm.public.ApuItem.create>[0],
          "tenantId"
        >,
      ) {
        const res = await db.orm.public.ApuItem.create({
          ...data,
          tenantId,
        });
        invalidateP99();
        return res;
      },

      /**
       * Actualiza un insumo. Si cambia el precio, el cambio llega a las líneas
       * de APU importadas que usaban el precio anterior (actualización masiva:
       * "cambiar el cemento y que se recalculen los APU") y queda en el
       * historial. Las líneas porcentuales no se tocan: su precio es una base.
       */
      updateItem: async function(id: string, data: Record<string, unknown>) {
        const res = await db.transaction(async (tx) => {
          const before = await tx.orm.public.ApuItem.where({ id, tenantId })
            .select("unitPrice")
            .first();
          const updated = await tx.orm.public.ApuItem.where({ id, tenantId }).update(data as never);
          const newPrice = data.unitPrice === undefined ? null : String(data.unitPrice);
          if (before && updated && newPrice !== null && !sameDecimalText(before.unitPrice, newPrice)) {
            const lines = await tx.orm.public.ApuActivityComposition.where({ itemId: id }).all();
            for (const line of lines) {
              const unit = line.lineUnit ?? "";
              if (
                line.lineUnitPrice !== null &&
                !unit.trim().startsWith("%") &&
                sameDecimalText(line.lineUnitPrice, before.unitPrice)
              ) {
                await tx.orm.public.ApuActivityComposition.where({ id: line.id }).update({
                  lineUnitPrice: newPrice,
                });
              }
            }
            await tx.orm.public.ApuItemPriceHistory.createAndCount([
              { tenantId, itemId: id, price: String(before.unitPrice), source: "ANTERIOR" },
              { tenantId, itemId: id, price: newPrice, source: "MANUAL" },
            ]);
          }
          return updated;
        });
        invalidateP99();
        return res;
      },

      /**
       * Guarda una foto de insumo en el sistema (deduplicada por contenido) y
       * devuelve su id. La misma imagen subida dos veces no se duplica.
       */
      storeImage: async (data: Uint8Array, mimeType: string): Promise<string> => {
        const sha256 = createHash("sha256").update(data).digest("hex");
        const existing = await db.orm.public.ApuImage.where({ tenantId, sha256 }).select("id").first();
        if (existing) return existing.id;
        const created = await db.orm.public.ApuImage.select("id").create({
          tenantId,
          sha256,
          mimeType,
          byteSize: data.byteLength,
          data,
        });
        return created.id;
      },

      /**
       * Todos los insumos vigentes, en forma compacta, para el selector de la
       * composición (el catálogo real tiene miles: no se pagina ahí).
       */
      listAllItems: async (): Promise<ApuItemRow[]> => {
        const rows = await db.orm.public.ApuItem.where({ tenantId, active: true })
          .orderBy((item) => item.name.asc())
          .all();
        return rows.map((row) => ({
          id: row.id,
          code: row.code,
          name: row.name,
          unit: row.unit,
          category: row.category,
          unitPrice: String(row.unitPrice),
          active: row.active,
          imageUrl: row.imageUrl,
          imageId: row.imageId ?? null,
          updatedAt: String(row.updatedAt),
        }));
      },

      /** Cifras del catálogo para el encabezado del módulo. */
      getOverview: async () => {
        const [activities, items, chapters, lastRun] = await Promise.all([
          db.orm.public.ApuActivity.where({ tenantId }).select("isAuxiliary").all(),
          db.orm.public.ApuItem.where({ tenantId }).select("imageId", "active").all(),
          db.orm.public.ApuChapter.where({ tenantId }).select("id").all(),
          db.orm.public.ApuImportRun.where({ tenantId })
            .orderBy((run) => run.createdAt.desc())
            .select("fileName", "createdAt")
            .first(),
        ]);
        return {
          activities: activities.filter((a) => !a.isAuxiliary).length,
          auxiliaries: activities.filter((a) => a.isAuxiliary).length,
          items: items.filter((i) => i.active).length,
          itemsWithImage: items.filter((i) => i.imageId).length,
          chapters: chapters.length,
          lastImport: lastRun ? { fileName: lastRun.fileName, createdAt: String(lastRun.createdAt) } : null,
        };
      },

      /** Capítulos del catálogo en el orden del archivo, con su conteo. */
      listChapters: async (): Promise<ApuChapterRow[]> => {
        const [chapters, activities] = await Promise.all([
          db.orm.public.ApuChapter.where({ tenantId })
            .orderBy((chapter) => chapter.order.asc())
            .all(),
          db.orm.public.ApuActivity.where({ tenantId, isAuxiliary: false })
            .select("chapterId")
            .all(),
        ]);
        const counts = new Map<string, number>();
        for (const activity of activities) {
          if (activity.chapterId) counts.set(activity.chapterId, (counts.get(activity.chapterId) ?? 0) + 1);
        }
        return chapters.map((chapter) => ({
          id: chapter.id,
          code: chapter.code,
          parentCode: chapter.parentCode ?? null,
          name: chapter.name,
          order: chapter.order,
          activityCount: counts.get(chapter.id) ?? 0,
        }));
      },

      listActivities: async ({
        q,
        unit,
        active,
        chapterCode,
        kind = "activity",
        page = 1,
        limit = 200,
      }: ApuActivityListInput = {}): Promise<{
        rows: ApuActivityRow[];
        total: number;
      }> => {
        const text = (q ?? "").trim();
        const pattern = text ? `%${escapeLike(text)}%` : null;
        const safePage = Math.max(1, Math.trunc(page));
        const safeLimit = Math.min(500, Math.max(1, Math.trunc(limit)));

        let filtered = db.orm.public.ApuActivity.where({ tenantId });
        if (text) {
          filtered = filtered.where((activity) =>
            or(
              activity.name.ilike(pattern!),
              activity.code.ilike(pattern!),
            ),
          );
        }
        if (unit) {
          filtered = filtered.where((activity) => activity.unit.eq(unit));
        }
        if (typeof active === "boolean") {
          filtered = filtered.where((activity) => activity.active.eq(active));
        }
        filtered = filtered.where({ isAuxiliary: kind === "auxiliary" });
        const chapters = await db.orm.public.ApuChapter.where({ tenantId })
          .select("id", "code", "name")
          .all();
        const chapterById = new Map(chapters.map((chapter) => [chapter.id, chapter]));
        if (chapterCode) {
          // El capítulo y sus subcapítulos ("22" incluye "22.63").
          const ids = chapters
            .filter((chapter) => chapter.code === chapterCode || chapter.code.startsWith(`${chapterCode}.`))
            .map((chapter) => chapter.id);
          filtered = filtered.where((activity) => activity.chapterId.in(ids.length ? ids : ["-"]));
        }

        const [rows, { total }] = await Promise.all([
          filtered
            .orderBy((activity) => activity.sortKey.asc())
            .orderBy((activity) => activity.name.asc())
            .limit(safeLimit)
            .offset((safePage - 1) * safeLimit)
            .all(),
          filtered.aggregate((aggregate) => ({ total: aggregate.count() })),
        ]);

        const activityIds = rows.map((row) => row.id);
        const compositions =
          activityIds.length === 0
            ? []
            : await db.orm.public.ApuActivityComposition
                .where((composition) => composition.activityId.in(activityIds))
                .include("item", (item) =>
                  item.select(
                    "id",
                    "code",
                    "name",
                    "unit",
                    "category",
                    "unitPrice",
                  ),
                )
                .all();
        const byActivity = new Map<string, typeof compositions>();
        for (const composition of compositions) {
          const list = byActivity.get(composition.activityId) ?? [];
          list.push(composition);
          byActivity.set(composition.activityId, list);
        }

        return {
          rows: rows.map((row) => {
            const activityCompositions = byActivity.get(row.id) ?? [];
            return {
              id: row.id,
              code: row.code,
              name: row.name,
              unit: row.unit,
              description: row.description,
              referenceUnitPrice:
                row.referenceUnitPrice === null || row.referenceUnitPrice === undefined
                  ? null
                  : String(row.referenceUnitPrice),
              chapterCode: row.chapterId ? (chapterById.get(row.chapterId)?.code ?? null) : null,
              chapterName: row.chapterId ? (chapterById.get(row.chapterId)?.name ?? null) : null,
              isAuxiliary: row.isAuxiliary,
              unitCost: activityUnitCost(
                activityCompositions.map((composition) => ({
                  unitPrice: compositionUnitPrice(composition, composition.item!.unitPrice),
                  consumption: String(composition.consumption),
                  wastePercent: String(composition.wastePercent),
                })),
              ),
              itemCount: activityCompositions.length,
              active: row.active,
              updatedAt: String(row.updatedAt),
            };
          }),
          total,
        };
      },

      /** Detalle de una actividad con su composición (costos unitarios). */
      getActivity: (id: string) => getApuActivityDetail(tenantId, id),

      /**
       * Crea actividad + composición en una transacción. `compositions`
       * llega ya validada por la Server Action (insumos del mismo tenant).
       */
      createActivity: async (data: {
        code?: string;
        name: string;
        unit: string;
        description?: string;
        compositions: { itemId: string; consumption: string; wastePercent: string }[];
      }): Promise<ApuActivityDetail | null> => {
        const { compositions, ...fields } = data;
        const created = await db.transaction(async (tx) => {
          const activity = await tx.orm.public.ApuActivity.create({
            ...fields,
            tenantId,
          });
          for (const [order, composition] of compositions.entries()) {
            await tx.orm.public.ApuActivityComposition.create({
              order,
              activityId: activity.id,
              itemId: composition.itemId,
              consumption: composition.consumption,
              wastePercent: composition.wastePercent,
            });
          }
          return activity;
        });
        return getApuActivityDetail(tenantId, created.id);
      },

      /** Reemplaza actividad + composición completa (idempotente). */
      updateActivity: async (
        id: string,
        data: {
          code?: string;
          name: string;
          unit: string;
          description?: string;
          compositions: { itemId: string; consumption: string; wastePercent: string }[];
        },
      ): Promise<ApuActivityDetail | null> => {
        const { compositions, ...fields } = data;
        const updated = await db.transaction(async (tx) => {
          const activity = await tx.orm.public.ApuActivity
            .where({ id, tenantId })
            .update(fields);
          if (!activity) {
            throw new Error("No se encontró la actividad en este negocio.");
          }
          // Cambios incrementales: cada fila del editor se empareja con su
          // línea existente (mismo insumo, en orden). Las líneas que no se
          // tocan conservan sección, orden y precio del archivo importado;
          // borrar todo y recrear perdería esos datos.
          const existing = await tx.orm.public.ApuActivityComposition
            .where({ activityId: id })
            .orderBy((line) => line.order.asc())
            .all();
          const unmatched = [...existing];
          let nextOrder = existing.reduce((max, line) => Math.max(max, line.order), -1) + 1;
          for (const composition of compositions) {
            const index = unmatched.findIndex((line) => line.itemId === composition.itemId);
            if (index === -1) {
              await tx.orm.public.ApuActivityComposition.create({
                activityId: id,
                itemId: composition.itemId,
                consumption: composition.consumption,
                wastePercent: composition.wastePercent,
                order: nextOrder,
                origin: "MANUAL",
              });
              nextOrder += 1;
              continue;
            }
            const [line] = unmatched.splice(index, 1);
            if (
              String(line.consumption) !== composition.consumption ||
              String(line.wastePercent) !== composition.wastePercent
            ) {
              await tx.orm.public.ApuActivityComposition.where({ id: line.id }).update({
                consumption: composition.consumption,
                wastePercent: composition.wastePercent,
              });
            }
          }
          for (const line of unmatched) {
            await tx.orm.public.ApuActivityComposition.where({ id: line.id }).delete();
          }
          return activity;
        });
        return getApuActivityDetail(tenantId, updated.id);
      },

      /* --- Insumos: archivado y borrado seguro ---------------------- */

      /** Archiva un insumo (soft delete): deja de ofrecerse para composiciones. */
      archiveItem: async function(id: string) {
        await db.orm.public.ApuItem.where({ id, tenantId }).update({ active: false });
        invalidateP99();
      },

      /** Revierte la archivación de un insumo. */
      restoreItem: async function(id: string) {
        await db.orm.public.ApuItem.where({ id, tenantId }).update({ active: true });
        invalidateP99();
      },

      /** Cuántas composiciones de actividades usan este insumo. */
      countItemUsage: (id: string) => countItemCompositionUsage(id),

      /**
       * Borrado definitivo de un insumo. Se bloquea si está EN USO (alguna
       * composición lo referencia): `ApuActivityComposition.itemId` es
       * `onDelete: Cascade` y un borrado ciego alteraría las actividades.
       * El caller debe preferir `archiveItem`.
       */
      deleteItem: async function(id: string): Promise<void> {
        const item = await db.orm.public.ApuItem.where({ id, tenantId }).first();
        if (!item) {
          throw new Error("APU_NOT_FOUND");
        }
        if ((await countItemCompositionUsage(id)) > 0) {
          throw new Error("APU_IN_USE");
        }
        await db.orm.public.ApuItem.where({ id, tenantId }).delete();
        invalidateP99();
      },

      /* --- Actividades: archivado y borrado seguro ------------------ */

      /** Archiva una actividad (soft delete). */
      archiveActivity: async function(id: string) {
        await db.orm.public.ApuActivity.where({ id, tenantId }).update({ active: false });
        invalidateP99();
      },

      /** Revierte la archivación de una actividad. */
      restoreActivity: async function(id: string) {
        await db.orm.public.ApuActivity.where({ id, tenantId }).update({ active: true });
        invalidateP99();
      },

      /** Cuántas partidas de presupuesto referencian esta actividad. */
      countActivityUsage: (id: string) => countActivityQuoteUsage(id),

      /**
       * Borrado definitivo de una actividad. Se bloquea si está EN USO (alguna
       * partida la referencia): `QuoteItem.activityId` es `onDelete: SetNull`
       * y borrar dejaría presupuestos históricos sin su actividad.
       */
      deleteActivity: async (id: string): Promise<void> => {
        const activity = await db.orm.public.ApuActivity
          .where({ id, tenantId })
          .first();
        if (!activity) {
          throw new Error("APU_NOT_FOUND");
        }
        if ((await countActivityQuoteUsage(id)) > 0) {
          throw new Error("APU_IN_USE");
        }
        await db.orm.public.ApuActivity.where({ id, tenantId }).delete();
      },

      /* --- Composición: agregar / quitar insumo --------------------- */

      /**
       * Agrega un insumo a la composición de una actividad. Verifica que la
       * actividad y el insumo pertenezcan al MISMO tenant, que no se repita el
       * par (activityId, itemId) y que el rendimiento/desperdicio sean válidos
       * (defensa en profundidad: la Server Action ya validó, pero la capa de
       * datos no confía en el caller).
       */
      addComposition: async function(
        activityId: string,
        data: { itemId: string; consumption: string; wastePercent: string },
      ): Promise<{ id: string }> {
        const activity = await db.orm.public.ApuActivity
          .where({ id: activityId, tenantId })
          .first();
        if (!activity) {
          throw new Error("APU_NOT_FOUND");
        }
        const item = await db.orm.public.ApuItem
          .where({ id: data.itemId, tenantId })
          .first();
        if (!item) {
          throw new Error("APU_FOREIGN_ITEM");
        }
        if (activity.active === false || item.active === false) {
          throw new Error("APU_INVALID");
        }
        if (!isStrictlyPositive(data.consumption)) {
          throw new Error("APU_INVALID_CONSUMPTION");
        }
        if (!isValidPercent(data.wastePercent, 50)) {
          throw new Error("APU_INVALID_WASTE");
        }
        const existing = await db.orm.public.ApuActivityComposition
          .where({ activityId, itemId: data.itemId })
          .first();
        if (existing) {
          throw new Error("APU_DUPLICATE");
        }
        const created = await db.orm.public.ApuActivityComposition.create({
          activityId,
          itemId: data.itemId,
          consumption: data.consumption,
          wastePercent: data.wastePercent,
        });
        // No invalidar caché aquí: TTL 60s maneja la expiración natural
        return { id: created.id };
      },

      /**
       * Quita un insumo de la composición de una actividad (idempotente).
       * Devuelve cuántas filas se eliminaron.
       */
      removeComposition: async function(
        activityId: string,
        itemId: string,
      ): Promise<number> {
        const activity = await db.orm.public.ApuActivity
          .where({ id: activityId, tenantId })
          .first();
        if (!activity) {
          throw new Error("APU_NOT_FOUND");
        }
        const plan = db.sql.public.ApuActivityComposition
          .delete()
          .where((field, fns) =>
            fns.and(
              fns.eq(field.activityId, activityId),
              fns.eq(field.itemId, itemId),
            ),
          )
          .build();
        const { affectedRows } = await db.runtime().execute(plan);
        // No invalidar caché aquí: TTL 60s maneja la expiración natural
        return affectedRows;
      },

      /**
       * Calcula umbrales p99 (atípicos) sobre TODO el catálogo (no por página):
       * - p99 del costo unitario de actividades, agrupado por unidad de actividad
       * - p99 del consumo por insumo, agrupado por unidad del insumo
       * No modifica datos; se usa para badges "revisar" en la UI.
       */
      getP99Thresholds: async function (): Promise<{
        activityUnitCost: Record<string, string>;
        itemConsumption: Record<string, string>;
        activityUnitCostMedian?: Record<string, string>;
        itemConsumptionMedian?: Record<string, string>;
        activityUnitCostP99?: Record<string, string>;
        itemConsumptionP99?: Record<string, string>;
      }> {
        const now = Date.now();
        if (_p99Cache && now - _p99Cache.ts < _p99CacheTtlMs) {
          return _p99Cache.data;
        }
        // p99 costo unitario de actividades por unidad
        const allActivities = await db.orm.public.ApuActivity
          .where({ tenantId })
          .all();
        const activityIds = allActivities.map((a) => a.id);
        const activityComps = await db.orm.public.ApuActivityComposition
          .where((comp) => comp.activityId.in(activityIds))
          .include("item", (item) =>
            item.select("id", "unitPrice", "unit"),
          )
          .all();

        const compsByActivity = new Map<string, typeof activityComps>();
        for (const comp of activityComps) {
          const list = compsByActivity.get(comp.activityId) ?? [];
          list.push(comp);
          compsByActivity.set(comp.activityId, list);
        }

        const costByUnit: Map<string, number[]> = new Map();
        for (const activity of allActivities) {
          const comps = compsByActivity.get(activity.id) ?? [];
          const costStr = activityUnitCost(
            comps.map((c) => ({
              unitPrice: compositionUnitPrice(c, c.item!.unitPrice),
              consumption: String(c.consumption),
              wastePercent: String(c.wastePercent),
            })),
          );
          const cost = parseFloat(costStr);
          if (!isNaN(cost)) {
            const arr = costByUnit.get(activity.unit) ?? [];
            arr.push(cost);
            costByUnit.set(activity.unit, arr);
          }
        }

        const p99ActivityUnitCost: Record<string, string> = {};
        for (const [unit, values] of costByUnit) {
          if (values.length >= 2) {
            const sorted = values.sort((a, b) => a - b);
            const idx = Math.min(sorted.length - 1, Math.ceil(0.99 * sorted.length) - 1);
            p99ActivityUnitCost[unit] = sorted[Math.max(0, idx)].toFixed(2);
          } else if (values.length === 1) {
            p99ActivityUnitCost[unit] = values[0].toFixed(2);
          }
        }

        // p99 consumo por insumo agrupado por unidad del insumo
        const consumptionByItemUnit: Map<string, number[]> = new Map();
        for (const comp of activityComps) {
          const consumption = parseFloat(String(comp.consumption));
          if (!isNaN(consumption) && comp.item?.unit) {
            const arr = consumptionByItemUnit.get(comp.item.unit) ?? [];
            arr.push(consumption);
            consumptionByItemUnit.set(comp.item.unit, arr);
          }
        }

        const p99ItemConsumption: Record<string, string> = {};
        for (const [unit, values] of consumptionByItemUnit) {
          if (values.length >= 2) {
            const sorted = values.sort((a, b) => a - b);
            const idx = Math.min(sorted.length - 1, Math.ceil(0.99 * sorted.length) - 1);
            p99ItemConsumption[unit] = sorted[Math.max(0, idx)].toFixed(4);
          } else if (values.length === 1) {
            p99ItemConsumption[unit] = values[0].toFixed(4);
          }
        }
        const median = (vals: number[]): number => {
          if (vals.length === 0) return 0;
          const sorted = [...vals].sort((a,b)=>a-b);
          const mid = Math.floor(sorted.length/2);
          if (sorted.length % 2 === 1) return sorted[mid];
          return (sorted[mid-1] + sorted[mid]) / 2;
        };
        const p99ActivityUnitCostMedian: Record<string, string> = {};
        for (const [unit, values] of costByUnit) {
          if (values.length > 0) {
            p99ActivityUnitCostMedian[unit] = median(values).toFixed(2);
          }
        }
        const p99ItemConsumptionMedian: Record<string, string> = {};
        for (const [unit, values] of consumptionByItemUnit) {
          if (values.length > 0) {
            p99ItemConsumptionMedian[unit] = median(values).toFixed(4);
          }
        }


        const data = {
          activityUnitCost: p99ActivityUnitCost,
          itemConsumption: p99ItemConsumption,
          activityUnitCostMedian: p99ActivityUnitCostMedian,
          itemConsumptionMedian: p99ItemConsumptionMedian,
          activityUnitCostP99: p99ActivityUnitCost,
          itemConsumptionP99: p99ItemConsumption,
        };
        _p99Cache = { ts: Date.now(), data };
        return data;
      },

      invalidateP99: function () {
        _p99Cache = null;
      },

      /**
       * Informe de salud del catálogo APU (solo lectura, no modifica datos).
       * Devuelve métricas y listas para auditoría:
       * - actividades sin composición
       * - actividades con costo unitario 0
       * - insumos sin uso en ninguna actividad
       * - antigüedad de precios (días desde última actualización)
       * - estado de apu-importer (archivos recientes) y APU_UNITS configuradas
       */
      getCatalogHealthReport: async (): Promise<{
        activitiesWithoutComposition: { id: string; code: string | null; name: string; unit: string }[];
        activitiesWithZeroUnitCost: { id: string; code: string | null; name: string; unit: string }[];
        unusedItems: { id: string; code: string | null; name: string; unit: string; updatedAt: string }[];
        priceAgeDays: { id: string; code: string | null; name: string; unit: string; ageDays: number }[];
        apuImporterStatus: { recentFiles: number; lastImport: string | null };
        apuUnitsConfigured: string[];
      }> => {
        // Actividades sin composición
        const allActivities = await db.orm.public.ApuActivity
          .where({ tenantId })
          .all();
        const activityIds = allActivities.map((a) => a.id);
        const allCompositions = await db.orm.public.ApuActivityComposition
          .where((comp) => comp.activityId.in(activityIds))
          .select("activityId")
          .all();
        const activitiesWithComposition = new Set(allCompositions.map((c) => c.activityId));
        const activitiesWithoutComposition = allActivities
          .filter((a) => !activitiesWithComposition.has(a.id))
          .map((a) => ({ id: a.id, code: a.code, name: a.name, unit: a.unit }));

        // Costo unitario 0 (recalcula con precios actuales)
        const activityComps = await db.orm.public.ApuActivityComposition
          .where((comp) => comp.activityId.in(activityIds))
          .include("item", (item) => item.select("id", "unitPrice", "unit"))
          .all();
        const compsByActivity = new Map<string, typeof activityComps>();
        for (const comp of activityComps) {
          const list = compsByActivity.get(comp.activityId) ?? [];
          list.push(comp);
          compsByActivity.set(comp.activityId, list);
        }
        const activitiesWithZeroUnitCost: { id: string; code: string | null; name: string; unit: string }[] = [];
        for (const activity of allActivities) {
          const comps = compsByActivity.get(activity.id) ?? [];
          if (comps.length > 0) {
            const costStr = activityUnitCost(
              comps.map((c) => ({
                unitPrice: compositionUnitPrice(c, c.item!.unitPrice),
                consumption: String(c.consumption),
                wastePercent: String(c.wastePercent),
              })),
            );
            if (parseFloat(costStr) === 0) {
              activitiesWithZeroUnitCost.push({ id: activity.id, code: activity.code, name: activity.name, unit: activity.unit });
            }
          }
        }

        // Insumos sin uso
        const allItems = await db.orm.public.ApuItem.where({ tenantId }).all();
        const usedItemIds = new Set(activityComps.map((c) => c.itemId));
        const unusedItems = allItems
          .filter((item) => !usedItemIds.has(item.id))
          .map((item) => ({ id: item.id, code: item.code, name: item.name, unit: item.unit, updatedAt: String(item.updatedAt) }));

        // Antigüedad de precios (días desde updatedAt)
        const now = new Date();
        const priceAgeDays = allItems.map((item) => {
          const updated = new Date(String(item.updatedAt));
          const ageDays = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
          return { id: item.id, code: item.code, name: item.name, unit: item.unit, ageDays };
        });

        // Estado apu-importer: busca archivos en importaciones recientes
        // Nota: no hay tabla de logs de importación; se devuelve placeholder
        const apuImporterStatus = { recentFiles: 0, lastImport: null as string | null };

        // APU_UNITS configuradas (del motor)
        const { APU_UNITS } = await import("@/lib/apu-engine");

        return {
          activitiesWithoutComposition,
          activitiesWithZeroUnitCost,
          unusedItems,
          priceAgeDays,
          apuImporterStatus,
          apuUnitsConfigured: [...APU_UNITS],
        };
      },
  };
}
