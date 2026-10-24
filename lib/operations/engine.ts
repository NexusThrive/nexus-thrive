import { z } from "zod";
import { can } from "@/lib/business/permissions";
import { OperationError, type OperationContext, type OperationDefinition } from "./types";

/**
 * Motor de operaciones: el ÚNICO camino que usan la pantalla, la API, el MCP y
 * las automatizaciones. Comprueba, en este orden y siempre en el servidor:
 * módulo activo → permiso → entrada validada → ejecución → salida mínima.
 * No conoce HTTP ni MCP; esos son adaptadores sobre esto.
 */

/** ¿Puede este contexto usar la operación? (para listar herramientas y alcances) */
export function isAvailable(op: Pick<OperationDefinition, "module" | "permission">, ctx: Pick<OperationContext, "role" | "activeModules">): boolean {
  if (op.module && !ctx.activeModules.includes(op.module)) return false;
  if (op.permission && !can(ctx.role, op.permission)) return false;
  return true;
}

export async function runOperation(
  operations: readonly OperationDefinition[],
  ctx: OperationContext,
  id: string,
  rawInput: unknown,
): Promise<unknown> {
  const op = operations.find((candidate) => candidate.id === id);
  if (!op) throw new OperationError("unknown_operation", `La operación «${id}» no existe.`, 404);

  if (op.module && !ctx.activeModules.includes(op.module)) {
    throw new OperationError("module_inactive", `El módulo «${op.module}» no está activo en este negocio.`, 403);
  }
  if (op.permission && !can(ctx.role, op.permission)) {
    throw new OperationError("forbidden", "No tienes permiso para esta operación.", 403);
  }

  const parsed = op.input.safeParse(rawInput ?? {});
  if (!parsed.success) {
    throw new OperationError(
      "invalid_input",
      "Revisa los datos enviados.",
      422,
      parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    );
  }

  const result = await op.handler(ctx, parsed.data);
  // La salida se valida y se recorta: solo sale lo declarado.
  return op.output.parse(result);
}

/** Descripción serializable de una operación (base del OpenAPI y de las herramientas MCP). */
export function describeOperation(op: OperationDefinition) {
  return {
    id: op.id,
    title: op.title,
    description: op.description,
    module: op.module,
    permission: op.permission,
    risk: op.risk,
    idempotent: op.idempotent ?? false,
    emits: op.emits ?? [],
    // Entrada: lo que la persona envía (los valores por defecto no son obligatorios).
    inputSchema: z.toJSONSchema(op.input, { io: "input" }),
    outputSchema: z.toJSONSchema(op.output),
  };
}
