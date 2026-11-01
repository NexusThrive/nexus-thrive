import { after } from "next/server";
import type { ApiDeps } from "@/lib/core/api/handler";
import { authenticateApiKey, recordApiRequest } from "@/lib/core/api/keys";
import { auditOperation } from "@/lib/core/operations/audit";
import { OPERATIONS } from "@/lib/runtime/operations";
import { consumeMeter, secondsToNextPeriod } from "@/lib/core/entitlements/meters";
import { tenantWithModules } from "@/lib/core/tenancy/membership";

/**
 * Conexión de `/api/v1` y `/api/mcp` a la base y al registro de operaciones (compartida: misma llave, mismo registro de uso).
 * Es composición (reúne la API, el uso, la auditoría y el inquilino con datos reales), así que vive en `lib/runtime`.
 */
export const apiDeps: ApiDeps = {
  operations: OPERATIONS,
  usage: async (tenantId) => {
    try {
      return { ...(await consumeMeter(tenantId, "api.requests")), resetSeconds: secondsToNextPeriod(Date.now()) };
    } catch (error) {
      // Si el medidor falla no se tumba la API del cliente: se deja pasar y se avisa.
      console.error("[usage] no se pudo medir api.requests:", error);
      return { allowed: true, used: 0, limit: 0, resetSeconds: 0 };
    }
  },
  audit: (ctx, op, input) => auditOperation(ctx, op, input),
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

