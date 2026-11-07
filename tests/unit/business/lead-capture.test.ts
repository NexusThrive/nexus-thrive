import { describe, expect, it } from "vitest";
import { embedSnippet, looksLikeSpam, newFormKey, normalizeOrigin, originAllowed, readCapture, validateCapture, validateOrigins, FORM_KEY_PATTERN } from "@/lib/business/growth/lead-capture";

describe("captura de interesados (HU-lead-capture-01)", () => {
  it("la clave pública tiene formato propio y no se repite", () => {
    const keys = new Set(Array.from({ length: 50 }, newFormKey));
    expect(keys.size).toBe(50);
    for (const k of keys) expect(k).toMatch(FORM_KEY_PATTERN);
  });
  it("normaliza orígenes y rechaza rutas, comodines y esquemas raros", () => {
    expect(normalizeOrigin("HTTPS://MiTienda.com/")).toBe("https://mitienda.com");
    expect(normalizeOrigin("http://localhost:3000")).toBe("http://localhost:3000");
    for (const bad of ["mitienda.com", "https://*.mitienda.com", "https://mitienda.com/pagina", "https://mitienda.com?x=1", "ftp://mitienda.com", "javascript:alert(1)", "https://user:pw@mitienda.com"]) expect(normalizeOrigin(bad), bad).toBeNull();
  });
  it("solo acepta el origen exacto; sin cabecera Origin se rechaza", () => {
    const allowed = ["https://mitienda.com", "https://www.mitienda.com"];
    expect(originAllowed(allowed, "https://mitienda.com")).toBe(true);
    expect(originAllowed(allowed, "HTTPS://WWW.MITIENDA.COM")).toBe(true);
    expect(originAllowed(allowed, "https://mitienda.com.evil.com")).toBe(false);
    expect(originAllowed(allowed, "https://evil.com")).toBe(false);
    expect(originAllowed(allowed, "http://mitienda.com")).toBe(false);
    expect(originAllowed(allowed, null)).toBe(false);
    expect(originAllowed([], "https://mitienda.com")).toBe(false);
  });
  it("valida la lista de dominios al crear el formulario", () => {
    expect(validateOrigins(["https://mitienda.com"])).toBeNull();
    expect(validateOrigins([])).toContain("al menos un dominio");
    expect(validateOrigins(["mitienda.com"])).toContain("no es un dominio válido");
    expect(validateOrigins(Array.from({ length: 11 }, (_, i) => `https://s${i}.com`))).toContain("10");
  });
  it("el envío exige nombre, celular, correo válido y consentimiento", () => {
    const ok = readCapture({ name: "Camila Torres", phone: "300 111 2233", email: "CAMILA@ejemplo.com", message: "Quiero cotizar", consent: true });
    expect(ok.email).toBe("camila@ejemplo.com");
    expect(validateCapture(ok)).toBeNull();
    expect(validateCapture({ ...ok, name: "ab" })).toMatchObject({ field: "name" });
    expect(validateCapture({ ...ok, phone: "123" })).toMatchObject({ field: "phone" });
    expect(validateCapture({ ...ok, email: "no-es-correo" })).toMatchObject({ field: "email" });
    expect(validateCapture({ ...ok, consent: false })).toMatchObject({ field: "consent" });
    expect(readCapture({ name: 123, consent: "on" })).toMatchObject({ name: "", consent: true });
    expect(readCapture(null).name).toBe("");
  });
  it("detecta spam: trampa llena, varios enlaces o palabras de bot; un solo enlace no", () => {
    const base = readCapture({ name: "Camila Torres", phone: "3001112233", message: "Hola", consent: true });
    expect(looksLikeSpam(base)).toBe(false);
    expect(looksLikeSpam({ ...base, website: "http://spam.com" })).toBe(true);
    expect(looksLikeSpam({ ...base, message: "mira https://a.com y https://b.com" })).toBe(true);
    expect(looksLikeSpam({ ...base, message: "mi catálogo: https://a.com" })).toBe(false);
    expect(looksLikeSpam({ ...base, message: "Compra bitcoin ya" })).toBe(true);
  });
  it("el código para pegar en la web no lleva ninguna credencial privada", () => {
    const html = embedSnippet("https://app.nexus.co", "lf_0123456789abcdef0123456789abcdef");
    expect(html).toContain("/api/lead-capture/lf_0123456789abcdef0123456789abcdef");
    expect(html).not.toMatch(/nx_(live|test)_/);
    expect(html).toContain('name="website"');
    expect(html).toContain('name="consent"');
  });
});
