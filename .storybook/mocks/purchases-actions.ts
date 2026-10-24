/** Acciones de compras en Storybook: datos de muestra, sin servidor ni base. */
import type { OrderDetail } from "@/lib/purchasing/purchases-db";

const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

const base: OrderDetail = {
  id: "draft",
  number: 7,
  code: "OC-0007",
  status: "DRAFT",
  supplierPartyId: "s1",
  supplierName: "Distribuidora Andina SAS",
  warehouseId: "w1",
  warehouseName: "Principal",
  total: 1_785_000,
  subtotal: 1_500_000,
  taxTotal: 285_000,
  expectedDate: "2026-10-30",
  createdAt: "2026-10-24T14:00:00.000Z",
  note: "Entregar en el local antes de las 5 pm.",
  lineCount: 2,
  pendingUnits: 30,
  lines: [
    { id: "l1", productId: "p1", productName: "Proteína whey 2 lb", variantId: null, quantity: 20, receivedQuantity: 0, unitCost: 55_000, taxRatePct: 19 },
    { id: "l2", productId: "p2", productName: "Barra de proteína", variantId: null, quantity: 10, receivedQuantity: 0, unitCost: 40_000, taxRatePct: 19 },
  ],
  invoices: [],
};

const SAMPLES: Record<string, OrderDetail> = {
  draft: base,
  ordered: { ...base, id: "ordered", status: "ORDERED" },
  partial: { ...base, id: "partial", status: "PARTIAL", pendingUnits: 14, lines: [{ ...base.lines[0], receivedQuantity: 12 }, { ...base.lines[1], receivedQuantity: 4 }], invoices: [{ id: "i1", number: "FV-2201", issueDate: "2026-10-22", dueDate: "2026-11-21", total: 1_190_000, status: "REGISTERED" }] },
  received: { ...base, id: "received", status: "RECEIVED", pendingUnits: 0, lines: base.lines.map((l) => ({ ...l, receivedQuantity: l.quantity })) },
};

export async function orderDetailAction(_slug: string, id: string) {
  await wait();
  const order = SAMPLES[id];
  return order ? { ok: true as const, order } : { ok: false as const, message: "No se encontró la orden." };
}
export async function createOrderAction(_slug: string, input: { markOrdered: boolean; lines: unknown[] }) {
  await wait();
  if (!input.lines.length) return { ok: false as const, message: "Agrega al menos un producto." };
  return { ok: true as const, id: "new", message: `Orden OC-0008 ${input.markOrdered ? "enviada al proveedor" : "guardada como borrador"}` };
}
export async function markOrderedAction() {
  await wait();
  return { ok: true as const, message: "Orden marcada como pedida" };
}
export async function receiveOrderAction(_slug: string, _id: string, input: { items: { quantity: number }[] }) {
  await wait();
  const units = input.items.reduce((s, i) => s + i.quantity, 0);
  return { ok: true as const, message: `${units} unidades entraron al inventario` };
}
export async function cancelOrderAction() {
  await wait();
  return { ok: true as const, message: "Orden cancelada" };
}
export async function closeOrderAction() {
  await wait();
  return { ok: true as const, message: "Orden cerrada" };
}
export async function createSupplierAction(_slug: string, input: { legalName: string }) {
  await wait();
  return { ok: true as const, id: "s-new", message: "Proveedor creado", duplicates: input.legalName.toLowerCase().includes("andina") ? [{ partyId: "s1", legalName: "Distribuidora Andina SAS", reason: "name" as const }] : [] };
}
