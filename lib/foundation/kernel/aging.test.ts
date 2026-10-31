import { describe, expect, it } from "vitest";
import { ageItems, balanceOf, bucketOf, daysOverdue, validatePayment } from "./aging";

describe("cartera", () => {
  it("saldo y días de mora", () => {
    expect(balanceOf(1000, 250.5)).toBe(749.5);
    expect(balanceOf(1000, 1200)).toBe(0);
    expect(daysOverdue("2026-10-01", "2026-10-24")).toBe(23);
    expect(daysOverdue("2026-11-01", "2026-10-24")).toBe(0);
    expect(daysOverdue(null, "2026-10-24")).toBe(0);
  });
  it("cubetas por antigüedad en sus límites", () => {
    const t = "2026-10-24";
    expect(bucketOf("2026-10-24", t)).toBe("current");
    expect(bucketOf("2026-10-23", t)).toBe("d1_30");
    expect(bucketOf("2026-09-24", t)).toBe("d1_30"); // 30 días
    expect(bucketOf("2026-09-23", t)).toBe("d31_60");
    expect(bucketOf("2026-08-25", t)).toBe("d31_60"); // 60
    expect(bucketOf("2026-08-24", t)).toBe("d61_90");
    expect(bucketOf("2026-07-26", t)).toBe("d61_90"); // 90
    expect(bucketOf("2026-07-25", t)).toBe("d90");
  });
  it("suma la cartera y deja fuera lo saldado", () => {
    const a = ageItems([
      { balance: 100, dueDate: "2026-10-30" },
      { balance: 200.5, dueDate: "2026-10-10" },
      { balance: 50, dueDate: "2026-01-01" },
      { balance: 0, dueDate: "2026-01-01" },
      { balance: 30, dueDate: null },
    ], "2026-10-24");
    expect(a.total).toBe(380.5);
    expect(a.count).toBe(4);
    expect(a.buckets.current).toEqual({ amount: 130, count: 2 });
    expect(a.buckets.d1_30).toEqual({ amount: 200.5, count: 1 });
    expect(a.buckets.d90).toEqual({ amount: 50, count: 1 });
  });
  it("valida el abono", () => {
    expect(validatePayment(0, 100)).toContain("mayor que cero");
    expect(validatePayment(100.01, 100)).toContain("mayor que el saldo");
    expect(validatePayment(100, 100)).toBeNull();
    expect(validatePayment(NaN, 100)).not.toBeNull();
  });
});
