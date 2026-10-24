import type { ModuleValue } from "@/lib/admin/catalogs";

/**
 * Sugerencias de funciones por USO (no por rubro): mira lo que el negocio ya
 * hace y propone encender la función que lo acompaña. Pura y sin base de datos;
 * las señales las calcula `signals-db.ts`.
 */
export type UsageSignals = {
  /** Productos que controlan inventario. */
  trackedProducts: number;
  customers: number;
  /** Clientes con teléfono (se les puede escribir). */
  customersWithPhone: number;
  /** Cobros registrados. */
  payments: number;
};

export type Suggestion = { module: ModuleValue; reason: string };

export function suggestFromUsage(signals: UsageSignals, active: ReadonlySet<string>): Suggestion[] {
  const out: Suggestion[] = [];
  if (!active.has("inventory") && signals.payments >= 5) out.push({ module: "inventory", reason: "Ya registras cobros: lleva también tus productos y existencias." });
  if (active.has("inventory") && !active.has("purchases") && signals.trackedProducts >= 1) {
    out.push({ module: "purchases", reason: `Controlas inventario de ${signals.trackedProducts} ${signals.trackedProducts === 1 ? "producto" : "productos"}: registra a quién se lo compras y recibe la mercancía con su costo.` });
  }
  if (!active.has("billing") && signals.payments >= 10) out.push({ module: "billing", reason: "Ya tienes varios cobros: emite cuentas de cobro y recibos numerados." });
  if (!active.has("whatsapp") && signals.customersWithPhone >= 5) out.push({ module: "whatsapp", reason: `Tienes ${signals.customersWithPhone} clientes con teléfono: escríbeles desde aquí.` });
  if (!active.has("crm") && signals.customers >= 1) out.push({ module: "crm", reason: "Ya tienes clientes: lleva su ficha y seguimiento." });
  return out;
}
