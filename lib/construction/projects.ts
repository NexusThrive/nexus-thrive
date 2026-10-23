/**
 * Obras (proyectos) y su ciclo de vida.
 * Extraído de `lib/tenant/db.ts`; `createTenantDb` lo compone. Todo
 * acceso va acotado al `tenantId` recibido.
 */
import {
  or,
} from "@prisma/orm-postgres/orm-client";
import {
  db,
} from "@/prisma/db";
import {
  currentYearBogota,
} from "@/lib/construction/apu-engine";
import {
  canTransitionProjectStatus,
  type ProjectStatusValue,
} from "@/lib/construction/project-domain";
import {
  type ProjectDetail,
  type ProjectListInput,
  type ProjectMetrics,
  type ProjectRow,
  type UpdateProjectInput,
  escapeLike,
  serializeProjectHeader,
} from "./shared";

export function createProjectsDb(tenantId: string) {
  return {
      list: async ({
        q,
        status,
        page = 1,
        limit = 10,
      }: ProjectListInput = {}): Promise<{ rows: ProjectRow[]; total: number }> => {
        const text = (q ?? "").trim();
        const pattern = text ? `%${escapeLike(text)}%` : null;
        const safePage = Math.max(1, Math.trunc(page));
        const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit)));

        let filtered = db.orm.public.Project.where({ tenantId });
        if (text) {
          filtered = filtered.where((project) =>
            or(project.code.ilike(pattern!), project.name.ilike(pattern!)),
          );
        }
        if (status) {
          filtered = filtered.where((project) => project.status.eq(status));
        }

        const [rows, { total }] = await Promise.all([
          filtered
            .orderBy((project) => project.createdAt.desc())
            .limit(safeLimit)
            .offset((safePage - 1) * safeLimit)
            .all(),
          filtered.aggregate((aggregate) => ({ total: aggregate.count() })),
        ]);

        const customerIds = [...new Set(rows.map((row) => row.customerId))];
        const customers =
          customerIds.length === 0
            ? []
            : await db.orm.public.Customer
                .where({ tenantId })
                .where((customer) => customer.id.in(customerIds))
                .all();
        const customerById = new Map(
          customers.map((customer) => [customer.id, customer]),
        );

        return {
          rows: rows.map((row) => ({
            id: row.id,
            code: row.code,
            name: row.name,
            description: row.description,
            customerId: row.customerId,
            customerName:
              customerById.get(row.customerId)?.name ?? "Cliente eliminado",
            status: row.status as ProjectStatusValue,
            createdAt: String(row.createdAt),
            updatedAt: String(row.updatedAt),
          })),
          total,
        };
      },

      /** Métricas de portada (datos reales, no mock). */
      getMetrics: async (): Promise<ProjectMetrics> => {
        const [totalAgg, inExecutionAgg, approvedAgg, completedAgg] =
          await Promise.all([
            db.orm.public.Project
              .where({ tenantId })
              .aggregate((aggregate) => ({ total: aggregate.count() })),
            db.orm.public.Project
              .where({ tenantId })
              .where((project) => project.status.eq("IN_EXECUTION"))
              .aggregate((aggregate) => ({ total: aggregate.count() })),
            db.orm.public.Project
              .where({ tenantId })
              .where((project) => project.status.eq("APPROVED"))
              .aggregate((aggregate) => ({ total: aggregate.count() })),
            db.orm.public.Project
              .where({ tenantId })
              .where((project) => project.status.eq("COMPLETED"))
              .aggregate((aggregate) => ({ total: aggregate.count() })),
          ]);

        return {
          total: totalAgg.total,
          inExecution: inExecutionAgg.total,
          approved: approvedAgg.total,
          completed: completedAgg.total,
        };
      },

      /** Detalle completo: proyecto + ficha (ProjectHeader). */
      get: async (id: string): Promise<ProjectDetail | null> => {
        const project = await db.orm.public.Project
          .where({ id, tenantId })
          .first();
        if (!project) {
          return null;
        }

        const [header, customer] = await Promise.all([
          db.orm.public.ProjectHeader.where({ projectId: id }).first(),
          db.orm.public.Customer
            .where({ id: project.customerId, tenantId })
            .select("name")
            .first(),
        ]);

        return {
          id: project.id,
          code: project.code,
          name: project.name,
          description: project.description,
          customerId: project.customerId,
          customerName: customer?.name ?? "Cliente eliminado",
          status: project.status as ProjectStatusValue,
          createdAt: String(project.createdAt),
          updatedAt: String(project.updatedAt),
          header: header ? serializeProjectHeader(header) : null,
        };
      },

      /**
       * Crea un proyecto DRAFT + su ficha (ProjectHeader) en una transacción.
       * El cliente se resuelve DENTRO del tenant (aislamiento multi-tenant):
       * si no existe en este negocio, error. El header arranca como snapshot
       * fiscal del Customer del CRM (maestro — no es segunda fuente maestra).
       * Código correlativo PROY-<año>-NNN por tenant.
       */
      create: async (data: {
        customerId: string;
        name: string;
        description?: string;
      }): Promise<ProjectDetail> => {
        const customer = await db.orm.public.Customer
          .where({ id: data.customerId, tenantId })
          .first();
        if (!customer) {
          throw new Error("Cliente no encontrado en este negocio.");
        }

        const year = currentYearBogota();
        const prefix = `PROY-${year}-`;
        const latest = await db.orm.public.Project
          .where({ tenantId })
          .where((project) => project.code.like(`${prefix}%`))
          .orderBy((project) => project.code.desc())
          .first();
        const sequence = latest
          ? Number(latest.code.slice(prefix.length)) + 1
          : 1;
        const code = `${prefix}${String(sequence).padStart(3, "0")}`;

        const created = await db.transaction(async (tx) => {
          const project = await tx.orm.public.Project.create({
            tenantId,
            customerId: data.customerId,
            code,
            name: data.name,
            description: data.description ?? null,
            status: "DRAFT",
          });
          const header = await tx.orm.public.ProjectHeader.create({
            projectId: project.id,
            clientTaxName: customer.name,
          });
          return { project, header };
        });

        return {
          id: created.project.id,
          code: created.project.code,
          name: created.project.name,
          description: created.project.description,
          customerId: created.project.customerId,
          customerName: customer.name,
          status: "DRAFT",
          createdAt: String(created.project.createdAt),
          updatedAt: String(created.project.updatedAt),
          header: serializeProjectHeader(created.header),
        };
      },

      /**
       * Actualiza el proyecto (nombre/descripción: última escritura gana) y/o
       * cambia su estado con compare-and-set, sin migración: el token de
       * concurrencia es el propio estado, no una revisión.
       *
       * Reglas: la transición se valida contra el grafo del dominio
       * (`canTransitionProjectStatus`); el UPDATE lleva `status =
       * expectedStatus` en su WHERE, así que si otro request cambió el estado
       * entretanto no toca la fila y se responde `STALE_STATUS`. Los estados
       * terminales (COMPLETED/CANCELLED) no admiten salida. Un guardado sin
       * cambios no escribe nada.
       *
       * Errores tipados: `NOT_FOUND`, `MISSING_EXPECTED_STATUS`,
       * `INVALID_TRANSITION`, `STALE_STATUS`.
       */
      updateProject: async (
        id: string,
        input: UpdateProjectInput,
      ): Promise<ProjectStatusValue> => {
        const project = await db.orm.public.Project
          .where({ id, tenantId })
          .select("id", "status")
          .first();
        if (!project) {
          throw new Error("NOT_FOUND");
        }
        const current = project.status as ProjectStatusValue;

        const patch: {
          name?: string;
          description?: string | null;
          status?: ProjectStatusValue;
        } = {};
        if (input.name !== undefined) {
          patch.name = input.name;
        }
        if (input.description !== undefined) {
          patch.description = input.description;
        }

        if (input.status !== undefined && input.status !== current) {
          if (!input.expectedStatus) {
            throw new Error("MISSING_EXPECTED_STATUS");
          }
          if (input.expectedStatus !== current) {
            throw new Error("STALE_STATUS");
          }
          if (!canTransitionProjectStatus(current, input.status)) {
            throw new Error("INVALID_TRANSITION");
          }
          // Contratada solo con una cotización aprobada por el cliente: ese
          // evento crea la línea base y bloquea el presupuesto (ver
          // projectQuotes.decide). Una obra no se contrata a mano.
          if (input.status === "APPROVED") {
            const approved = await db.orm.public.Quote.where({ tenantId, projectId: id, status: "APPROVED" })
              .select("id")
              .first();
            if (!approved) {
              throw new Error("APPROVED_REQUIRES_QUOTE");
            }
          }
          patch.status = input.status;
        }

        // Sin cambios: no escribe.
        if (Object.keys(patch).length === 0) {
          return current;
        }

        await db.transaction(async (tx) => {
          if (patch.status === undefined) {
            await tx.orm.public.Project.where({ id, tenantId }).update(patch);
            return;
          }
          // Compare-and-set: el WHERE incluye el estado esperado.
          await tx.orm.public.Project
            .where({ id, tenantId, status: input.expectedStatus })
            .update(patch);
          const after = await tx.orm.public.Project
            .where({ id, tenantId })
            .select("status")
            .first();
          if (
            !after ||
            (after.status as ProjectStatusValue) !== patch.status
          ) {
            throw new Error("STALE_STATUS");
          }
        });

        return patch.status ?? current;
      },

      /** Elimina el proyecto (la ficha se borra en cascada). */
      delete: (id: string) =>
        db.orm.public.Project.where({ id, tenantId }).delete(),
  };
}
