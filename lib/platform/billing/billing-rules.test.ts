import { describe, expect, it } from "vitest";
import { addMonths, checkConfirm, checkEvidence, DEFAULT_POLICY, dunning, periodAmount, periodEnd, validatePolicy } from "./billing-rules";

const P = DEFAULT_POLICY; // recordatorios 7/3/1, gracia 5, aviso 3

describe("facturación", () => {
  it("períodos mensuales y anuales respetan fin de mes", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(periodEnd("2026-10-17", "MONTHLY")).toBe("2026-11-17");
    expect(periodEnd("2026-10-17", "ANNUAL")).toBe("2027-10-17");
    expect(periodAmount(2900, "ANNUAL")).toBe(34800);
  });
  it("cobranza: recordatorio, gracia, aviso y suspensión", () => {
    const c = (dueDate: string, noticeDate: string | null = null) => dunning({ status: "PENDING", dueDate, noticeDate }, P, "2026-10-17");
    expect(c("2026-10-20")).toEqual({ stage: "upcoming", days: 3, remind: true });
    expect(c("2026-10-17").stage).toBe("due_today");
    expect(c("2026-10-14")).toMatchObject({ stage: "grace", overdue: 3 });
    expect(c("2026-10-10").stage).toBe("notice_needed");
    expect(c("2026-10-10", "2026-10-16")).toMatchObject({ stage: "notice_running", noticeLeft: 2 });
    expect(c("2026-10-01", "2026-10-13").stage).toBe("suspend_eligible");
    expect(dunning({ status: "PAID", dueDate: "2026-01-01", noticeDate: null }, P, "2026-10-17").stage).toBe("paid");
  });
  it("no confirma sin comprobante", () => {
    expect(checkConfirm({ status: "PENDING", evidenceCount: 0, method: "Nequi", paidDate: "2026-10-17" }).ok).toBe(false);
    expect(checkConfirm({ status: "PENDING", evidenceCount: 1, method: "Nequi", paidDate: "2026-10-17" }).ok).toBe(true);
    expect(checkConfirm({ status: "PAID", evidenceCount: 1, method: "Nequi", paidDate: "2026-10-17" }).ok).toBe(false);
  });
  it("comprobante: tipo y tamaño", () => {
    expect(checkEvidence({ type: "application/pdf", size: 1000 })).toBeNull();
    expect(checkEvidence({ type: "text/html", size: 1000 })).not.toBeNull();
    expect(checkEvidence({ type: "image/png", size: 9 * 1024 * 1024 })).not.toBeNull();
  });
  it("política válida", () => {
    expect(validatePolicy({ reminderDays: [1, 7, 3, 3], graceDays: 5, noticeDays: 3 })).toEqual({ ok: true, value: { reminderDays: [7, 3, 1], graceDays: 5, noticeDays: 3 } });
    expect(validatePolicy({ reminderDays: [], graceDays: 5, noticeDays: 0 }).ok).toBe(false);
  });
});
