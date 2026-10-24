/**
 * Plan único de cuentas (PUC) y reglas contables de partida: reglas puras, sin base de datos.
 * La plantilla es una base de uso común en Colombia para un negocio pequeño; el contador la ajusta
 * (agrega, renombra o desactiva cuentas). No reemplaza la asesoría contable.
 */
export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE" | "COST";
export const TYPE_LABELS: Record<AccountType, string> = { ASSET: "Activo", LIABILITY: "Pasivo", EQUITY: "Patrimonio", INCOME: "Ingresos", EXPENSE: "Gastos", COST: "Costos" };
/** Clase del PUC por su primer dígito. */
export const CLASS_TYPE: Record<string, AccountType> = { "1": "ASSET", "2": "LIABILITY", "3": "EQUITY", "4": "INCOME", "5": "EXPENSE", "6": "COST", "7": "COST" };

export type PucRow = { code: string; name: string; postable: boolean; nature?: "D" | "C" };

const T: readonly PucRow[] = [
  // Clase 1 · Activo
  { code: "1", name: "Activo", postable: false },
  { code: "11", name: "Disponible", postable: false },
  { code: "1105", name: "Caja", postable: true },
  { code: "1110", name: "Bancos", postable: true },
  { code: "1120", name: "Cuentas de ahorro", postable: true },
  { code: "13", name: "Deudores", postable: false },
  { code: "1305", name: "Clientes", postable: true },
  { code: "1355", name: "Anticipo de impuestos y saldos a favor", postable: true },
  { code: "1365", name: "Cuentas por cobrar a trabajadores", postable: true },
  { code: "14", name: "Inventarios", postable: false },
  { code: "1435", name: "Mercancías no fabricadas por la empresa", postable: true },
  { code: "15", name: "Propiedades, planta y equipo", postable: false },
  { code: "1524", name: "Equipo de oficina", postable: true },
  { code: "1528", name: "Equipo de computación y comunicación", postable: true },
  // Clase 2 · Pasivo
  { code: "2", name: "Pasivo", postable: false },
  { code: "22", name: "Proveedores", postable: false },
  { code: "2205", name: "Proveedores nacionales", postable: true },
  { code: "23", name: "Cuentas por pagar", postable: false },
  { code: "2335", name: "Costos y gastos por pagar", postable: true },
  { code: "2365", name: "Retención en la fuente", postable: true },
  { code: "2367", name: "Impuesto a las ventas retenido", postable: true },
  { code: "2368", name: "Impuesto de industria y comercio retenido", postable: true },
  { code: "24", name: "Impuestos, gravámenes y tasas", postable: false },
  { code: "2408", name: "Impuesto sobre las ventas por pagar (IVA)", postable: true },
  { code: "2412", name: "Impuesto de industria y comercio", postable: true },
  { code: "25", name: "Obligaciones laborales", postable: false },
  { code: "2505", name: "Salarios por pagar", postable: true },
  { code: "28", name: "Otros pasivos", postable: false },
  { code: "2805", name: "Anticipos y avances recibidos de clientes", postable: true },
  // Clase 3 · Patrimonio
  { code: "3", name: "Patrimonio", postable: false },
  { code: "3105", name: "Capital suscrito y pagado", postable: true },
  { code: "3605", name: "Utilidad del ejercicio", postable: true },
  { code: "3705", name: "Utilidades acumuladas", postable: true },
  // Clase 4 · Ingresos
  { code: "4", name: "Ingresos", postable: false },
  { code: "4135", name: "Comercio al por mayor y al por menor", postable: true },
  { code: "4155", name: "Actividades inmobiliarias y de servicios", postable: true },
  { code: "4175", name: "Devoluciones, rebajas y descuentos en ventas", postable: true, nature: "D" },
  // Clase 5 · Gastos
  { code: "5", name: "Gastos", postable: false },
  { code: "5105", name: "Gastos de personal", postable: true },
  { code: "5135", name: "Servicios", postable: true },
  { code: "5140", name: "Gastos legales", postable: true },
  { code: "5195", name: "Diversos", postable: true },
  { code: "5305", name: "Gastos financieros", postable: true },
  // Clase 6 · Costos de ventas
  { code: "6", name: "Costos de ventas", postable: false },
  { code: "6135", name: "Costo de ventas: comercio al por mayor y al por menor", postable: true },
  { code: "6155", name: "Costo de ventas: servicios", postable: true },
];

/** Naturaleza normal por tipo: activo, gasto y costo aumentan por el débito; el resto, por el crédito. */
export const natureOf = (type: AccountType): "D" | "C" => (type === "ASSET" || type === "EXPENSE" || type === "COST" ? "D" : "C");
export const typeOf = (code: string): AccountType | null => CLASS_TYPE[code[0] ?? ""] ?? null;

/** La plantilla completa lista para guardar. */
export const PUC_TEMPLATE = T.map((r) => {
  const type = typeOf(r.code)!;
  return { code: r.code, name: r.name, type, nature: r.nature ?? natureOf(type), postable: r.postable };
});

