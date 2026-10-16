/**
 * Bitácora de obra.
 * Extraído de `lib/tenant-db.ts`; `createTenantDb` lo compone. Todo
 * acceso va acotado al `tenantId` recibido.
 */
import {
  db,
} from "@/prisma/db";
import {
  type CreateFieldLogEntryInput,
  type FieldLogData,
  bogotaInstantFromEntryDate,
  loadFieldLog,
} from "./shared";

export function createFieldLogDb(tenantId: string) {
  return {
      /** Bitácora del proyecto (con sus entradas), o null. */
      getLog: async (projectId: string): Promise<FieldLogData | null> => {
        const log = await db.orm.public.FieldLog
          .where({ projectId, tenantId })
          .first();
        return log ? loadFieldLog(log, tenantId) : null;
      },

      /**
       * Devuelve la bitácora del proyecto, creándola si no existe (1:1 vía
       * `projectId @unique`). Idempotente ante concurrencia.
       */
      getOrCreateLog: async (projectId: string): Promise<FieldLogData> => {
        const existing = await db.orm.public.FieldLog
          .where({ projectId, tenantId })
          .first();
        if (existing) {
          return loadFieldLog(existing, tenantId);
        }

        const project = await db.orm.public.Project
          .where({ id: projectId, tenantId })
          .first();
        if (!project) {
          throw new Error("Proyecto no encontrado en este negocio.");
        }

        try {
          const created = await db.orm.public.FieldLog.create({
            tenantId,
            projectId,
            name: `Diario Oficial de Obra — ${project.name}`,
          });
          return loadFieldLog(created, tenantId);
        } catch (error) {
          const raced = await db.orm.public.FieldLog
            .where({ projectId, tenantId })
            .first();
          if (raced) {
            return loadFieldLog(raced, tenantId);
          }
          throw error;
        }
      },

      /**
       * Crea una anotación en la bitácora. Valida coherencia de tenant y
       * pertenencia al proyecto.
       */
      createEntry: async (
        logId: string,
        input: CreateFieldLogEntryInput,
      ): Promise<{ id: string }> => {
        const log = await db.orm.public.FieldLog
          .where({ id: logId, tenantId })
          .first();
        if (!log) {
          throw new Error("Bitácora no encontrada en este negocio.");
        }

        const created = await db.orm.public.FieldLogEntry.create({
          tenantId,
          logId,
          type: input.type,
          entryDate: bogotaInstantFromEntryDate(input.entryDate),
          title: input.title,
          description: input.description,
          weather: input.weather,
          laborCount: input.laborCount,
          authorName: input.authorName,
          authorRole: input.authorRole,
          photoUrls: input.photoUrls,
        });
        return { id: created.id };
      },

      /**
       * Elimina una anotación de la bitácora. Verifica pertenencia al tenant
       * y a la bitácora correcta.
       */
      deleteEntry: async (logId: string, entryId: string): Promise<void> => {
        const log = await db.orm.public.FieldLog
          .where({ id: logId, tenantId })
          .first();
        if (!log) {
          throw new Error("Bitácora no encontrada en este negocio.");
        }

        const entry = await db.orm.public.FieldLogEntry
          .where({ id: entryId, logId, tenantId })
          .first();
        if (!entry) {
          throw new Error("Anotación no encontrada en esta bitácora.");
        }

        await db.orm.public.FieldLogEntry
          .where({ id: entry.id })
          .delete();
      },
  };
}
