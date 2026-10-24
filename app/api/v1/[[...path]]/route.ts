import { handleApi } from "@/lib/api/handler";
import { apiDeps } from "@/lib/api/runtime-deps";

/**
 * `/api/v1/*`: el adaptador HTTP del registro de operaciones. Toda la lógica
 * está en `lib/api/handler.ts`. Documento: `GET /api/v1/openapi.json`.
 * Estándar: .docs/integracion-api-mcp-webhooks.md §2.
 */
const handle = (request: Request) => handleApi(request, apiDeps);
export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
