/**
 * Madurez NEXUS (fase B de Presencia): cuánto del negocio ya opera dentro de NEXUS. Reglas puras sobre conteos reales
 * de los últimos 30 días; ninguna dimensión se infiere ni se rellena. Cada dimensión sin uso deja una SEÑAL con la
 * acción sugerida (a dónde ir). Solo se calcula cuando la fase A está lista (`B_READY`).
 */
export type MaturityKey = "sales" | "inventory" | "cash" | "customers" | "expenses";
export type MaturityInput = {
  invoices30d: number;
  productsActive: number;
  stockMovements30d: number;
  cashSessions30d: number;
  customers: number;
  customersWithPurchase30d: number;
  expenses30d: number;
};
export type Dimension = { key: MaturityKey; label: string; score: number; detail: string };
export type Signal = { key: MaturityKey; message: string; action: { label: string; href: string } };
export type Maturity = { score: number; level: "INICIAL" | "EN_CRECIMIENTO" | "CONSOLIDADO"; dimensions: Dimension[]; signals: Signal[] };

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
/** 100 al llegar a la meta; proporcional por debajo. */
const toward = (value: number, goal: number) => clamp((value / goal) * 100);

export function computeMaturity(i: MaturityInput): Maturity {
  const dimensions: Dimension[] = [
    { key: "sales", label: "Ventas", score: toward(i.invoices30d, 20), detail: `${i.invoices30d} facturas en 30 días (meta 20)` },
    { key: "inventory", label: "Inventario", score: i.productsActive === 0 ? 0 : clamp(40 + toward(i.stockMovements30d, 10) * 0.6), detail: i.productsActive === 0 ? "Sin productos" : `${i.productsActive} productos, ${i.stockMovements30d} movimientos en 30 días` },
    { key: "cash", label: "Caja", score: toward(i.cashSessions30d, 15), detail: `${i.cashSessions30d} turnos de caja en 30 días (meta 15)` },
    { key: "customers", label: "Clientes", score: i.customers === 0 ? 0 : clamp(toward(i.customers, 30) * 0.5 + toward(i.customersWithPurchase30d, Math.max(1, Math.round(i.customers * 0.3))) * 0.5), detail: `${i.customers} clientes, ${i.customersWithPurchase30d} compraron en 30 días` },
    { key: "expenses", label: "Gastos", score: toward(i.expenses30d, 10), detail: `${i.expenses30d} gastos registrados en 30 días (meta 10)` },
  ];
  const score = clamp(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length);
  const ACTIONS: Record<MaturityKey, Signal["action"] & { message: string }> = {
    sales: { message: "Casi no registras ventas en NEXUS.", label: "Abrir facturación", href: "/billing" },
    inventory: { message: "Tu inventario apenas se mueve en NEXUS.", label: "Ir a inventario", href: "/inventory" },
    cash: { message: "Casi no usas la caja de NEXUS.", label: "Abrir la caja", href: "/pos" },
    customers: { message: "Pocos de tus clientes están en NEXUS o compran con registro.", label: "Ir a clientes", href: "/crm" },
    expenses: { message: "Tus gastos no se registran: no sabrás tu utilidad real.", label: "Registrar gastos", href: "/finance" },
  };
  const signals = dimensions
    .filter((d) => d.score < 50)
    .sort((a, b) => a.score - b.score)
    .map((d): Signal => ({ key: d.key, message: ACTIONS[d.key].message, action: { label: ACTIONS[d.key].label, href: ACTIONS[d.key].href } }));
  return { score, level: score >= 75 ? "CONSOLIDADO" : score >= 40 ? "EN_CRECIMIENTO" : "INICIAL", dimensions, signals };
}
