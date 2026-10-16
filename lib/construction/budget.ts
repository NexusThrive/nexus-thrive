/**
 * Presupuesto de obra: capítulos, partidas, recursos, AIU, bloqueo y línea base.
 * Extraído de `lib/tenant-db.ts`; `createTenantDb` lo compone. Todo
 * acceso va acotado al `tenantId` recibido.
 */
import {
  db,
} from "@/prisma/db";
import {
  formatDateTime,
} from "@/lib/format";
import {
  AIU_DEFAULTS,
  apuItemCategoryToResourceType,
  calculateBudgetTotals,
  calculateItemTotal,
  currentYearBogota,
  decimalToMicro,
  resourceLineCostMicro,
  type ResourceTypeValue,
} from "@/lib/apu-engine";
import {
  isUnchangedAiu,
  isUnchangedChapter,
  isUnchangedItem,
} from "@/lib/budget-guards";
import {
  type AiuConfigInput,
  type BudgetBaselineData,
  type BudgetTotalsCheck,
  type CreateBudgetItemInput,
  type CreateChapterInput,
  type ImportCompositionRow,
  type ProjectBudgetData,
  type UpdateBudgetItemInput,
  type UpdateChapterInput,
  assertRevision,
  bumpRevision,
  loadBudgetTree,
  lockRevision,
  recalcBudgetTotals,
  sumBudgetDirect,
} from "./shared";

