import { z } from "zod";
import { defineOperation, type OperationDefinition } from "../types";

/** Presencia del negocio (barra v2): pilares verificados, fase y tendencia. Solo lectura. */
export const presenceOperations: OperationDefinition[] = [
  defineOperation({
    id: "presence.get",
    rest: { method: "GET", path: "/presence" },
    title: "Presencia digital",
    description: "Puntaje de la fase A de presencia con sus pilares (sitio, venta en línea, reputación, atribución y datos básicos), cuántos se miden y la tendencia de los últimos 30 días.",
    module: null,
    permission: null,
    risk: "read",
    input: z.object({}),
    output: z.object({
      score: z.number(),
      coverage: z.number(),
      phase: z.enum(["A", "B_READY"]),
      pillars: z.array(z.object({ key: z.string(), label: z.string(), score: z.number().nullable(), hint: z.string() })),
      trend: z.object({ direction: z.enum(["up", "flat", "down"]), delta: z.number(), days: z.number() }),
    }),
    handler: async (ctx) => {
      const { presenceV2 } = await import("@/lib/presence/pillars-db");
      const r = await presenceV2(ctx.tenantId);
      return { score: r.phase.score, coverage: r.phase.coverage, phase: r.phase.phase, pillars: r.pillars.map((p) => ({ key: p.key, label: p.label, score: p.score, hint: p.hint })), trend: { direction: r.trend.direction, delta: r.trend.delta, days: r.trend.days } };
    },
  }),
];
