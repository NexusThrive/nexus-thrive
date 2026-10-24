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
