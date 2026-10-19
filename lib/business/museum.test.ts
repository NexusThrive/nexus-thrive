import { describe, expect, test } from "vitest";
import { DEFAULT_MUSEUM, museumSettings, parseMuseumSettings, slotLoads, ticketCode, validateTicketSale, visitorReport, weekdayOf } from "./museum";

const settings = { ...DEFAULT_MUSEUM, capacityPerSlot: 10, slots: ["09:00", "10:00"], closedWeekdays: [1] };
const prices = new Map([
  ["gen", { name: "General", price: 15000 }],
  ["est", { name: "Estudiante", price: 8000 }],
]);
const sale = (slot: string, visitors: number, status = "PAID") => ({ slot, visitors, status, kind: "TAQUILLA", total: visitors * 15000, lines: [{ productId: "gen", name: "General", qty: visitors, unitPrice: 15000 }] });

describe("museo · ajustes", () => {
  test("usa valores por defecto si no hay ajustes o son inválidos", () => {
    expect(museumSettings(null)).toEqual(DEFAULT_MUSEUM);
    expect(museumSettings({ museum: { capacityPerSlot: -2, slots: ["25:00", "09:00"] } }).slots).toEqual(["09:00"]);
  });
  test("valida lo que escribe el dueño", () => {
    const ok = parseMuseumSettings({ capacityPerSlot: 30, slots: "9:00, 10:30 14:00 10:30", closedWeekdays: [1, 1], guidedMinutes: 45 });
    expect(ok).toEqual({ ok: true, value: { capacityPerSlot: 30, slots: ["09:00", "10:30", "14:00"], closedWeekdays: [1], guidedMinutes: 45 } });
    expect(parseMuseumSettings({ capacityPerSlot: 30, slots: "9h", closedWeekdays: [], guidedMinutes: 45 }).ok).toBe(false);
    expect(parseMuseumSettings({ capacityPerSlot: 30, slots: "09:00", closedWeekdays: [0, 1, 2, 3, 4, 5, 6], guidedMinutes: 45 }).ok).toBe(false);
  });
});

describe("museo · aforo y venta", () => {
  test("la ocupación suma vendidas y reservadas, no anuladas", () => {
    const loads = slotLoads(settings, [sale("09:00", 4), sale("09:00", 3, "RESERVED"), sale("09:00", 9, "VOID")]);
    expect(loads[0]).toEqual({ slot: "09:00", sold: 4, reserved: 3, left: 3, capacity: 10 });
    expect(loads[1].left).toBe(10);
  });
  test("valida aforo, cierre, fecha pasada y grupo", () => {
    const load = { slot: "09:00", sold: 7, reserved: 0, left: 3, capacity: 10 };
    const base = { day: "2026-10-20", slot: "09:00", kind: "TAQUILLA", lines: [{ productId: "gen", qty: 2 }, { productId: "est", qty: 1 }], groupName: null, customerId: null };
    const ctx = { settings, load, todayKey: "2026-10-18", prices };
    expect(weekdayOf("2026-10-20")).toBe(2);
    expect(validateTicketSale(base, ctx)).toEqual({ ok: true, visitors: 3, total: 38000, lines: [{ productId: "gen", name: "General", qty: 2, unitPrice: 15000 }, { productId: "est", name: "Estudiante", qty: 1, unitPrice: 8000 }] });
    expect(validateTicketSale({ ...base, lines: [{ productId: "gen", qty: 4 }] }, ctx)).toMatchObject({ ok: false, message: expect.stringContaining("solo quedan 3") });
    expect(validateTicketSale({ ...base, day: "2026-10-19" }, ctx)).toMatchObject({ ok: false, message: expect.stringContaining("lunes") });
    expect(validateTicketSale({ ...base, day: "2026-10-17" }, ctx).ok).toBe(false);
    expect(validateTicketSale({ ...base, kind: "COLEGIO", groupName: "Colegio X" }, ctx)).toMatchObject({ ok: false, message: expect.stringContaining("cliente") });
    expect(validateTicketSale({ ...base, lines: [{ productId: "gen", qty: 0 }] }, ctx).ok).toBe(false);
  });
  test("código de entrada", () => expect(ticketCode(42)).toBe("T-000042"));
});

describe("museo · informe de visitantes", () => {
  test("totaliza por día, tipo, modalidad y franja", () => {
    const r = visitorReport(
      [
        { ...sale("09:00", 4), visitDate: "2026-10-18" },
        { ...sale("10:00", 2, "RESERVED"), kind: "COLEGIO", visitDate: "2026-10-18" },
        { ...sale("10:00", 6, "VOID"), visitDate: "2026-10-19" },
        { ...sale("10:00", 1), visitDate: "2026-10-19" },
      ],
      ["2026-10-18", "2026-10-19"],
    );
    expect(r.visitors).toBe(7);
    expect(r.revenue).toBe(75000);
    expect(r.byDay).toEqual([{ day: "2026-10-18", visitors: 6, revenue: 60000 }, { day: "2026-10-19", visitors: 1, revenue: 15000 }]);
    expect(r.byKind.map((k) => [k.label, k.visitors])).toEqual([["Taquilla", 5], ["Colegio", 2]]);
    expect(r.bySlot).toEqual([{ slot: "09:00", visitors: 4 }, { slot: "10:00", visitors: 3 }]);
    expect(r.busiestDay).toBe("2026-10-18");
  });
});
