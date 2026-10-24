import { businessOperations } from "./definitions/business";
import { customerOperations } from "./definitions/customers";
import { eventOperations } from "./definitions/events";
import { financeOperations } from "./definitions/finance";
import { inventoryOperations } from "./definitions/inventory";
import { presenceOperations } from "./definitions/presence";
import { purchaseOperations } from "./definitions/purchases";
import { partyOperations } from "./definitions/parties";
import { isAvailable, runOperation } from "./engine";
import type { OperationContext, OperationDefinition } from "./types";

/**
 * Todas las operaciones de negocio disponibles para integraciones. Las pantallas,
 * la API (`/api/v1`) y el MCP las consumen de aquí; si una operación no está en
 * este registro, no existe para ellas. Agregar una = agregar su definición.
 */
export const OPERATIONS: readonly OperationDefinition[] = Object.freeze([
  ...businessOperations,
  ...customerOperations,
  ...inventoryOperations,
  ...presenceOperations,
  ...financeOperations,
  ...eventOperations,
  ...partyOperations,
  ...purchaseOperations,
]);

export const getOperation = (id: string) => OPERATIONS.find((op) => op.id === id);

/** Operaciones que este contexto puede usar (módulo activo y permiso): las herramientas y alcances que ve una llave. */
export const operationsFor = (ctx: Pick<OperationContext, "role" | "activeModules">) => OPERATIONS.filter((op) => isAvailable(op, ctx));

/** Ejecuta una operación del registro (el camino único de la pantalla, la API y el MCP). */
export const run = (ctx: OperationContext, id: string, input: unknown) => runOperation(OPERATIONS, ctx, id, input);

export { describeOperation } from "./engine";
export * from "./types";
