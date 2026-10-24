/** Acciones de existencias en Storybook: datos de muestra, sin servidor ni base. */
import type { CountDetail } from "@/lib/inventory/stock-docs-db";

const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

const open: CountDetail = {
  id: "open",
  number: 4,
  code: "CT-0004",
  status: "DRAFT",
  warehouseId: "w2",
  warehouseName: "Norte",
  note: null,
  createdAt: "2026-10-24T14:00:00.000Z",
  completedAt: null,
  lines: [
    { id: "l1", productId: "p1", productName: "Barra de proteína", expected: 40, counted: null, adjustment: null },
    { id: "l2", productId: "p2", productName: "Proteína whey 2 lb", expected: 8, counted: null, adjustment: null },
    { id: "l3", productId: "p3", productName: "Shaker", expected: 15, counted: null, adjustment: null },
  ],
};
const SAMPLES: Record<string, CountDetail> = {
  open,
  closed: { ...open, id: "closed", status: "COMPLETED", note: "Conteo de fin de mes", completedAt: "2026-10-24T18:00:00.000Z", lines: [{ ...open.lines[0], counted: 38, adjustment: -2 }, { ...open.lines[1], counted: 8, adjustment: null }, { ...open.lines[2], counted: 16, adjustment: 1 }] },
};

export async function countDetailAction(_slug: string, id: string) {
  await wait();
  const count = SAMPLES[id];
  return count ? { ok: true as const, count } : { ok: false as const, message: "No se encontró el conteo." };
}
export async function createTransferAction(_slug: string, input: { lines: unknown[] }) {
  await wait();
  if (!input.lines.length) return { ok: false as const, message: "Agrega al menos un producto." };
  return { ok: true as const, id: "tr", message: "Traslado TR-0003 hecho" };
}
export async function createCountAction() {
  await wait();
  return { ok: true as const, id: "open", message: "Conteo CT-0004 abierto con 3 productos" };
}
export async function saveCountAction() {
  await wait();
  return { ok: true as const, message: "Avance guardado" };
}
export async function finalizeCountAction(_slug: string, _id: string, note: string) {
  await wait();
  if (note.trim().length < 3) return { ok: false as const, message: "Explica el motivo de las diferencias para poder ajustar." };
  return { ok: true as const, message: "Conteo cerrado: 2 ajustes (3 unidades) en el kardex" };
}
export async function cancelCountAction() {
  await wait();
  return { ok: true as const, message: "Conteo cancelado" };
}
export async function setLevelsAction(_slug: string, _id: string, levels: { minStock: number; maxStock: number | null; reorderPoint: number | null }) {
  await wait();
  if (levels.maxStock !== null && levels.maxStock < levels.minStock) return { ok: false as const, message: "El máximo no puede ser menor que el mínimo ni que el punto de reorden." };
  return { ok: true as const, message: "Niveles guardados" };
}
export async function createWarehouseAction() {
  await wait();
  return { ok: true as const, id: "w-new", message: "Bodega creada" };
}
