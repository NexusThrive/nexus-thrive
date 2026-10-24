import type { z } from "zod";
import type { BusinessPermission } from "@/lib/business/permissions";
import type { ModuleValue } from "@/lib/admin/catalogs";

/**
 * Registro de operaciones: una operación de negocio se declara UNA vez y de ahí
 * salen la pantalla, la API REST (`/api/v1`), la herramienta MCP y el evento
 * (ver .docs/integracion-api-mcp-webhooks.md §1).
 */

/** Qué tan delicada es: decide la aprobación que exige (documento §4.3). */
export type Risk = "read" | "draft" | "write" | "money" | "destructive";

/** Quién ejecuta: la persona, una llave de API, un agente o una automatización. */
export type OperationActor = {
  type: "USER" | "API_KEY" | "AGENT" | "AUTOMATION" | "SYSTEM";
  id: string;
};

/**
 * Lo que el SERVIDOR sabe de quien llama. El negocio, el rol y los módulos
 * activos nunca vienen del cliente ni del modelo (regla 1 de la integración).
 */
export type OperationContext = {
  tenantId: string;
  /** Rol del negocio (`BusinessRole`). */
  role: string;
  /** Módulos activos del negocio. */
  activeModules: readonly string[];
  actor: OperationActor;
  requestId?: string;
};

export type OperationDefinition<I extends z.ZodType = z.ZodType, O extends z.ZodType = z.ZodType> = {
  /** `recurso.accion`, en minúsculas y con guion bajo. Estable: es el nombre en API, MCP y eventos. */
  id: string;
  title: string;
  /** Qué hace, para personas y para el modelo que elige herramientas. */
  description: string;
  /** Módulo que debe estar activo; `null` si no depende de uno (inicio, configuración). */
  module: ModuleValue | null;
  /** Permiso de `BUSINESS_PERMISSIONS`; `null` = cualquier integrante. */
  permission: BusinessPermission | null;
  risk: Risk;
  input: I;
  /** Lo mínimo necesario: lo que no esté aquí no sale (zod descarta lo demás). */
  output: O;
  /** Exige `Idempotency-Key` (operaciones que escriben o mueven dinero). */
  idempotent?: boolean;
  /** Eventos de dominio que publica (`recurso.accion.v1`). */
  emits?: readonly string[];
  handler: (ctx: OperationContext, input: z.output<I>) => Promise<z.input<O>>;
};

/** Códigos estables (van en `code` del error RFC 9457 de la API). */
export type OperationErrorCode = "unknown_operation" | "module_inactive" | "forbidden" | "invalid_input" | "internal";

export class OperationError extends Error {
  constructor(
    readonly code: OperationErrorCode,
    message: string,
    readonly status: number,
    readonly issues?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = "OperationError";
  }
}

/**
 * Declara una operación conservando los tipos de su entrada y su salida dentro
 * del `handler` (el registro las guarda ya sin genéricos).
 */
export function defineOperation<I extends z.ZodType, O extends z.ZodType>(def: OperationDefinition<I, O>): OperationDefinition {
  return def as unknown as OperationDefinition;
}