/** Valida una cuenta nueva: código numérico de 4 a 10 dígitos que cuelga de una cuenta existente. */
export function validateAccount(input: { code: string; name: string }, existingCodes: readonly string[]): string | null {
  if (!/^[1-7]\d{3,9}$/.test(input.code)) return "El código son de 4 a 10 dígitos y empieza por la clase (1 a 7).";
  if (input.name.trim().length < 3) return "Escribe el nombre de la cuenta.";
  if (existingCodes.includes(input.code)) return "Ya existe una cuenta con ese código.";
  // El padre inmediato: la cuenta (4 dígitos) cuelga de su grupo (2); la subcuenta, de su cuenta (4).
  const parent = input.code.length === 4 ? input.code.slice(0, 2) : input.code.slice(0, 4);
  if (!existingCodes.includes(parent)) return "El código debe colgar de una cuenta existente (por ejemplo 110505 cuelga de 1105).";
  return null;
}

/* ------------------------------- Reglas ------------------------------- */

export type RuleAmount = "total" | "subtotal" | "tax" | "cost" | "payment" | "withholding" | "tip";
export type RuleLine = { side: "D" | "C"; account: string; amount: RuleAmount; label: string };
export type RuleTemplate = { event: string; name: string; lines: RuleLine[] };

/** Asientos de partida: cada hecho del negocio y sus cuentas (el contador puede desactivarlos). */
export const DEFAULT_RULES: readonly RuleTemplate[] = [
  { event: "SALE", name: "Venta", lines: [{ side: "D", account: "1305", amount: "total", label: "Cliente" }, { side: "C", account: "4135", amount: "subtotal", label: "Ingreso por ventas (neto de descuentos)" }, { side: "C", account: "2408", amount: "tax", label: "IVA generado" }] },
  { event: "SALE_COST", name: "Costo de la venta", lines: [{ side: "D", account: "6135", amount: "cost", label: "Costo de ventas" }, { side: "C", account: "1435", amount: "cost", label: "Inventario" }] },
  { event: "SALE_COST_RETURN", name: "Costo de una devolución", lines: [{ side: "D", account: "1435", amount: "cost", label: "Inventario" }, { side: "C", account: "6135", amount: "cost", label: "Costo de ventas" }] },
  { event: "PAYMENT_RECEIVED", name: "Cobro de una venta o cuenta", lines: [{ side: "D", account: "1105", amount: "payment", label: "Caja o banco" }, { side: "C", account: "1305", amount: "payment", label: "Cliente" }] },
  { event: "CREDIT_NOTE", name: "Nota crédito", lines: [{ side: "D", account: "4175", amount: "subtotal", label: "Devolución o descuento en ventas" }, { side: "D", account: "2408", amount: "tax", label: "IVA devuelto" }, { side: "C", account: "1305", amount: "total", label: "Cliente" }] },
  { event: "DEBIT_NOTE", name: "Nota débito", lines: [{ side: "D", account: "1305", amount: "total", label: "Cliente" }, { side: "C", account: "4155", amount: "subtotal", label: "Ingreso por cargos" }, { side: "C", account: "2408", amount: "tax", label: "IVA generado" }] },
  { event: "PURCHASE_RECEIVED", name: "Compra recibida", lines: [{ side: "D", account: "1435", amount: "subtotal", label: "Inventario" }, { side: "D", account: "1355", amount: "tax", label: "IVA descontable" }, { side: "C", account: "2205", amount: "total", label: "Proveedor" }] },
  { event: "SUPPLIER_PAID", name: "Pago a proveedor", lines: [{ side: "D", account: "2205", amount: "payment", label: "Proveedor" }, { side: "C", account: "1105", amount: "payment", label: "Caja o banco" }] },
  { event: "EXPENSE_PAID", name: "Gasto pagado", lines: [{ side: "D", account: "5195", amount: "total", label: "Gasto" }, { side: "C", account: "1105", amount: "total", label: "Caja o banco" }] },
];

/** ¿Las líneas de una regla cuadran (hay débitos y créditos y las cuentas existen)? Valida el DISEÑO, no los montos. */
export function validateRule(lines: readonly RuleLine[], accountCodes: readonly string[]): string | null {
  if (!lines.some((l) => l.side === "D") || !lines.some((l) => l.side === "C")) return "Una regla necesita al menos un débito y un crédito.";
  const missing = lines.find((l) => !accountCodes.includes(l.account));
  return missing ? `La cuenta ${missing.account} no existe en tu plan de cuentas.` : null;
}

/* ------------------------------- Períodos ------------------------------- */

export const periodOfDate = (isoDate: string): { year: number; month: number } => ({ year: Number(isoDate.slice(0, 4)), month: Number(isoDate.slice(5, 7)) });
export const periodLabel = (year: number, month: number) => `${["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"][month - 1]} de ${year}`;
