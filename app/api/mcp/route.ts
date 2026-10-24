import { apiDeps } from "@/lib/api/runtime-deps";
import { handleMcp } from "@/lib/mcp/server";

/**
 * `/api/mcp`: servidor MCP (Streamable HTTP sin sesión), solo lectura.
 * Misma llave `Authorization: Bearer nx_…` que `/api/v1`.
 */
const handle = (request: Request) => handleMcp(request, apiDeps);
export { handle as GET, handle as POST, handle as DELETE };
