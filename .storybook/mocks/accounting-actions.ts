/** Contabilidad en Storybook: respuestas de muestra, sin servidor ni base. */
const wait = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));
export async function loadPucAction() { await wait(); return { ok: true as const, message: "58 cuentas y 8 reglas cargadas" }; }
export async function createAccountAction(_s: string, code: string) { await wait(); return code === "199999" ? { ok: false as const, message: "El código debe colgar de una cuenta existente (por ejemplo 110505 cuelga de 1105)." } : { ok: true as const, message: "Cuenta creada" }; }
export async function toggleAccountAction(_s: string, _i: string, active: boolean) { await wait(); return { ok: true as const, message: active ? "Cuenta activada" : "Cuenta desactivada" }; }
export async function toggleRuleAction(_s: string, _i: string, active: boolean) { await wait(); return { ok: true as const, message: active ? "Regla activada" : "Regla desactivada" }; }
export async function createCostCenterAction(_s: string, code: string) { await wait(); return code === "ADM" ? { ok: false as const, message: "Ya existe un centro con ese código." } : { ok: true as const, message: "Centro de costo creado" }; }
export async function toggleCostCenterAction() { await wait(); return { ok: true as const, message: "Centro desactivado" }; }
export async function closePeriodAction(_s: string, y: number, m: number) { await wait(); return m === 7 ? { ok: false as const, message: "Primero cierra 06/2026: los cierres van en orden." } : { ok: true as const, message: `Mes ${String(m).padStart(2, "0")}/${y} cerrado` }; }
export async function reopenPeriodAction(_s: string, _y: number, _m: number, reason: string) { await wait(); return reason.length < 5 ? { ok: false as const, message: "Escribe el motivo de la reapertura." } : { ok: true as const, message: "Mes reabierto" }; }
export async function setEnabledAction(_s: string, enabled: boolean) { await wait(); return { ok: true as const, message: enabled ? "Contabilización automática activada: cada venta, cobro, nota y compra deja su asiento" : "Contabilización automática desactivada" }; }
export async function verifyLedgerAction() { await wait(); return { ok: true as const, message: "Libro íntegro: 6 asientos revisados, todos cuadran y el encadenado está intacto" }; }
export async function reportAction(_s: string, kind: string, from: string, to: string) {
  await wait();
  if (from > to) return { ok: false as const, message: "Revisa las fechas: «desde» no puede ser posterior a «hasta»." };
  if (kind === "income") return { ok: true as const, report: { kind: "income" as const, data: { income: [{ account: "4135", name: "Ingresos por ventas", amount: 700_000 }], cost: [{ account: "6135", name: "Costo de ventas", amount: 300_000 }], expenses: [{ account: "5135", name: "Servicios", amount: 80_000 }], totalIncome: 700_000, totalCost: 300_000, grossProfit: 400_000, totalExpenses: 80_000, netResult: 320_000 } } };
  const rows = [{ account: "1110", name: "Bancos", type: "ASSET" as const, debit: 5_595_000, credit: 80_000, balanceDebit: 5_515_000, balanceCredit: 0 }, { account: "1305", name: "Clientes", type: "ASSET" as const, debit: 833_000, credit: 595_000, balanceDebit: 238_000, balanceCredit: 0 }, { account: "3105", name: "Capital", type: "EQUITY" as const, debit: 0, credit: 5_000_000, balanceDebit: 0, balanceCredit: 5_000_000 }];
  return { ok: true as const, report: { kind: "trial" as const, data: { rows, totalDebit: 6_428_000, totalCredit: 6_428_000, totalBalanceDebit: 5_753_000, totalBalanceCredit: 5_000_000 + 753_000, balanced: true } } };
}
