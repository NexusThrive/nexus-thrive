import { describe, expect, it } from "vitest";
import { checkTransition, slaState, ticketCode, validateTicket } from "./support-rules";

const H = 3_600_000;
const t0 = Date.UTC(2026, 9, 17, 12);

describe("Soporte", () => {
  it("código con año y consecutivo", () => {
    expect(ticketCode(2026, 124)).toBe("SUP-2026-00124");
  });
  it("resolver exige solución; cerrar solo desde resuelto", () => {
    expect(checkTransition("OPEN", "RESOLVED", "").ok).toBe(false);
    expect(checkTransition("OPEN", "RESOLVED", "Se reinició la sesión").ok).toBe(true);
    expect(checkTransition("OPEN", "CLOSED", "x").ok).toBe(false);
    expect(checkTransition("RESOLVED", "CLOSED", null).ok).toBe(true);
    expect(checkTransition("CLOSED", "OPEN", null).ok).toBe(true);
  });
  it("SLA: primera respuesta, en riesgo, vencido y pausado", () => {
    const base = { priority: "HIGH" as const, status: "NEW" as const, createdAt: t0, firstResponseAt: null, resolvedAt: null };
    expect(slaState(base, t0 + 1 * H).state).toBe("ok");
    expect(slaState(base, t0 + 3.5 * H).state).toBe("at_risk");
    expect(slaState(base, t0 + 5 * H)).toMatchObject({ state: "breached", kind: "response" });
    expect(slaState({ ...base, firstResponseAt: t0 + H }, t0 + 5 * H)).toMatchObject({ state: "ok", kind: "resolution" });
    expect(slaState({ ...base, status: "WAITING_CUSTOMER" }, t0 + 50 * H).state).toBe("paused");
    expect(slaState({ ...base, status: "RESOLVED", resolvedAt: t0 + 10 * H }, t0 + 99 * H).state).toBe("met");
  });
  it("valida el ticket", () => {
    expect(validateTicket({ subject: "No", description: "", category: "x", priority: "MAX", channel: "Fax" }).ok).toBe(false);
    expect(validateTicket({ subject: "No puedo entrar", description: "Error al iniciar sesión", category: "Acceso y cuenta", priority: "HIGH", channel: "WhatsApp" }).ok).toBe(true);
  });
});
