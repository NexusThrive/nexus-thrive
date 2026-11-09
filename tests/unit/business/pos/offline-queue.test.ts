import { describe, expect, it } from "vitest";
import { dequeue, enqueue, isNetworkFailure, markFailed, QUEUE_LIMIT, readQueue, type QueuedSale, type Store } from "@/lib/business/pos/offline-queue";

const memory = (): Store & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
};
const sale = (id: string): QueuedSale => ({ id, at: "2026-11-08T10:00:00Z", label: `Venta ${id}`, input: { lines: [] } });

describe("cola de ventas sin conexión", () => {
  it("guarda, no repite y quita", () => {
    const s = memory();
    expect(enqueue(s, "demo", sale("a"))).toHaveLength(1);
    expect(enqueue(s, "demo", sale("a"))).toHaveLength(1);
    expect(enqueue(s, "demo", sale("b"))).toHaveLength(2);
    expect(readQueue(s, "demo").map((x) => x.id)).toEqual(["a", "b"]);
    expect(dequeue(s, "demo", "a").map((x) => x.id)).toEqual(["b"]);
    expect(dequeue(s, "demo", "b")).toEqual([]);
    expect(s.data.size).toBe(0);
  });
  it("cada negocio tiene su cola", () => {
    const s = memory();
    enqueue(s, "uno", sale("a"));
    expect(readQueue(s, "dos")).toEqual([]);
  });
  it("marca el motivo del rechazo sin perder la venta", () => {
    const s = memory();
    enqueue(s, "demo", sale("a"));
    expect(markFailed(s, "demo", "a", "Abre tu turno para vender.")[0]).toMatchObject({ id: "a", error: "Abre tu turno para vender." });
  });
  it("se llena a su límite y tolera datos dañados o sin almacenamiento", () => {
    const s = memory();
    for (let i = 0; i < QUEUE_LIMIT; i++) enqueue(s, "demo", sale(String(i)));
    expect(enqueue(s, "demo", sale("extra"))).toBeNull();
    s.setItem("nx:pos-queue:malo", "{no es json");
    expect(readQueue(s, "malo")).toEqual([]);
    expect(readQueue(null, "demo")).toEqual([]);
    expect(enqueue(null, "demo", sale("x"))).toHaveLength(1);
  });
  it("distingue un fallo de red de una respuesta del servidor", () => {
    expect(isNetworkFailure(new TypeError("Failed to fetch"))).toBe(true);
    expect(isNetworkFailure(new Error("Abre tu turno para vender."))).toBe(false);
  });
});
