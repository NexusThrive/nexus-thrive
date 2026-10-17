import { describe, expect, it } from "vitest";
import { roleKeyFrom, validateInvite, validateRole } from "./validators";

describe("validateInvite", () => {
  it("normaliza el correo y exige rol", () => {
    const r = validateInvite({ email: " Ana@Nexus.CO ", roleId: "r1" });
    expect(r.ok && r.value.email).toBe("ana@nexus.co");
    expect(validateInvite({ email: "ana", roleId: "" }).ok).toBe(false);
  });
});

describe("roles", () => {
  it("clave estable sin tildes", () => {
    expect(roleKeyFrom("Soporte Nocturno · Nivel 2")).toBe("soporte-nocturno-nivel-2");
  });
  it("exige nombre y al menos un permiso", () => {
    expect(validateRole({ name: "X", permissions: [] }).ok).toBe(false);
    expect(validateRole({ name: "Ventas Bogotá", permissions: ["leads.view"] }).ok).toBe(true);
  });
});

import { validateContact } from "./validators";
describe("validateContact", () => {
  it("exige un canal y un propósito válido", () => {
    expect(validateContact({ name: "Ana", purpose: "Dueño" }).ok).toBe(false);
    expect(validateContact({ name: "Ana", purpose: "Jefe", phone: "3001234567" }).ok).toBe(false);
    const r = validateContact({ name: "Ana", purpose: "Dueño", whatsapp: "+57 300 123 4567", preferredChannel: "WhatsApp" });
    expect(r.ok && r.value.preferredChannel).toBe("WhatsApp");
  });
});
