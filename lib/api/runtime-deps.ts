import { after } from "next/server";
import type { ApiDeps } from "@/lib/api/handler";
import { authenticateApiKey, recordApiRequest } from "@/lib/api/keys";
import { auditOperation } from "@/lib/operations/audit";
import { OPERATIONS } from "@/lib/operations/registry";
import { consumeMeter, secondsToNextPeriod } from "@/lib/usage/meters";
import { tenantWithModules } from "@/lib/tenant/membership";

/** Conexión de `/api/v1` y `/api/mcp` a la base y al registro (compartida: misma llave, mismo registro de uso). */
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

