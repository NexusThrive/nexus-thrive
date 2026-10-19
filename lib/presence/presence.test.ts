import { describe, expect, it } from "vitest";
import {
  computePresence,
  digitsOf,
  normalizeHandle,
  PRESENCE_CEILING_WITHOUT_SITE,
  stateOf,
  type PresenceInput,
  type WebsiteSignal,
} from "./presence";

const fullSite: WebsiteSignal = {
  url: "https://negocio.com",
  reachable: true,
  https: true,
  statusCode: 200,
  title: "Negocio",
  description: "Hacemos cosas",
  viewport: true,
};

const completeWithoutSite: PresenceInput = {
  name: "Café Central",
  address: "Calle 1 #2-3",
  whatsappNumber: "+57 300 123 4567",
  latitude: 4.65,
  longitude: -74.05,
  googleBusinessUrl: "https://maps.google.com/?cid=123",
  instagramHandle: "@cafe.central",
  catalogItems: 12,
};

describe("stateOf", () => {
  it("corta los cuatro tramos", () => {
    expect(stateOf(0)).toBe("INVISIBLE");
    expect(stateOf(25)).toBe("INVISIBLE");
    expect(stateOf(26)).toBe("VISIBLE");
    expect(stateOf(50)).toBe("VISIBLE");
    expect(stateOf(51)).toBe("CONECTADO");
    expect(stateOf(75)).toBe("CONECTADO");
    expect(stateOf(76)).toBe("DOMINANTE");
    expect(stateOf(100)).toBe("DOMINANTE");
  });
});

describe("digitsOf / normalizeHandle", () => {
  it("limpia teléfonos y handles", () => {
    expect(digitsOf("+57 (300) 123-4567")).toBe("573001234567");
    expect(digitsOf(null)).toBe("");
    expect(normalizeHandle("  @Cafe.Central ")).toBe("cafe.central");
    expect(normalizeHandle(null)).toBe("");
  });
});

describe("computePresence", () => {
  it("sin datos el negocio está invisible", () => {
    const result = computePresence({});
    expect(result.score).toBe(0);
    expect(result.state).toBe("INVISIBLE");
    expect(result.checks.every((c) => c.earned === 0)).toBe(true);
  });

  it("sin sitio el techo es PRESENCE_CEILING_WITHOUT_SITE", () => {
    const result = computePresence(completeWithoutSite);
    expect(result.score).toBe(PRESENCE_CEILING_WITHOUT_SITE);
    expect(result.state).toBe("CONECTADO");
  });

  it("un sitio verificado y optimizado completa el puntaje", () => {
    const result = computePresence({
      ...completeWithoutSite,
      websiteUrl: "https://negocio.com",
      website: fullSite,
    });
    expect(result.score).toBe(100);
    expect(result.state).toBe("DOMINANTE");
  });

  it("un sitio sin verificar no suma (nada sube por declararlo)", () => {
    const result = computePresence({
      ...completeWithoutSite,
      websiteUrl: "https://negocio.com",
      website: null,
    });
    expect(result.score).toBe(PRESENCE_CEILING_WITHOUT_SITE);
    const web = result.checks.find((c) => c.key === "webActive");
    expect(web?.earned).toBe(0);
    expect(web?.verified).toBe(true);
  });

  it("un sitio que no responde no activa los criterios de web", () => {
    const result = computePresence({
      ...completeWithoutSite,
      websiteUrl: "https://negocio.com",
      website: { ...fullSite, reachable: false, statusCode: 404 },
    });
    const active = result.checks.find((c) => c.key === "webActive");
    const optimized = result.checks.find((c) => c.key === "webOptimized");
    expect(active?.earned).toBe(0);
    expect(optimized?.earned).toBe(0);
  });

  it("la optimización es proporcional a las señales del sitio", () => {
    const result = computePresence({
      websiteUrl: "https://negocio.com",
      website: { ...fullSite, title: null, description: null, viewport: false },
    });
    // reachable(25) + https(4) = 29.
    expect(result.score).toBe(29);
  });

  it("la identidad exige nombre y dirección", () => {
    const onlyName = computePresence({ name: "Solo nombre" });
    expect(onlyName.checks.find((c) => c.key === "identity")?.earned).toBe(5);
  });
});
