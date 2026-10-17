import { describe, expect, it } from "vitest";
import { buildNotifications, unreadCount } from "./notifications";

const base = {
  movements: [
    { id: "payment-1", type: "in" as const, title: "Carlos", subtitle: "Corte · Nequi", amount: 35000, at: "2026-10-16T15:00:00Z" },
    { id: "expense-1", type: "out" as const, title: "Toallas", subtitle: "Insumos", amount: 20000, at: "2026-10-16T16:00:00Z" },
  ],
  bookings: [{ id: "b1", at: "2026-10-16T20:00:00Z", service: "Barba", customer: "Laura" }],
  expiring: 3,
  expired: 0,
  todayStart: "2026-10-16T05:00:00Z",
  modules: { finance: true, bookings: true, memberships: true },
};

describe("buildNotifications", () => {
  it("ordena de la más reciente a la más antigua", () => {
    const list = buildNotifications(base);
    expect(list.map((n) => n.kind)).toEqual(["booking", "expense", "payment", "membership"]);
    expect(list[2].title).toBe("Pago recibido · $ 35.000");
  });
  it("respeta los módulos activos", () => {
    const list = buildNotifications({ ...base, modules: { finance: false, bookings: false, memberships: true } });
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("3 membresías vencen esta semana");
  });
});

describe("unreadCount", () => {
  it("cuenta las posteriores a la última vista", () => {
    const list = buildNotifications(base);
    expect(unreadCount(list, null)).toBe(4);
    expect(unreadCount(list, "2026-10-16T15:30:00Z")).toBe(2);
  });
});
