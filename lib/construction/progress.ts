/**
 * Actas de avance de obra: cantidad ejecutada por partida a una fecha de
 * corte. Es la fuente del valor ganado (EV) del informe semanal.
 *
 * Solo en obras contratadas (APPROVED / IN_EXECUTION). La primera acta de una
 * obra contratada la pasa a En ejecución.
 */
import { db } from "@/prisma/db";
import { calculateItemTotal } from "@/lib/construction/apu-engine";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export type ProgressEntryRow = {
  id: string;
  cutoffDate: string;
  executedQuantity: string;
  note: string | null;
  authorName: string;
  createdAt: string;
};

export type ItemProgressRow = {
  itemId: string;
  chapterName: string;
  code: string;
  description: string;
  unit: string;
  /** Cantidad presupuestada (micro). */
  quantity: string;
  /** Ejecutado acumulado (micro). */
  executed: string;
  /** Valor ganado de la partida = ejecutado × costo unitario (micro-pesos). */
  earned: string;
  /** Avance de la partida (0–100+, un decimal). */
  pct: number;
  entries: ProgressEntryRow[];
};

/** "YYYY-MM-DD" → inicio del día en Bogotá (UTC−5). */
function bogotaDayInstant(isoDay: string): Temporal.Instant {
  const [y, m, d] = isoDay.split("-").map(Number);
  return Temporal.Instant.fromEpochMilliseconds(Date.UTC(y, m - 1, d, 5, 0, 0));
}

function bogotaToday(): string {
  const now = new Date(Date.now() - 5 * 3600 * 1000);
  return now.toISOString().slice(0, 10);
}

function instantToIsoDay(value: unknown): string {
  const ms = Date.parse(String(value));
  return new Date(ms - 5 * 3600 * 1000).toISOString().slice(0, 10);
}

export function createProgressDb(tenantId: string) {
  const budgetItems = async (projectId: string) => {
    const budget = await db.orm.public.ProjectBudget.where({ projectId, tenantId }).select("id").first();
    if (!budget) return [];
    const chapters = await db.orm.public.BudgetChapter.where({ budgetId: budget.id })
      .orderBy((chapter) => chapter.order.asc())
      .select("id", "name", "order")
      .all();
    if (chapters.length === 0) return [];
    const items = await db.orm.public.BudgetItem.where((item) => item.chapterId.in(chapters.map((c) => c.id)))
      .select("id", "chapterId", "order", "code", "description", "unit", "quantity", "unitCostDirect")
      .all();
    const chapterById = new Map(chapters.map((chapter) => [chapter.id, chapter]));
    return items
      .map((item) => ({ ...item, chapter: chapterById.get(item.chapterId)! }))
      .sort((a, b) => a.chapter.order - b.chapter.order || a.order - b.order);
  };

  return {
    /** Avance por partida con sus actas, en el orden del presupuesto. */
    listByItem: async (projectId: string): Promise<ItemProgressRow[]> => {
      const items = await budgetItems(projectId);
      if (items.length === 0) return [];
      const entries = await db.orm.public.BudgetItemProgress.where({ tenantId })
        .where((entry) => entry.budgetItemId.in(items.map((item) => item.id)))
        .orderBy((entry) => entry.cutoffDate.desc())
        .all();
      return items.map((item) => {
        const own = entries.filter((entry) => entry.budgetItemId === item.id);
        const executed = own.reduce((sum, entry) => sum + BigInt(entry.executedQuantity), BigInt(0));
        const quantity = BigInt(item.quantity);
        const earned = calculateItemTotal(executed, BigInt(item.unitCostDirect));
        const pct = quantity > BigInt(0) ? Number((executed * BigInt(1000)) / quantity) / 10 : 0;
        return {
          itemId: item.id,
          chapterName: item.chapter.name,
          code: item.code,
          description: item.description,
          unit: item.unit,
          quantity: String(quantity),
          executed: String(executed),
          earned: String(earned),
          pct,
          entries: own.map((entry) => ({
            id: entry.id,
            cutoffDate: instantToIsoDay(entry.cutoffDate),
            executedQuantity: String(entry.executedQuantity),
            note: entry.note ?? null,
            authorName: entry.authorName,
            createdAt: String(entry.createdAt),
          })),
        };
      });
    },

    /**
     * Registra un acta de avance. Errores: NOT_FOUND, PROJECT_NOT_CONTRACTED,
     * INVALID_QUANTITY, INVALID_DATE.
     */
    record: async (
      projectId: string,
      input: { budgetItemId: string; cutoffDate: string; executedQuantity: bigint; note?: string; authorName: string },
    ): Promise<{ id: string; projectStatus: string }> => {
      const project = await db.orm.public.Project.where({ id: projectId, tenantId }).select("status").first();
      if (!project) throw new Error("NOT_FOUND");
      if (project.status !== "APPROVED" && project.status !== "IN_EXECUTION") {
        throw new Error("PROJECT_NOT_CONTRACTED");
      }
      if (input.executedQuantity <= BigInt(0)) throw new Error("INVALID_QUANTITY");
      if (!ISO_DAY.test(input.cutoffDate) || input.cutoffDate > bogotaToday()) throw new Error("INVALID_DATE");
      const items = await budgetItems(projectId);
      if (!items.some((item) => item.id === input.budgetItemId)) throw new Error("NOT_FOUND");

      return db.transaction(async (tx) => {
        const created = await tx.orm.public.BudgetItemProgress.select("id").create({
          tenantId,
          budgetItemId: input.budgetItemId,
          cutoffDate: bogotaDayInstant(input.cutoffDate),
          executedQuantity: input.executedQuantity,
          note: input.note?.trim() || null,
          authorName: input.authorName,
        });
        let status: string = project.status;
        if (project.status === "APPROVED") {
          const moved = await tx.orm.public.Project.where({ id: projectId, tenantId, status: "APPROVED" })
            .updateAndCount({ status: "IN_EXECUTION" });
          if (moved === 1) status = "IN_EXECUTION";
        }
        return { id: created.id, projectStatus: status };
      });
    },

    /** Elimina un acta (corrección). */
    remove: async (entryId: string): Promise<boolean> =>
      (await db.orm.public.BudgetItemProgress.where({ id: entryId, tenantId }).deleteAndCount()) === 1,

    /** Actas de la obra hasta una fecha (para el valor ganado del informe). */
    entriesUntil: async (projectId: string, untilIsoDay: string) => {
      const items = await budgetItems(projectId);
      if (items.length === 0) return [];
      const entries = await db.orm.public.BudgetItemProgress.where({ tenantId })
        .where((entry) => entry.budgetItemId.in(items.map((item) => item.id)))
        .select("budgetItemId", "cutoffDate", "executedQuantity")
        .all();
      return entries
        .map((entry) => ({
          budgetItemId: entry.budgetItemId,
          cutoffDate: instantToIsoDay(entry.cutoffDate),
          executedQuantity: String(entry.executedQuantity),
        }))
        .filter((entry) => entry.cutoffDate <= untilIsoDay);
    },
  };
}
