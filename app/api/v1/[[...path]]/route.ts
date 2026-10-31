import { handleApi } from "@/lib/core/api/handler";
import { apiDeps } from "@/lib/runtime/api-deps";

/**
 * `/api/v1/*`: el adaptador HTTP del registro de operaciones. Toda la lógica
 * está en `lib/core/api/handler.ts`. Documento: `GET /api/v1/openapi.json`.
 * Estándar: .docs/integracion-api-mcp-webhooks.md §2.
 */
const handle = (request: Request) => handleApi(request, apiDeps);
export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
