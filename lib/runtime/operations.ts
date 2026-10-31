import { businessOperations } from "@/lib/operations/definitions/business";
import { customerOperations } from "@/lib/operations/definitions/customers";
import { eventOperations } from "@/lib/operations/definitions/events";
import { financeOperations } from "@/lib/operations/definitions/finance";
import { inventoryOperations } from "@/lib/business/inventory/operations";
import { presenceOperations } from "@/lib/business/presence/operations";
import { purchaseOperations } from "@/lib/business/purchasing/operations";
import { partyOperations } from "@/lib/operations/definitions/parties";
import { isAvailable, runOperation } from "@/lib/operations/engine";
import type { OperationContext, OperationDefinition } from "@/lib/operations/types";

/**
 * Todas las operaciones de negocio disponibles para integraciones. Las pantallas,
 * la API (`/api/v1`) y el MCP las consumen de aquí; si una operación no está en
 * este registro, no existe para ellas. Agregar una = agregar su definición.
 *
 * Es parte de la RAÍZ DE COMPOSICIÓN (`lib/runtime`, junto a `ports.ts`): cada dominio declara
 * sus propias operaciones (inventario, compras y presencia en su carpeta, con su `operations.ts`)
 * y aquí solo se reúnen en una lista explícita y con tipos. El motor (`engine.ts`) y los tipos
 * (`types.ts`) son de Core y no conocen a ningún dominio. Antes vivía en `lib/operations/registry.ts`
 * (capa de integraciones); en la capa `runtime` nadie de `lib/` puede importarlo: solo lo usan los
 * puntos de entrada (rutas y acciones) y las pruebas.
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

/** Operación declarada con ese id, o `undefined`. */
export const getOperation = (id: string) => OPERATIONS.find((op) => op.id === id);

/** Operaciones que este contexto puede usar (módulo activo y permiso): las herramientas y alcances que ve una llave. */
export const operationsFor = (ctx: Pick<OperationContext, "role" | "activeModules">) => OPERATIONS.filter((op) => isAvailable(op, ctx));

/** Ejecuta una operación del registro (el camino único de la pantalla, la API y el MCP). */
export const run = (ctx: OperationContext, id: string, input: unknown) => runOperation(OPERATIONS, ctx, id, input);

export { describeOperation } from "@/lib/operations/engine";
export * from "@/lib/operations/types";
