/**
 * Encabezado contractual de la obra (Tab 1).
 * Extraído de `lib/core/tenancy/db.ts`; `createConstructionDb` lo compone. Todo
 * acceso va acotado al `tenantId` recibido.
 */
import {
  db,
} from "@/prisma/db";
import {
  type ProjectHeaderData,
  type ProjectHeaderInput,
  serializeProjectHeader,
} from "./shared";

/**
 * Repositorio de la ficha del proyecto (datos fiscales y de contacto del cliente): leerla solo si el proyecto es del negocio y actualizarla.
 */
export function createProjectHeadersDb(tenantId: string) {
  return {
      /** Lee la ficha solo si el proyecto pertenece a este tenant. */
      get: async (projectId: string): Promise<ProjectHeaderData | null> => {
        const project = await db.orm.public.Project
          .where({ id: projectId, tenantId })
          .select("id")
          .first();
        if (!project) {
          return null;
        }
        const header = await db.orm.public.ProjectHeader
          .where({ projectId })
          .first();
        return header ? serializeProjectHeader(header) : null;
      },

      /** Actualiza la ficha validando el tenant del proyecto. */
      update: async (
        projectId: string,
        data: ProjectHeaderInput,
      ): Promise<ProjectHeaderData | null> => {
        const project = await db.orm.public.Project
          .where({ id: projectId, tenantId })
          .select("id")
          .first();
        if (!project) {
          return null;
        }
        await db.orm.public.ProjectHeader.where({ projectId }).update(data);
        const header = await db.orm.public.ProjectHeader
          .where({ projectId })
          .first();
        return header ? serializeProjectHeader(header) : null;
      },
  };
}
