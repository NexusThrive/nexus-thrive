import type { OperationDefinition } from "@/lib/operations/types";

/**
 * Alcances de una llave de API. Gramática (documento de integración §2):
 *
 *   `*`            todas las operaciones a las que llegue el rol de la llave
 *   `read`         todas las de riesgo `read`
 *   `recurso.*`    todas las de un recurso (`customers.*`)
 *   `recurso.accion`  una sola (`customers.search`)
 *
 * Los alcances **recortan**: nunca dan más de lo que el rol de quien creó la
 * llave ya puede (eso lo comprueba el motor con `can()`).
 */
export function scopeAllows(scopes: readonly string[], op: Pick<OperationDefinition, "id" | "risk">): boolean {
  const resource = op.id.split(".")[0];
  return scopes.some((s) => s === "*" || s === op.id || s === `${resource}.*` || (s === "read" && op.risk === "read"));
}

/** Valida los alcances pedidos al crear una llave; devuelve el primero inválido o `null`. */
export function invalidScope(scopes: readonly string[], operations: readonly Pick<OperationDefinition, "id">[]): string | null {
  const resources = new Set(operations.map((o) => o.id.split(".")[0]));
  const ids = new Set(operations.map((o) => o.id));
  for (const s of scopes) {
    const ok = s === "*" || s === "read" || ids.has(s) || (s.endsWith(".*") && resources.has(s.slice(0, -2)));
    if (!ok) return s;
  }
  return null;
}
