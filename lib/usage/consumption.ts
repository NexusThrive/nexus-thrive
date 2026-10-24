/**
 * Consumo del negocio frente a sus límites (Etapa E): lo que el plan limita es
 * USO (usuarios, clientes, consumo del mes), nunca funciones. Puro: arma las
 * filas que se muestran; los datos los trae `consumption-db.ts`.
 */
export type ConsumptionStatus = "ok" | "near" | "over" | "unlimited";
export type ConsumptionRow = {
  key: string;
  label: string;
  used: number;
  /** `null` = sin límite acordado. */
  limit: number | null;
  /** «este mes» para medidores mensuales; vacío para cupos fijos. */
  period?: string;
  status: ConsumptionStatus;
  /** 0–100 (tope en 100); 0 si no hay límite. */
  pct: number;
};

/** Se avisa al llegar al 80 % del límite. */
export const NEAR_THRESHOLD = 0.8;

export function consumptionRow(input: { key: string; label: string; used: number; limit: number | null; period?: string }): ConsumptionRow {
  const { used, limit } = input;
  if (limit === null) return { ...input, status: "unlimited", pct: 0 };
  const ratio = limit > 0 ? used / limit : used > 0 ? 1 : 0;
  const status: ConsumptionStatus = used >= limit && limit > 0 ? "over" : limit === 0 && used > 0 ? "over" : ratio >= NEAR_THRESHOLD ? "near" : "ok";
  return { ...input, status, pct: Math.min(100, Math.round(ratio * 100)) };
}

export function buildConsumption(input: {
  seats: { used: number; limit: number | null };
  customers: { used: number; limit: number | null };
  meters: readonly { meter: string; label: string; used: number; limit: number; period: string }[];
}): ConsumptionRow[] {
  return [
    consumptionRow({ key: "seats", label: "Personas del equipo", ...input.seats }),
    consumptionRow({ key: "customers", label: "Clientes activos", ...input.customers }),
    ...input.meters.map((m) => consumptionRow({ key: m.meter, label: m.label, used: m.used, limit: m.limit, period: m.period })),
  ];
}

/** Lo que conviene avisar: los que están cerca o pasados del límite. */
export const needsAttention = (rows: readonly ConsumptionRow[]): ConsumptionRow[] => rows.filter((r) => r.status === "near" || r.status === "over");