export function createBudgetsDb(tenantId: string) {
  return {
      /** Presupuesto del proyecto (con árbol completo) o `null` si no existe. */
      get: async (projectId: string): Promise<ProjectBudgetData | null> => {
        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        return budget ? loadBudgetTree(budget) : null;
      },

      /**
       * Devuelve el presupuesto del proyecto creándolo si no existe (1:1 con
       * Project). Idempotente ante concurrencia: si otro request lo creó
       * primero, la restricción única por `projectId` aborta el INSERT y se
       * relee la fila ganadora.
       */
      getOrCreate: async (projectId: string): Promise<ProjectBudgetData> => {
        const existing = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        if (existing) {
          return loadBudgetTree(existing);
        }

        const project = await db.orm.public.Project
          .where({ id: projectId, tenantId })
          .first();
        if (!project) {
          throw new Error("Proyecto no encontrado en este negocio.");
        }

        const prefix = `PRES-${currentYearBogota()}-`;
        const sequenceFrom = (code?: string | null): number => {
          if (!code || !code.startsWith(prefix)) {
            return 0;
          }
          const digits = Number(code.slice(prefix.length));
          return Number.isFinite(digits) ? digits : 0;
        };

        // El código humano PRES-AAAA-NNN es único en TODO el tenant: Quote y
        // ProjectBudget comparten la numeración (etapa 1, ajuste F). Se toma el
        // máximo de ambas tablas y se reintenta si una carrera lo ocupa.
        let lastError: unknown = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          const [latestBudget, latestQuote] = await Promise.all([
            db.orm.public.ProjectBudget
              .where({ tenantId })
              .where((budget) => budget.code.like(`${prefix}%`))
              .orderBy((budget) => budget.code.desc())
              .first(),
            db.orm.public.Quote
              .where({ tenantId })
              .where((quote) => quote.code.like(`${prefix}%`))
              .orderBy((quote) => quote.code.desc())
              .first(),
          ]);
          const sequence =
            Math.max(
              sequenceFrom(latestBudget?.code),
              sequenceFrom(latestQuote?.code),
            ) + 1;
          const code = `${prefix}${String(sequence).padStart(3, "0")}`;
          try {
            const created = await db.orm.public.ProjectBudget.create({
              tenantId,
              projectId,
              code,
              name: `Presupuesto — ${project.name}`,
              aiuAdminPct: AIU_DEFAULTS.adminPct,
              aiuImprevPct: AIU_DEFAULTS.imprevPct,
              aiuUtilidadPct: AIU_DEFAULTS.utilidadPct,
              ivaUtilidadPct: AIU_DEFAULTS.ivaUtilidadPct,
            });
            return loadBudgetTree(created);
          } catch (error) {
            lastError = error;
            const raced = await db.orm.public.ProjectBudget
              .where({ projectId, tenantId })
              .first();
            if (raced) {
              return loadBudgetTree(raced);
            }
          }
        }
        throw lastError ?? new Error("No se pudo crear el presupuesto.");
      },

      /** Crea un capítulo al final del presupuesto. Rechaza si está bloqueado. */
      createChapter: async (
        projectId: string,
        input: CreateChapterInput,
        expectedRevision?: number,
      ): Promise<{ id: string }> => {
        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        if (!budget) {
          throw new Error("Presupuesto no encontrado en este negocio.");
        }
        if (budget.isLocked) {
          throw new Error("El presupuesto está bloqueado.");
        }
        assertRevision(budget, expectedRevision);
        const chapter = await db.transaction(async (tx) => {
          const last = await tx.orm.public.BudgetChapter
            .where({ budgetId: budget.id })
            .orderBy((chapter) => chapter.order.desc())
            .first();
          const order = last ? last.order + 1 : 1;
          const created = await tx.orm.public.BudgetChapter.create({
            tenantId,
            budgetId: budget.id,
            order,
            name: input.name,
            description: input.description ?? null,
          });
          await bumpRevision(tx, budget);
          return created;
        });
        return { id: chapter.id };
      },

      /**
       * Crea una partida bajo un capítulo y recalcula los totales del
       * presupuesto en la misma transacción. El costo total lo computa el
       * servidor (nunca se confía en el cliente).
       */
      createItem: async (
        projectId: string,
        input: CreateBudgetItemInput,
        expectedRevision?: number,
      ): Promise<{ id: string }> => {
        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        if (!budget) {
          throw new Error("Presupuesto no encontrado en este negocio.");
        }
        if (budget.isLocked) {
          throw new Error("El presupuesto está bloqueado.");
        }
        assertRevision(budget, expectedRevision);
        const chapter = await db.orm.public.BudgetChapter
          .where({ id: input.chapterId, budgetId: budget.id })
          .select("id")
          .first();
        if (!chapter) {
          throw new Error("Capítulo no encontrado en este presupuesto.");
        }

        const totalCostDirect = calculateItemTotal(
          input.quantity,
          input.unitCostDirect,
        );

        const created = await db.transaction(async (tx) => {
          const last = await tx.orm.public.BudgetItem
            .where({ chapterId: input.chapterId })
            .orderBy((item) => item.order.desc())
            .first();
          const order = last ? last.order + 1 : 1;
          const item = await tx.orm.public.BudgetItem.create({
            tenantId,
            chapterId: input.chapterId,
            order,
            code: input.code,
            description: input.description,
            unit: input.unit,
            quantity: input.quantity,
            unitCostDirect: input.unitCostDirect,
            totalCostDirect,
          });
          await recalcBudgetTotals(tx, budget.id, {
            admin: budget.aiuAdminPct,
            imprev: budget.aiuImprevPct,
            utilidad: budget.aiuUtilidadPct,
            iva: budget.ivaUtilidadPct,
          });
          await bumpRevision(tx, budget);
          return item;
        });
        return { id: created.id };
      },

      /**
       * Importa una actividad de la Biblioteca Maestra APU (`ApuActivity`)
       * como una NUEVA partida (`BudgetItem`) del presupuesto del proyecto,
       * con sus recursos congelados como snapshot inmutable.
       *
       * Congelado de precios: se COPIAN nombre, unidad, rendimiento, precio y
       * desperdicio de cada insumo, más el costo unitario resultante. La
       * partida NO depende del catálogo: si la actividad o sus insumos cambian
       * después, la partida importada no se altera. La trazabilidad se conserva
       * con `sourceActivityId` / `sourceItemId`.
       *
       * Aritmética de punto fijo `BigInt` (6 decimales), idéntica al motor y a
       * `updateResource`:
       *   totalPrice_línea = performance × (SCALE + wastePct) × unitPrice / SCALE²
       * con redondeo half-up y `wastePct` como fracción (1_000_000 = 100 %).
       * El desperdicio del catálogo es un porcentaje (10 = 10 %) y se convierte
       * a la fracción almacenada dividiendo por 100.
       */
      importActivityFromCatalog: async (
        projectId: string,
        chapterId: string,
        activityId: string,
        quantity: bigint = BigInt(1_000_000),
        expectedRevision?: number,
      ): Promise<{ id: string }> => {
        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        if (!budget) {
          throw new Error("Presupuesto no encontrado en este negocio.");
        }
        if (budget.isLocked) {
          throw new Error("El presupuesto está bloqueado.");
        }
        assertRevision(budget, expectedRevision);

        const chapter = await db.orm.public.BudgetChapter
          .where({ id: chapterId, budgetId: budget.id })
          .select("id")
          .first();
        if (!chapter) {
          throw new Error("Capítulo no encontrado en este presupuesto.");
        }

        const activity = await db.orm.public.ApuActivity
          .where({ id: activityId, tenantId })
          .first();
        if (!activity) {
          throw new Error("Actividad del catálogo no encontrada.");
        }

        const compositions = (await db.orm.public.ApuActivityComposition
          .where({ activityId })
          .include("item", (item) =>
            item.select(
              "id",
              "tenantId",
              "name",
              "unit",
              "category",
              "unitPrice",
              "imageUrl",
            ),
          )
          .all()) as unknown as ImportCompositionRow[];

        if (compositions.length === 0) {
          throw new Error("La actividad no tiene composición APU para importar.");
        }

        const resources: {
          type: ResourceTypeValue;
          name: string;
          unit: string;
          performance: bigint;
          unitPrice: bigint;
          totalPrice: bigint;
          wastePct: bigint;
          imageUrl: string | null;
          sourceItemId: string;
        }[] = [];
        let unitCostDirect = BigInt(0);

        for (const composition of compositions) {
          const item = composition.item;
          // Defensa en profundidad: un insumo de otro tenant jamás entra.
          if (!item || item.tenantId !== tenantId) {
            continue;
          }
          const unitPrice = decimalToMicro(String(item.unitPrice));
          const performance = decimalToMicro(String(composition.consumption));
          const wastePercentMicro = decimalToMicro(
            String(composition.wastePercent),
          );
          if (
            unitPrice === null ||
            performance === null ||
            wastePercentMicro === null
          ) {
            throw new Error(`Insumo con valores decimales inválidos: ${item.name}.`);
          }
          // Porcentaje del catálogo (10 = 10 %) → fracción almacenada (100_000 = 10 %).
          const wastePct = wastePercentMicro / BigInt(100);
          const lineCost = resourceLineCostMicro({
            performance,
            wastePct,
            unitPrice,
          });
          unitCostDirect += lineCost;
          resources.push({
            type: apuItemCategoryToResourceType(item.category),
            name: item.name,
            unit: item.unit,
            performance,
            unitPrice,
            totalPrice: lineCost,
            wastePct,
            imageUrl: item.imageUrl ?? null,
            sourceItemId: item.id,
          });
        }

        if (resources.length === 0) {
          throw new Error("La actividad no tiene insumos válidos para importar.");
        }

        const totalCostDirect = calculateItemTotal(quantity, unitCostDirect);

        const created = await db.transaction(async (tx) => {
          const last = await tx.orm.public.BudgetItem
            .where({ chapterId })
            .orderBy((item) => item.order.desc())
            .first();
          const order = last ? last.order + 1 : 1;
          const item = await tx.orm.public.BudgetItem.create({
            tenantId,
            chapterId,
            order,
            code: activity.code ?? activity.name,
            description: activity.name,
            unit: activity.unit,
            quantity,
            unitCostDirect,
            totalCostDirect,
            sourceActivityId: activity.id,
          });
          for (const resource of resources) {
            await tx.orm.public.BudgetItemResource.create({
              tenantId,
              itemId: item.id,
              type: resource.type,
              name: resource.name,
              unit: resource.unit,
              performance: resource.performance,
              unitPrice: resource.unitPrice,
              totalPrice: resource.totalPrice,
              imageUrl: resource.imageUrl,
              wastePct: resource.wastePct,
              sourceItemId: resource.sourceItemId,
            });
          }
          await recalcBudgetTotals(tx, budget.id, {
            admin: budget.aiuAdminPct,
            imprev: budget.aiuImprevPct,
            utilidad: budget.aiuUtilidadPct,
            iva: budget.ivaUtilidadPct,
          });
          await bumpRevision(tx, budget);
          return item;
        });
        return { id: created.id };
      },

      /**
       * Actualiza la configuración AIU y recalcula toda la cascada en la
       * misma transacción.
       */
      updateAiu: async (
        projectId: string,
        config: AiuConfigInput,
        expectedRevision?: number,
      ): Promise<void> => {
        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        if (!budget) {
          throw new Error("Presupuesto no encontrado en este negocio.");
        }
        if (budget.isLocked) {
          throw new Error("El presupuesto está bloqueado.");
        }
        assertRevision(budget, expectedRevision);
        // Sin cambios: no se escribe ni se avanza la revisión.
        if (isUnchangedAiu(budget, config)) {
          return;
        }
        await db.transaction(async (tx) => {
          await bumpRevision(tx, budget, {
            aiuAdminPct: config.adminPct,
            aiuImprevPct: config.imprevPct,
            aiuUtilidadPct: config.utilidadPct,
            ivaUtilidadPct: config.ivaUtilidadPct,
          });
          await recalcBudgetTotals(tx, budget.id, {
            admin: config.adminPct,
            imprev: config.imprevPct,
            utilidad: config.utilidadPct,
            iva: config.ivaUtilidadPct,
          });
        });
      },

      /** Bloquea / desbloquea el presupuesto (impide crear capítulos/ítems). */
      setLocked: async (
        projectId: string,
        isLocked: boolean,
        expectedRevision?: number,
        reason?: string,
        userId?: string,
      ): Promise<void> => {
        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        if (!budget) {
          throw new Error("Presupuesto no encontrado en este negocio.");
        }
        if (!isLocked && (reason === undefined || reason.trim() === "")) {
          throw new Error("Desbloqueo requiere un motivo.");
        }
        assertRevision(budget, expectedRevision);
        const action = isLocked ? "LOCK" : "UNLOCK";
        await db.transaction(async (tx) => {
          await bumpRevision(tx, budget, { isLocked });
          await tx.orm.public.BudgetLockEvent.create({
            tenantId,
            budgetId: budget.id,
            action,
            reason: reason?.trim() || null,
            userId: userId ?? "system",
          });
        });
      },

      /**
       * Elimina un capítulo (y sus partidas, en cascada). Rechaza si el
       * presupuesto está bloqueado. Recalcula los totales en la transacción.
       */
      deleteChapter: async (
        projectId: string,
        chapterId: string,
        expectedRevision?: number,
      ): Promise<void> => {
        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        if (!budget) {
          throw new Error("Presupuesto no encontrado en este negocio.");
        }
        if (budget.isLocked) {
          throw new Error("El presupuesto está bloqueado.");
        }
        assertRevision(budget, expectedRevision);
        const chapter = await db.orm.public.BudgetChapter
          .where({ id: chapterId, budgetId: budget.id })
          .select("id")
          .first();
        if (!chapter) {
          throw new Error("Capítulo no encontrado en este presupuesto.");
        }
        await db.transaction(async (tx) => {
          await tx.orm.public.BudgetChapter
            .where({ id: chapterId, budgetId: budget.id })
            .delete();
          await recalcBudgetTotals(tx, budget.id, {
            admin: budget.aiuAdminPct,
            imprev: budget.aiuImprevPct,
            utilidad: budget.aiuUtilidadPct,
            iva: budget.ivaUtilidadPct,
          });
          await bumpRevision(tx, budget);
        });
      },

      /**
       * Elimina una partida (y sus recursos, en cascada). Valida pertenencia
       * capítulo→presupuesto. Rechaza si el presupuesto está bloqueado.
       */
      deleteItem: async (
        projectId: string,
        itemId: string,
        expectedRevision?: number,
      ): Promise<void> => {
        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        if (!budget) {
          throw new Error("Presupuesto no encontrado en este negocio.");
        }
        if (budget.isLocked) {
          throw new Error("El presupuesto está bloqueado.");
        }
        assertRevision(budget, expectedRevision);
        const item = await db.orm.public.BudgetItem
          .where({ id: itemId, tenantId })
          .first();
        if (!item) {
          throw new Error("Partida no encontrada en este presupuesto.");
        }
        const chapter = await db.orm.public.BudgetChapter
          .where({ id: item.chapterId, budgetId: budget.id })
          .select("id")
          .first();
        if (!chapter) {
          throw new Error("Partida no encontrada en este presupuesto.");
        }
        await db.transaction(async (tx) => {
          await tx.orm.public.BudgetItem
            .where({ id: itemId, tenantId })
            .delete();
          await recalcBudgetTotals(tx, budget.id, {
            admin: budget.aiuAdminPct,
            imprev: budget.aiuImprevPct,
            utilidad: budget.aiuUtilidadPct,
            iva: budget.ivaUtilidadPct,
          });
          await bumpRevision(tx, budget);
        });
      },

      /**
       * Renombra o re-describe un capítulo. Valida capítulo→presupuesto,
       * rechaza si está bloqueado y avanza la revisión del presupuesto.
       */
      updateChapter: async (
        projectId: string,
        chapterId: string,
        input: UpdateChapterInput,
        expectedRevision?: number,
      ): Promise<void> => {
        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        if (!budget) {
          throw new Error("Presupuesto no encontrado en este negocio.");
        }
        if (budget.isLocked) {
          throw new Error("El presupuesto está bloqueado.");
        }
        assertRevision(budget, expectedRevision);
        const chapter = await db.orm.public.BudgetChapter
          .where({ id: chapterId, budgetId: budget.id })
          .select("id", "name", "description")
          .first();
        if (!chapter) {
          throw new Error("Capítulo no encontrado en este presupuesto.");
        }
        // Sin cambios: no se escribe ni se avanza la revisión.
        if (isUnchangedChapter(chapter, input)) {
          return;
        }
        await db.transaction(async (tx) => {
          await tx.orm.public.BudgetChapter
            .where({ id: chapterId, budgetId: budget.id })
            .update({
              name: input.name,
              description: input.description ?? null,
            });
          await bumpRevision(tx, budget);
        });
      },

      /**
       * Edita una partida: el servidor recalcula su total directo y toda la
       * cascada AIU en la misma transacción. Valida pertenencia
       * partida→capítulo→presupuesto. Rechaza si está bloqueado.
       */
      updateItem: async (
        projectId: string,
        itemId: string,
        input: UpdateBudgetItemInput,
        expectedRevision?: number,
      ): Promise<void> => {
        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        if (!budget) {
          throw new Error("Presupuesto no encontrado en este negocio.");
        }
        if (budget.isLocked) {
          throw new Error("El presupuesto está bloqueado.");
        }
        assertRevision(budget, expectedRevision);
        const item = await db.orm.public.BudgetItem
          .where({ id: itemId, tenantId })
          .first();
        if (!item) {
          throw new Error("Partida no encontrada en este presupuesto.");
        }
        const chapter = await db.orm.public.BudgetChapter
          .where({ id: item.chapterId, budgetId: budget.id })
          .select("id")
          .first();
        if (!chapter) {
          throw new Error("Partida no encontrada en este presupuesto.");
        }
        // Sin cambios: no se escribe ni se avanza la revisión.
        if (isUnchangedItem(item, input)) {
          return;
        }
        const totalCostDirect = calculateItemTotal(
          input.quantity,
          input.unitCostDirect,
        );
        await db.transaction(async (tx) => {
          await tx.orm.public.BudgetItem
            .where({ id: itemId, tenantId })
            .update({
              code: input.code,
              description: input.description,
              unit: input.unit,
              quantity: input.quantity,
              unitCostDirect: input.unitCostDirect,
              totalCostDirect,
            });
          await recalcBudgetTotals(tx, budget.id, {
            admin: budget.aiuAdminPct,
            imprev: budget.aiuImprevPct,
            utilidad: budget.aiuUtilidadPct,
            iva: budget.ivaUtilidadPct,
          });
          await bumpRevision(tx, budget);
        });
      },

      /**
       * Auditoría de integridad (solo lectura): recalcula la cascada AIU
       * desde las partidas reales y la compara con los totales persistidos.
       * No escribe nada; sirve para detectar deriva de datos (Etapa 1).
       */
      verifyTotals: async (projectId: string): Promise<BudgetTotalsCheck> => {
        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        if (!budget) {
          throw new Error("Presupuesto no encontrado en este negocio.");
        }
        const direct = await sumBudgetDirect(db, budget.id);
        const computed = calculateBudgetTotals(
          direct,
          budget.aiuAdminPct,
          budget.aiuImprevPct,
          budget.aiuUtilidadPct,
          budget.ivaUtilidadPct,
        );
        const pairs: Array<{
          field: string;
          expected: bigint;
          found: bigint;
        }> = [
          {
            field: "directCostTotal",
            expected: direct,
            found: budget.directCostTotal,
          },
          {
            field: "adminTotal",
            expected: computed.adminTotal,
            found: budget.adminTotal,
          },
          {
            field: "imprevTotal",
            expected: computed.imprevTotal,
            found: budget.imprevTotal,
          },
          {
            field: "utilidadTotal",
            expected: computed.utilidadTotal,
            found: budget.utilidadTotal,
          },
          {
            field: "ivaUtilidadTotal",
            expected: computed.ivaUtilidadTotal,
            found: budget.ivaUtilidadTotal,
          },
          {
            field: "grandTotal",
            expected: computed.grandTotal,
            found: budget.grandTotal,
          },
        ];
        const mismatches = pairs
          .filter((pair) => pair.expected !== pair.found)
          .map((pair) => ({
            field: pair.field,
            expected: pair.expected.toString(),
            found: pair.found.toString(),
          }));
        return {
          ok: mismatches.length === 0,
          directCostTotal: direct.toString(),
          grandTotal: computed.grandTotal.toString(),
          mismatches,
        };
      },

      /** Líneas base aprobadas del presupuesto, de la más reciente a la más vieja. */
      listBaselines: async (
        projectId: string,
      ): Promise<BudgetBaselineData[]> => {
        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        if (!budget) {
          return [];
        }
        const rows = await db.orm.public.BudgetBaseline
          .where({ budgetId: budget.id, tenantId })
          .orderBy((baseline) => baseline.version.desc())
          .all();
        return rows.map((row) => ({
          id: row.id,
          version: row.version,
          budgetRevision: row.budgetRevision,
          directCostTotal: row.directCostTotal.toString(),
          adminTotal: row.adminTotal.toString(),
          imprevTotal: row.imprevTotal.toString(),
          utilidadTotal: row.utilidadTotal.toString(),
          ivaUtilidadTotal: row.ivaUtilidadTotal.toString(),
          grandTotal: row.grandTotal.toString(),
          chapterCount: row.chapterCount,
          itemCount: row.itemCount,
          note: row.note,
          approvedById: row.approvedById,
          approvedByName: row.approvedByName,
          createdAt: formatDateTime(row.createdAt),
        }));
      },

      /**
       * Aprueba una línea base: congela la revisión, los totales recalculados y
       * los conteos actuales del presupuesto. Permitido aunque esté bloqueado
       * (aprobar no muta el contenido); el rol D7 lo exige la action.
       */
      approveBaseline: async (
        projectId: string,
        input: { userId: string; userName: string; note?: string },
      ): Promise<{ id: string; version: number }> => {
        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        if (!budget) {
          throw new Error("Presupuesto no encontrado en este negocio.");
        }
        const created = await db.transaction(async (tx) => {
          await lockRevision(tx, budget);
          const direct = await sumBudgetDirect(tx, budget.id);
          const totals = calculateBudgetTotals(
            direct,
            budget.aiuAdminPct,
            budget.aiuImprevPct,
            budget.aiuUtilidadPct,
            budget.ivaUtilidadPct,
          );
          const chapters = await tx.orm.public.BudgetChapter
            .where({ budgetId: budget.id })
            .orderBy((chapter) => chapter.order.asc())
            .select("id", "order", "name")
            .all();
          const chapterIds = chapters.map((chapter) => chapter.id);
          const items = chapterIds.length
            ? await tx.orm.public.BudgetItem
                .where((item) => item.chapterId.in(chapterIds))
                .select("chapterId", "totalCostDirect")
                .all()
            : [];
          const subtotalByChapter = new Map<string, bigint>();
          for (const item of items) {
            subtotalByChapter.set(
              item.chapterId,
              (subtotalByChapter.get(item.chapterId) ?? BigInt(0)) +
                BigInt(item.totalCostDirect),
            );
          }
          const snapshot = chapters.map((chapter) => ({
            order: chapter.order,
            name: chapter.name,
            subtotal: (
              subtotalByChapter.get(chapter.id) ?? BigInt(0)
            ).toString(),
          }));
          const last = await tx.orm.public.BudgetBaseline
            .where({ budgetId: budget.id })
            .orderBy((baseline) => baseline.version.desc())
            .first();
          const version = last ? last.version + 1 : 1;
          const baseline = await tx.orm.public.BudgetBaseline.create({
            tenantId,
            budgetId: budget.id,
            budgetRevision: budget.revision,
            version,
            directCostTotal: direct,
            adminTotal: totals.adminTotal,
            imprevTotal: totals.imprevTotal,
            utilidadTotal: totals.utilidadTotal,
            ivaUtilidadTotal: totals.ivaUtilidadTotal,
            grandTotal: totals.grandTotal,
            chapterCount: chapters.length,
            itemCount: items.length,
            snapshot: snapshot as never,
            note: input.note?.trim() ? input.note.trim() : null,
            approvedById: input.userId,
            approvedByName: input.userName,
          });
          return baseline;
        });
        return { id: created.id, version: created.version };
      },
      /**
       * Actualiza un recurso de una partida: rendimiento (`performance`) y/o
       * porcentaje de desperdicio (`wastePct`, fracción en micro). Valida la
       * pertenencia proyecto → capítulo → partida → recurso y rechaza si el
       * presupuesto está bloqueado (concurrencia optimista vía `expectedRevision`).
       *
       * Recalcula en la misma transacción el `totalPrice` de cada línea, el
       * costo unitario directo de la partida (Σ de líneas) y el total
       * (`quantity × unitCostDirect`), más la cascada AIU. Devuelve la nueva
       * revisión para encadenar ediciones sin caer en `STALE_REVISION`.
       */
      updateResource: async (
        projectId: string,
        resourceId: string,
        updates: { performance?: bigint | string; wastePct?: bigint | string },
        expectedRevision?: number,
      ): Promise<{ revision: number }> => {
        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        if (!budget) {
          throw new Error("Presupuesto no encontrado en este negocio.");
        }
        if (budget.isLocked) {
          throw new Error("El presupuesto está bloqueado.");
        }
        assertRevision(budget, expectedRevision);

        const resource = await db.orm.public.BudgetItemResource
          .where({ id: resourceId, tenantId })
          .first();
        if (!resource) {
          throw new Error("Recurso no encontrado en este negocio.");
        }

        const item = await db.orm.public.BudgetItem
          .where({ id: resource.itemId, tenantId })
          .first();
        if (!item) {
          throw new Error("Partida no encontrada en este negocio.");
        }
        if (item.chapterId) {
          const chapter = await db.orm.public.BudgetChapter
            .where({ id: item.chapterId, budgetId: budget.id })
            .select("id")
            .first();
          if (!chapter) {
            throw new Error("Partida no encontrada en este presupuesto.");
          }
        }

        const updateData: { performance?: bigint; wastePct?: bigint } = {};
        if (updates.performance !== undefined) {
          const performance =
            typeof updates.performance === "bigint"
              ? updates.performance
              : BigInt(updates.performance);
          if (performance <= BigInt(0)) {
            throw new Error("El rendimiento debe ser mayor a cero.");
          }
          updateData.performance = performance;
        }
        if (updates.wastePct !== undefined) {
          const wastePct =
            typeof updates.wastePct === "bigint"
              ? updates.wastePct
              : BigInt(updates.wastePct);
          if (wastePct < BigInt(0)) {
            throw new Error("El desperdicio no puede ser negativo.");
          }
          // Mismo tope que el validador de la action (WASTE_PCT_MAX = 100 %);
          // la capa de datos no confía en que todo llamador valide.
          if (wastePct > BigInt(1_000_000)) {
            throw new Error("El desperdicio no puede superar el 100 %.");
          }
          updateData.wastePct = wastePct;
        }

        const revision = await db.transaction(async (tx) => {
          if (Object.keys(updateData).length > 0) {
            await tx.orm.public.BudgetItemResource
              .where({ id: resourceId, tenantId })
              .update(updateData);
          }

          // Se recalculan TODAS las líneas del ítem: el `totalPrice` de cada
          // una se refresca (para que la vista previa del APU no quede
          // desincronizada) y el costo unitario directo de la partida es la
          // Σ de las líneas, con la aritmética de punto fijo del proyecto.
          const allResources = await tx.orm.public.BudgetItemResource
            .where({ itemId: resource.itemId, tenantId })
            .all();

          let unitCostDirect = BigInt(0);
          for (const res of allResources) {
            const lineCost = resourceLineCostMicro({
              performance: res.performance,
              wastePct: res.wastePct,
              unitPrice: res.unitPrice,
            });
            unitCostDirect += lineCost;
            if (BigInt(res.totalPrice) !== lineCost) {
              await tx.orm.public.BudgetItemResource
                .where({ id: res.id, tenantId })
                .update({ totalPrice: lineCost });
            }
          }

          // Costo directo total de la partida = quantity × unitCostDirect.
          const totalCostDirect = calculateItemTotal(
            item.quantity,
            unitCostDirect,
          );

          await tx.orm.public.BudgetItem
            .where({ id: item.id, tenantId })
            .update({ unitCostDirect, totalCostDirect });

          await recalcBudgetTotals(tx, budget.id, {
            admin: budget.aiuAdminPct,
            imprev: budget.aiuImprevPct,
            utilidad: budget.aiuUtilidadPct,
            iva: budget.ivaUtilidadPct,
          });
          return bumpRevision(tx, budget);
        });

        return { revision };
      },


  };
}
