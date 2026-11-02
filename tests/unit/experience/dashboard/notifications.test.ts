import { describe, expect, it } from "vitest";
import { buildNotifications, unreadCount } from "@/lib/experience/dashboard/notifications";

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
    expect(list[2].title).toBe("Cobro registrado · $ 35.000");
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

describe("newArrivals", () => {
  const n = (id: string, at: string) => ({ id, kind: "payment" as const, title: id, detail: "", at, href: "/finance" });
  it("en la primera carga no avisa de lo que ya estaba", async () => {
    const { newArrivals } = await import("@/lib/experience/dashboard/notifications");
    expect(newArrivals(null, [n("a", "2026-10-16T10:00:00Z")], null)).toEqual([]);
  });
  it("avisa solo de lo nuevo y sin leer", async () => {
    const { newArrivals } = await import("@/lib/experience/dashboard/notifications");
    const known = new Set(["a"]);
    const items = [n("a", "2026-10-16T10:00:00Z"), n("b", "2026-10-16T11:00:00Z"), n("c", "2026-10-16T08:00:00Z")];
    expect(newArrivals(known, items, "2026-10-16T09:00:00Z").map((x) => x.id)).toEqual(["b"]);
    expect(newArrivals(known, items, null).map((x) => x.id)).toEqual(["b", "c"]);
  });
});


describe("severidad de las notificaciones (DR-40)", () => {
  const sev = { movements: [], bookings: [], expiring: 2, expired: 1, todayStart: "2026-10-12T05:00:00Z", modules: { finance: false, bookings: false, memberships: true } };

  it("por vencer pide atención y vencidas es urgente", () => {
    const list = buildNotifications(sev);
    expect(list.find((n) => n.id.startsWith("expiring-"))?.severity).toBe("action");
    expect(list.find((n) => n.id.startsWith("expired-"))?.severity).toBe("urgent");
  });

  it("un cobro solo informa (sin severidad o info)", () => {
    const list = buildNotifications({ ...sev, expiring: 0, expired: 0, modules: { finance: true, bookings: false, memberships: false }, movements: [{ id: "m1", type: "in", title: "Camila", subtitle: "Transferencia", amount: 120000, at: "2026-10-12T15:00:00Z" }] });
    expect(list[0].severity ?? "info").toBe("info");
  });
});
