/**
 * Operaciones de cobros en línea para API, MCP y automatizaciones (HU-operaciones-01): crear un enlace de cobro y confirmar
 * a mano un pago con evidencia. Usan las mismas funciones que la pantalla de Cobros (`createIntent`, `confirmIntent`); el
 * dinero entra solo por `money-service`. La pasarela la elige el negocio (la conectada o, sin ninguna, el cobro manual).
 * Vive en la raíz de composición porque reúne Core (operaciones) con Finance (cobros), capas que no se importan entre sí.
 */
import { z } from "zod";
import { defineOperation, OperationError, type OperationDefinition } from "@/lib/core/operations/types";
import { getAppBaseUrl } from "@/lib/foundation/app-url";
import { confirmIntent, createIntent } from "@/lib/domains/finance/payments/intents-db";

/** Quién registra en la bitácora del cobro: la llave o automatización, no una persona. */
const byActor = (actor: { type: string; id: string }) => `${actor.type.toLowerCase()}:${actor.id}`;

export const paymentOperations: OperationDefinition[] = [
  defineOperation({
    id: "payments.create_intent",
    rest: { method: "POST", path: "/payments/intents" },
    title: "Crear un enlace de cobro",
    description:
      "Crea un cobro por un valor y devuelve su referencia y el enlace público de pago. El negocio cobra con su pasarela conectada o, si no tiene una, por transferencia o efectivo. Valor entre $ 1.000 y $ 50.000.000.",
    module: "online_payments",
    permission: "money.handle",
    risk: "write",
    idempotent: true,
    emits: ["payment.intent_created.v1"],
    input: z.object({
      amount: z.number().positive(),
      description: z.string().trim().min(3).max(160),
      expiresInHours: z.number().int().min(1).max(720).default(48),
      customerId: z.string().uuid().optional(),
      invoiceId: z.string().uuid().optional(),
    }),
    output: z.object({ id: z.string(), reference: z.string(), status: z.literal("PENDING"), payUrl: z.string() }),
    handler: async (ctx, input) => {
      const created = await createIntent(ctx.tenantId, { amount: input.amount, description: input.description, expiresInHours: input.expiresInHours, customerId: input.customerId ?? null, invoiceId: input.invoiceId ?? null }, byActor(ctx.actor));
      if (!created.ok) throw new OperationError("rule_violation", created.message, 422);
      return { id: created.id, reference: created.reference, status: "PENDING" as const, payUrl: `${await getAppBaseUrl()}/pay/${created.reference}` };
    },
  }),
  defineOperation({
    id: "payments.confirm",
    rest: { method: "POST", path: "/payments/intents/{reference}/confirm" },
    title: "Confirmar un pago a mano",
    description:
      "Confirma que un cobro pendiente se pagó por transferencia o efectivo. Exige evidencia escrita (la referencia de la transferencia). El ingreso se registra una sola vez aunque se repita la llamada. Requiere el alcance explícito `payments.confirm`.",
    module: "online_payments",
    permission: "business.manage",
    risk: "money",
    idempotent: true,
    emits: ["sale.completed.v1"],
    input: z.object({ reference: z.string().regex(/^[a-z0-9]{10,30}$/, "La referencia no es válida."), evidence: z.string().trim().min(4, "Escribe la evidencia del pago.").max(200) }),
    output: z.object({ reference: z.string(), status: z.literal("PAID"), already: z.boolean() }),
    handler: async (ctx, input) => {
      const result = await confirmIntent(ctx.tenantId, input.reference, { kind: "MANUAL", evidence: input.evidence, userId: byActor(ctx.actor) });
      if (!result.ok) throw new OperationError(/no existe/i.test(result.message) ? "not_found" : "rule_violation", result.message, /no existe/i.test(result.message) ? 404 : 422);
      return { reference: input.reference, status: "PAID" as const, already: result.already };
    },
  }),
];
