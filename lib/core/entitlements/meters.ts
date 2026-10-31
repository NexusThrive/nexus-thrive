import { db } from "@/prisma/db";

/**
 * Medidores de consumo por negocio y mes (`UsageCounter`). Sirven para cupos
 * (superarlos devuelve 429) y, más adelante, para el cobro por uso. El cupo de
 * un negocio sale de `limitQuantity` de su fila del mes; si es null aplica el
 * predeterminado del medidor. La cuota por plan llegará con X.00.
 */
export const METERS = {
  "api.requests": { label: "Peticiones a la API y al MCP", defaultMonthlyLimit: 50_000 },
  "events.delivered": { label: "Eventos entregados por webhook", defaultMonthlyLimit: 100_000 },
  "ai.tokens": { label: "Tokens de IA", defaultMonthlyLimit: 1_000_000 },
  "messages.sent": { label: "Mensajes enviados", defaultMonthlyLimit: 5_000 },
  "automations.runs": { label: "Ejecuciones de automatizaciones", defaultMonthlyLimit: 10_000 },
} as const;
export type MeterName = keyof typeof METERS;

/** Mes de facturación en hora de Colombia (UTC-5, sin horario de verano): `YYYY-MM`. */
export const periodOf = (nowMs: number) => new Date(nowMs - 5 * 3_600_000).toISOString().slice(0, 7);

/** Segundos hasta que empieza el mes siguiente (para `Retry-After`). */
export function secondsToNextPeriod(nowMs: number): number {
  const local = new Date(nowMs - 5 * 3_600_000);
  const next = Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) + 5 * 3_600_000;
  return Math.max(1, Math.ceil((next - nowMs) / 1000));
}

export type UsageResult = { allowed: boolean; used: number; limit: number; period: string };

const ATTEMPTS = 60;

/**
 * Suma `quantity` al medidor si cabe en el cupo; si no, no suma y devuelve
 * `allowed: false`. Concurrente sin pérdidas: la suma solo se aplica si la
 * cantidad no cambió desde que se leyó (si cambió, relee y reintenta).
 */
export async function consumeMeter(tenantId: string, meter: MeterName, quantity = 1, nowMs = Date.now()): Promise<UsageResult> {
  const period = periodOf(nowMs);
  const table = db.orm.public.UsageCounter;
  for (let i = 0; i < ATTEMPTS; i++) {
    let row = await table.where({ tenantId, meter, period }).first();
    if (!row) {
      try {
        row = await table.create({ tenantId, meter, period, quantity: 0 });
      } catch {
        continue; // otra petición la creó a la vez: se relee
      }
    }
    const limit = row.limitQuantity ?? METERS[meter].defaultMonthlyLimit;
    if (row.quantity + quantity > limit) return { allowed: false, used: row.quantity, limit, period };
    // Compara-y-cambia en UNA sentencia SQL (el `update` del ORM lee y luego escribe por id, y pierde sumas concurrentes).
    const plan = db.sql.public.UsageCounter.update({ quantity: row.quantity + quantity })
      .where((f, fns) => fns.and(fns.eq(f.id, row.id), fns.eq(f.tenantId, tenantId), fns.eq(f.quantity, row.quantity)))
      .build();
    if ((await db.runtime().execute(plan)).affectedRows > 0) return { allowed: true, used: row.quantity + quantity, limit, period };
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 15)); // pierde la carrera: espera un poco y relee
  }
  throw new Error(`No se pudo medir «${meter}» por contención; reintenta.`);
}

/** Consumo del mes de un negocio (solo lectura; los medidores sin uso salen en cero). */
export async function usageSnapshot(tenantId: string, nowMs = Date.now()) {
  const period = periodOf(nowMs);
  const rows = await db.orm.public.UsageCounter.where({ tenantId, period }).all();
  return (Object.keys(METERS) as MeterName[]).map((meter) => {
    const row = rows.find((r) => r.meter === meter);
    return { meter, label: METERS[meter].label, period, used: row?.quantity ?? 0, limit: row?.limitQuantity ?? METERS[meter].defaultMonthlyLimit };
  });
}

/** Fija un cupo propio para el negocio en el mes (lo usan el panel de NEXUS y los planes). */
export async function setMeterLimit(tenantId: string, meter: MeterName, limit: number | null, nowMs = Date.now()): Promise<void> {
  const period = periodOf(nowMs);
  await db.orm.public.UsageCounter.upsert({
    create: { tenantId, meter, period, quantity: 0, limitQuantity: limit },
    update: { limitQuantity: limit },
    conflictOn: { tenantId, meter, period },
  });
}
