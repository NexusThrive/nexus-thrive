/**
 * Planificador Lean (Last Planner System).
 * Extraído de `lib/tenant/db.ts`; `createTenantDb` lo compone. Todo
 * acceso va acotado al `tenantId` recibido.
 */
import {
  db,
} from "@/prisma/db";
import {
  addDays,
  bogotaToday,
  currentWindowStart,
  daysBetween,
  formatPlainDate,
  isoWeekOf,
  relativeWeekNumber,
  WINDOW_WEEKS,
} from "@/lib/construction/lean-engine";
import {
  type CreateCommitmentInput,
  type CreateLookaheadTaskInput,
  type ProjectPlanData,
  type UpdateCommitmentStatusInput,
  bogotaInstantFromIsoDate,
  loadLeanPlan,
  resolveBudgetItemOfProject,
} from "./shared";

export function createPlanDb(tenantId: string) {
  return {
      /** Plan Lean del proyecto (con tareas y compromisos), o null. */
      getPlan: async (projectId: string): Promise<ProjectPlanData | null> => {
        const plan = await db.orm.public.ProjectPlan
          .where({ projectId, tenantId })
          .first();
        return plan ? loadLeanPlan(plan) : null;
      },

      /**
       * Devuelve el plan Lean del proyecto, creándolo si no existe (1:1 vía
       * `projectId @unique`). La ventana se ancla al lunes de la semana
       * operativa actual (America/Bogota). Idempotente ante concurrencia.
       */
      getOrCreatePlan: async (projectId: string): Promise<ProjectPlanData> => {
        const existing = await db.orm.public.ProjectPlan
          .where({ projectId, tenantId })
          .first();
        if (existing) {
          return loadLeanPlan(existing);
        }

        const project = await db.orm.public.Project
          .where({ id: projectId, tenantId })
          .first();
        if (!project) {
          throw new Error("Proyecto no encontrado en este negocio.");
        }

        const windowStart = formatPlainDate(currentWindowStart());
        try {
          const created = await db.orm.public.ProjectPlan.create({
            tenantId,
            projectId,
            name: `Plan Operativo — ${project.name}`,
            windowStartDate: bogotaInstantFromIsoDate(windowStart),
          });
          return loadLeanPlan(created);
        } catch (error) {
          const raced = await db.orm.public.ProjectPlan
            .where({ projectId, tenantId })
            .first();
          if (raced) {
            return loadLeanPlan(raced);
          }
          throw error;
        }
      },

      /**
       * Crea una tarea del Lookahead. La semana relativa se DERIVA de la fecha
       * de inicio respecto al ancla de la ventana (no se confía en el cliente)
       * y se exige que coincida con la semana declarada y caiga en 1..6.
       */
      createLookaheadTask: async (
        projectId: string,
        input: CreateLookaheadTaskInput,
      ): Promise<{ id: string }> => {
        const plan = await db.orm.public.ProjectPlan
          .where({ projectId, tenantId })
          .first();
        if (!plan) {
          throw new Error("Plan no encontrado en este negocio.");
        }

        const startDate = bogotaToday(`${input.startDate}T12:00:00Z`);
        const endDate = bogotaToday(`${input.endDate}T12:00:00Z`);
        const windowStart = bogotaToday(String(plan.windowStartDate));
        const derivedWeek = relativeWeekNumber(windowStart, startDate);
        if (derivedWeek !== input.weekNumber) {
          throw new Error(
            "Las fechas no corresponden a la semana de la ventana indicada.",
          );
        }
        if (derivedWeek < 1 || derivedWeek > WINDOW_WEEKS) {
          throw new Error(
            `La semana debe estar entre 1 y ${WINDOW_WEEKS}.`,
          );
        }
        if (daysBetween(startDate, endDate) < 0) {
          throw new Error("La fecha de fin no puede ser anterior a la de inicio.");
        }

        const budgetItemId = await resolveBudgetItemOfProject(tenantId, projectId, input.budgetItemId);
        const created = await db.orm.public.LookaheadTask.create({
          tenantId,
          planId: plan.id,
          budgetItemId,
          code: input.code,
          description: input.description,
          weekNumber: derivedWeek,
          startDate: bogotaInstantFromIsoDate(input.startDate),
          endDate: bogotaInstantFromIsoDate(input.endDate),
          responsible: input.responsible,
          isRestricted: input.isRestricted,
          notes: input.notes ?? null,
        });
        return { id: created.id };
      },

      /**
       * Crea un compromiso semanal. La semana calendario ISO y su año se
       * DERIVAN de `weekStartDate` en el servidor; el estado inicial es
       * PENDING y sin datos de fallo.
       */
      createCommitment: async (
        projectId: string,
        input: CreateCommitmentInput,
      ): Promise<{ id: string }> => {
        const plan = await db.orm.public.ProjectPlan
          .where({ projectId, tenantId })
          .first();
        if (!plan) {
          throw new Error("Plan no encontrado en este negocio.");
        }

        const weekStart = bogotaToday(`${input.weekStartDate}T12:00:00Z`);
        const { year, week } = isoWeekOf(weekStart);

        const budgetItemId = await resolveBudgetItemOfProject(tenantId, projectId, input.budgetItemId);
        const created = await db.orm.public.WeeklyCommitment.create({
          tenantId,
          planId: plan.id,
          budgetItemId,
          weekNumber: week,
          year,
          description: input.description,
          responsible: input.responsible,
          status: "PENDING",
          failureCause: null,
          failureNotes: null,
        });
        return { id: created.id };
      },

      /**
       * Cambia el resultado de un compromiso. Si pasa a FAILED se admite causa
       * CNC (y notas); en cualquier otro estado se limpian los datos de fallo
       * para no dejar información obsoleta.
       */
      updateCommitmentStatus: async (
        projectId: string,
        commitmentId: string,
        input: UpdateCommitmentStatusInput,
      ): Promise<void> => {
        const plan = await db.orm.public.ProjectPlan
          .where({ projectId, tenantId })
          .select("id")
          .first();
        if (!plan) {
          throw new Error("Plan no encontrado en este negocio.");
        }
        const commitment = await db.orm.public.WeeklyCommitment
          .where({ id: commitmentId, planId: plan.id })
          .first();
        if (!commitment) {
          throw new Error("Compromiso no encontrado en este plan.");
        }

        const isFailed = input.status === "FAILED";
        await db.orm.public.WeeklyCommitment
          .where({ id: commitment.id })
          .update({
            status: input.status,
            failureCause: input.status === "FAILED" ? (input.failureCause ?? null) : null,
            failureNotes: input.status === "FAILED" ? (input.failureNotes ?? null) : null,
          });
        void isFailed;
      },

      /**
       * Desplaza la ventana operativa `deltaWeeks` semanas (positivo = futuro)
       * y recalcula la semana relativa de cada tarea desde su fecha real.
       * Permite que la planificación avance sin quedar "congelada".
       */
      advanceWindow: async (
        projectId: string,
        deltaWeeks: number,
      ): Promise<void> => {
        const plan = await db.orm.public.ProjectPlan
          .where({ projectId, tenantId })
          .first();
        if (!plan) {
          throw new Error("Plan no encontrado en este negocio.");
        }
        if (!Number.isInteger(deltaWeeks) || deltaWeeks === 0) {
          return;
        }

        const currentStart = bogotaToday(String(plan.windowStartDate));
        const newStart = addDays(currentStart, deltaWeeks * 7);

        await db.transaction(async (tx) => {
          await tx.orm.public.ProjectPlan.where({ id: plan.id }).update({
            windowStartDate: bogotaInstantFromIsoDate(formatPlainDate(newStart)),
          });
          const tasks = await tx.orm.public.LookaheadTask
            .where({ planId: plan.id })
            .all();
          for (const task of tasks) {
            const taskStart = bogotaToday(String(task.startDate));
            await tx.orm.public.LookaheadTask
              .where({ id: task.id })
              .update({ weekNumber: relativeWeekNumber(newStart, taskStart) });
          }
        });
      },
  };
}
