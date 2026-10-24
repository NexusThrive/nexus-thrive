/** Facturación en Storybook: documentos de muestra, sin servidor ni base. */
const wait = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

const issuer = { name: "Simplapp Gym", legalName: "Simplapp S.A.S.", taxId: "900123456-7", address: "Calle 80 # 12-34", city: "Bogotá", phone: "+57 300 123 4567" };
const bill = {
  id: "b1", kind: "BILL", code: "CC-000012", status: "ISSUED", issueDate: "2026-10-01", dueDate: "2026-10-31",
  customer: { name: "Gimnasio Atlas", doc: "900555444" }, issuer,
  lines: [{ description: "Asesoría de implementación", quantity: 1, unitPrice: 1_000_000, discountPct: 0, taxRatePct: 19, total: 1_190_000 }, { description: "Capacitación (4 h)", quantity: 4, unitPrice: 50_000, discountPct: 10, taxRatePct: 19, total: 214_200 }],
  subtotal: 1_200_000, discountTotal: 20_000, taxTotal: 224_200, total: 1_404_200, withholdings: [{ name: "Retefuente servicios 4 %", amount: 47_200 }], paid: 400_000, balance: 1_004_200,
  notes: "Pago a 30 días.", voidReason: null, source: null,
  related: [{ id: "n1", kind: "CREDIT_NOTE", code: "NC-000003", total: 119_000, status: "ISSUED" }, { id: "n2", kind: "DEBIT_NOTE", code: "ND-000001", total: 50_000, status: "ISSUED" }],
};
const credit = { ...bill, id: "n1", kind: "CREDIT_NOTE", code: "NC-000003", lines: [{ description: "Descuento por pronto pago", quantity: 1, unitPrice: 100_000, discountPct: 0, taxRatePct: 19, total: 119_000 }], subtotal: 100_000, discountTotal: 0, taxTotal: 19_000, total: 119_000, withholdings: [], paid: 0, balance: 0, notes: "Acuerdo comercial", source: { id: "b1", code: "CC-000012" }, related: [] };
const debit = { ...credit, id: "n2", kind: "DEBIT_NOTE", code: "ND-000001", lines: [{ description: "Intereses de mora", quantity: 1, unitPrice: 50_000, discountPct: 0, taxRatePct: 0, total: 50_000 }], subtotal: 50_000, taxTotal: 0, total: 50_000, notes: "Pago tardío" };
const DOCS: Record<string, unknown> = { b1: bill, n1: credit, n2: debit };

export async function viewDocumentAction(_slug: string, id: string) {
  await wait();
  return DOCS[id] ? { ok: true as const, doc: DOCS[id] } : { ok: false as const, message: "No se encontró el documento." };
}
export async function issueNoteAction(_slug: string, input: { amount: number; kind: string }) {
  await wait();
  if (input.amount > 1_000_000) return { ok: false as const, message: "La nota crédito no puede pasar de lo que queda del documento (1.290.000)." };
  return { ok: true as const, message: `${input.kind === "DEBIT_NOTE" ? "Nota débito" : "Nota crédito"} N.º 4 emitida` };
}
export async function payInvoiceAction() { await wait(); return { ok: true as const, message: "Pagada · R-000045" }; }
export async function voidInvoiceAction() { await wait(); return { ok: true as const, message: "Documento anulado" }; }
export async function createInvoiceAction() { await wait(); return { ok: true as const, id: "x", message: "Creado" }; }
