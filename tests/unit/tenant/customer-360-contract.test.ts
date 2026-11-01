/**
 * Contrato de aportes a la ficha 360° (G1): `buildCustomer360` une la base de
 * Core con los aportes de otras capacidades sin conocerlas. Función pura.
 */
import { describe, expect, test } from "vitest";
import { buildCustomer360, type Customer360Base, type Customer360Contribution, type CustomerTimelineEvent } from "@/lib/tenant/db";

const event = (id: string, type: CustomerTimelineEvent["type"], date: string): CustomerTimelineEvent => ({ id, type, date, title: id });

function base(overrides: Partial<Customer360Base> = {}): Customer360Base {
  return {
    customer: { id: "c1", name: "Cliente", email: null, phone: null, active: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
    payments: [],
    paymentsTotal: 0,
    notes: [],
    paymentEvents: [],
    noteEvents: [],
    ltv: 0,
    approvedCount: 0,
    pendingCount: 0,
    favoriteMethod: null,
    lastActivityDate: null,
    ...overrides,
  };
}

const payment = { id: "p", amount: 1, status: "APPROVED", provider: "CASH", providerRefId: null, description: null, createdAt: "2026-03-01T00:00:00Z" } as const;
const note = { id: "n", content: "x", authorName: null, createdAt: "2026-03-02T00:00:00Z" };
const contribution = (o: Partial<Customer360Contribution> = {}): Customer360Contribution => ({ events: [], lastActivityDate: null, hasRecords: false, accountSignal: null, ...o });

describe("estado de cuenta", () => {
  test("sin pagos, notas ni aportes → sin actividad", () => {
    expect(buildCustomer360(base()).metrics.accountStatus).toBe("sin_actividad");
    expect(buildCustomer360(base(), [contribution()]).metrics.accountStatus).toBe("sin_actividad");
  });

  test("solo notas → sin datos", () => {
    expect(buildCustomer360(base({ notes: [note] })).metrics.accountStatus).toBe("sin_datos");
  });

  test("pagos aprobados → al día; pendientes → pendiente", () => {
    expect(buildCustomer360(base({ payments: [payment], approvedCount: 1, ltv: 1 })).metrics.accountStatus).toBe("al_dia");
    expect(buildCustomer360(base({ payments: [payment], pendingCount: 1 })).metrics.accountStatus).toBe("pendiente");
  });

  test("un aporte con registros pero sin señal no es «sin actividad»", () => {
    expect(buildCustomer360(base(), [contribution({ hasRecords: true })]).metrics.accountStatus).toBe("sin_datos");
  });

  test("un aporte vigente deja la cuenta al día; si hay pagos pendientes, pendiente", () => {
    const current = contribution({ hasRecords: true, accountSignal: "current" });
    expect(buildCustomer360(base(), [current]).metrics.accountStatus).toBe("al_dia");
    expect(buildCustomer360(base({ payments: [payment], pendingCount: 1 }), [current]).metrics.accountStatus).toBe("pendiente");
  });

  test("un aporte vencido gana a los pagos pendientes", () => {
    const overdue = contribution({ hasRecords: true, accountSignal: "overdue" });
    expect(buildCustomer360(base({ payments: [payment], pendingCount: 1 }), [overdue]).metrics.accountStatus).toBe("vencido");
  });

  test("con varios aportes, cualquiera vencido deja la cuenta vencida", () => {
    const overdue = contribution({ hasRecords: true, accountSignal: "overdue" });
    const current = contribution({ hasRecords: true, accountSignal: "current" });
    expect(buildCustomer360(base(), [current, overdue]).metrics.accountStatus).toBe("vencido");
    expect(buildCustomer360(base(), [overdue, current]).metrics.accountStatus).toBe("vencido");
  });
});

describe("línea de tiempo y actividad", () => {
  test("ordena de más reciente a más antiguo mezclando los aportes", () => {
    const details = buildCustomer360(
      base({ paymentEvents: [event("pago", "payment", "2026-03-01")], noteEvents: [event("nota", "note", "2026-05-01")] }),
      [contribution({ events: [event("membresia", "membership", "2026-04-01")] })],
    );
    expect(details.timeline.map((e) => e.id)).toEqual(["nota", "membresia", "pago"]);
  });

  test("ante fechas iguales conserva el orden pagos → aportes → notas", () => {
    const d = "2026-04-01";
    const details = buildCustomer360(
      base({ paymentEvents: [event("pago", "payment", d)], noteEvents: [event("nota", "note", d)] }),
      [contribution({ events: [event("aporte", "membership", d)] })],
    );
    expect(details.timeline.map((e) => e.id)).toEqual(["pago", "aporte", "nota"]);
  });

  test("limita la línea de tiempo a 30 eventos", () => {
    const many = Array.from({ length: 40 }, (_, i) => event(`e${i}`, "membership", `2026-02-${String((i % 28) + 1).padStart(2, "0")}`));
    expect(buildCustomer360(base(), [contribution({ events: many })]).timeline).toHaveLength(30);
  });

  test("la última actividad es la más reciente entre Core y los aportes", () => {
    expect(buildCustomer360(base({ lastActivityDate: "2026-03-01T00:00:00Z" }), [contribution({ lastActivityDate: "2026-06-01T00:00:00Z" })]).metrics.lastActivityDate).toBe("2026-06-01T00:00:00Z");
    expect(buildCustomer360(base({ lastActivityDate: "2026-09-01T00:00:00Z" }), [contribution({ lastActivityDate: "2026-06-01T00:00:00Z" })]).metrics.lastActivityDate).toBe("2026-09-01T00:00:00Z");
    expect(buildCustomer360(base(), [contribution({ lastActivityDate: "2026-06-01T00:00:00Z" })]).metrics.lastActivityDate).toBe("2026-06-01T00:00:00Z");
    expect(buildCustomer360(base(), []).metrics.lastActivityDate).toBeNull();
  });
});

describe("métricas de Core", () => {
  test("ticket promedio = LTV / pagos aprobados, y 0 sin pagos aprobados", () => {
    expect(buildCustomer360(base({ ltv: 150000, approvedCount: 2 })).metrics.avgTicket).toBe(75000);
    expect(buildCustomer360(base()).metrics.avgTicket).toBe(0);
  });

  test("no inventa datos de ningún rubro: sin aportes no hay eventos de membresía", () => {
    const details = buildCustomer360(base({ paymentEvents: [event("pago", "payment", "2026-03-01")] }));
    expect(details.timeline.some((e) => e.type === "membership")).toBe(false);
    expect("memberships" in details).toBe(false);
  });
});
