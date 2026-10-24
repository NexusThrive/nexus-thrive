import { after } from "next/server";
import { handleApi, type ApiDeps } from "@/lib/api/handler";
import { authenticateApiKey, recordApiRequest } from "@/lib/api/keys";
import { OPERATIONS } from "@/lib/operations/registry";
import { tenantWithModules } from "@/lib/tenant/membership";

/**
 * `/api/v1/*`: el adaptador HTTP del registro de operaciones. Toda la lógica
 * está en `lib/api/handler.ts`; aquí solo se conectan la base y el registro.
 * Documento: `GET /api/v1/openapi.json`. Estándar: .docs/integracion-api-mcp-webhooks.md §2.
 */
const deps: ApiDeps = {
  operations: OPERATIONS,
  authenticate: (authorization) => authenticateApiKey(authorization),
  loadTenant: async (tenantId) => {
    const tenant = await tenantWithModules(tenantId);
    return tenant ? { active: tenant.active, modules: tenant.modules.filter((m) => m.active).map((m) => String(m.moduleName)) } : null;
  },
  // El registro de uso se escribe después de responder: no demora la petición.
  log: (entry) => {
    after(async () => {
      try {
        await recordApiRequest(entry);
      } catch (error) {
        console.error("[api] no se pudo registrar la llamada:", error);
      }
    });
  },
};

const handle = (request: Request) => handleApi(request, deps);
export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
