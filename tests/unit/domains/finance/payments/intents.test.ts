import { describe, expect, it } from "vitest";
import { CONFIRMABLE_STATUSES, estimateFee, validateTariff, MANUAL_PROVIDER, STATUS_LABELS, effectiveStatus, validateProof, validateRejection, newReference, parseReport, payButtonHtml, pickGateway, reconcile, validateIntent, wompiEnvironment } from "@/lib/domains/finance/payments/intents";
import { sandboxPaymentsAllowed } from "@/lib/foundation/environment";

describe("cobros en línea", () => {
  it("el código del enlace es largo, legible y distinto cada vez", () => {
    const codes = new Set(Array.from({ length: 200 }, newReference));
    expect(codes.size).toBe(200);
    for (const c of codes) expect(c).toMatch(/^[a-hjkmnp-z2-9]{14}$/);
  });
  it("un pendiente pasado de plazo se ve vencido; lo demás no cambia", () => {
    const now = Date.parse("2026-10-24T12:00:00Z");
    expect(effectiveStatus("PENDING", "2026-10-24T11:00:00Z", now)).toBe("EXPIRED");
    expect(effectiveStatus("PENDING", "2026-10-25T11:00:00Z", now)).toBe("PENDING");
    expect(effectiveStatus("PAID", "2026-10-01T00:00:00Z", now)).toBe("PAID");
  });
  it("valida valor, descripción y vigencia", () => {
    expect(validateIntent({ amount: 50_000, description: "Matrícula", expiresInHours: 48 })).toBeNull();
    expect(validateIntent({ amount: 500, description: "Matrícula", expiresInHours: 48 })).toContain("mínimo");
    expect(validateIntent({ amount: 50_000, description: "x", expiresInHours: 48 })).toContain("qué se está cobrando");
    expect(validateIntent({ amount: 50_000, description: "Matrícula", expiresInHours: 0 })).toContain("vigencia");
  });
  it("la conciliación marca lo que falta de cada lado y el monto distinto", () => {
    const r = reconcile(
      [{ externalId: "a", amount: 100 }, { externalId: "b", amount: 200 }, { externalId: "c", amount: 300 }],
      [{ externalId: "a", amount: 100 }, { externalId: "b", amount: 250 }, { externalId: "d", amount: 50 }],
    );
    expect(r.matched).toBe(1);
    expect(r.differences).toEqual([
      { kind: "amount_mismatch", externalId: "b", expected: 200, reported: 250 },
      { kind: "missing_in_provider", externalId: "c", expected: 300, reported: null },
      { kind: "missing_in_nexus", externalId: "d", expected: null, reported: 50 },
    ]);
    expect(r.expectedTotal).toBe(600);
    expect(r.reportedTotal).toBe(400);
    expect(reconcile([{ externalId: "a", amount: 1 }], [{ externalId: "a", amount: 1 }]).differences).toEqual([]);
  });
  it("lee el reporte pegado con o sin encabezado y avisa de líneas ilegibles", () => {
    expect(parseReport("id,valor\ntx1,150.000\ntx2;80000\n\nmalo\n")).toEqual({ rows: [{ externalId: "tx1", amount: 150000 }, { externalId: "tx2", amount: 80000 }], bad: [5] });
  });
  it("el botón de pago apunta al enlace", () => {
    expect(payButtonHtml("https://x.co/pay/abc")).toContain('href="https://x.co/pay/abc"');
  });
});

describe("pasarela de cada negocio (HU-wompi-negocio-01)", () => {
  it("elige la pasarela pedida si está conectada, si no la primera y, sin ninguna, el cobro manual", () => {
    expect(pickGateway(["wompi", "sandbox"], "sandbox")).toBe("sandbox");
    expect(pickGateway(["wompi"], "nequi")).toBe("wompi");
    expect(pickGateway(["wompi"])).toBe("wompi");
    expect(pickGateway([])).toBe(MANUAL_PROVIDER);
    expect(pickGateway([], "sandbox")).toBe(MANUAL_PROVIDER);
  });
  it("el entorno de Wompi sale de la llave pública", () => {
    expect(wompiEnvironment("pub_prod_abc123")).toBe("production");
    expect(wompiEnvironment(" pub_test_abc123 ")).toBe("sandbox");
    expect(wompiEnvironment("prv_prod_abc")).toBeNull();
    expect(wompiEnvironment("")).toBeNull();
  });
});

describe("pasarela de prueba en producción", () => {
  it("solo se permite fuera de producción o con la habilitación explícita", () => {
    expect(sandboxPaymentsAllowed({ NODE_ENV: "development" })).toBe(true);
    expect(sandboxPaymentsAllowed({ NODE_ENV: "production" })).toBe(false);
    expect(sandboxPaymentsAllowed({ NODE_ENV: "production", ALLOW_SANDBOX_PAYMENTS: "true" })).toBe(true);
  });
});

describe("transferencia en verificación (HU-verificacion-01)", () => {
  it("un comprobante exige referencia y no es largo de más", () => {
    expect(validateProof("Bancolombia 88231")).toBeNull();
    expect(validateProof("ab")).toContain("referencia");
    expect(validateProof("x".repeat(201))).toContain("largo");
  });
  it("rechazar exige un motivo", () => {
    expect(validateRejection("El monto no coincide")).toBeNull();
    expect(validateRejection(" ")).toContain("por qué");
  });
  it("en verificación todavía se puede confirmar, y no vence solo", () => {
    expect(CONFIRMABLE_STATUSES).toEqual(["PENDING", "VERIFYING"]);
    expect(effectiveStatus("VERIFYING", "2020-01-01T00:00:00Z", Date.parse("2026-11-01T00:00:00Z"))).toBe("VERIFYING");
    expect(STATUS_LABELS.VERIFYING).toBe("En verificación");
  });
});

describe("comisión estimada de la pasarela (HU-tesoreria-01)", () => {
  it("porcentaje, fijo e IVA de la comisión: bruto, comisión y neto cuadran", () => {
    const t = { feePct: 2.65, feeFixed: 700, feeVatPct: 19 };
    const r = estimateFee(100_000, t);
    // (2.650 + 700) × 1,19 = 3.986,50
    expect(r).toEqual({ fee: 3986.5, net: 96013.5 });
    expect(r.fee + r.net).toBe(100_000);
  });
  it("sin tarifa no hay comisión estimada, y la comisión nunca supera el cobro", () => {
    expect(estimateFee(100_000, { feePct: 0, feeFixed: 0, feeVatPct: 0 })).toEqual({ fee: 0, net: 100_000 });
    expect(estimateFee(500, { feePct: 2, feeFixed: 40_000, feeVatPct: 0 })).toEqual({ fee: 500, net: 0 });
    expect(estimateFee(0, { feePct: 3, feeFixed: 0, feeVatPct: 0 })).toEqual({ fee: 0, net: 0 });
  });
  it("valida la tarifa", () => {
    expect(validateTariff({ feePct: 2.65, feeFixed: 700, feeVatPct: 19 })).toBeNull();
    expect(validateTariff({ feePct: 45, feeFixed: 0, feeVatPct: 0 })).toContain("30");
    expect(validateTariff({ feePct: -1, feeFixed: 0, feeVatPct: 0 })).toContain("válida");
    expect(validateTariff({ feePct: 1, feeFixed: 60_000, feeVatPct: 0 })).toContain("50.000");
  });
});
