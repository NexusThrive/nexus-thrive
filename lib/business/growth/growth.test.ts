import { describe, expect, it } from "vitest";
import { DIRECT, combineRatings, destinationUrl, googleReviewUrl, isLowRating, newShortCode, originFromParams, originReport, sanitizeOrigin, validateLink, validateReview } from "./growth";

const params = (q: string) => new URLSearchParams(q);

describe("origen y UTM", () => {
  it("lee el origen de la URL; sin utm_source es directo; limpia mayúsculas, tildes y signos", () => {
    expect(originFromParams(params("utm_source=Instagram&utm_medium=Social&utm_campaign=Lanzamiento%20Octubre"))).toEqual({ source: "instagram", medium: "social", campaign: "lanzamiento-octubre" });
    expect(originFromParams(params("utm_medium=social"))).toEqual(DIRECT);
    expect(originFromParams(params("utm_source=Café%20del%20Sol"))).toEqual({ source: "cafe-del-sol", medium: "ninguno", campaign: "" });
  });
  it("lo que manda el navegador se vuelve a limpiar", () => {
    expect(sanitizeOrigin({ source: "<script>x</script>", medium: "Social!", campaign: "A".repeat(200) })).toEqual({ source: "script-x-script", medium: "social", campaign: "a".repeat(60) });
    expect(sanitizeOrigin(null)).toEqual(DIRECT);
    expect(sanitizeOrigin({ source: 5 })).toEqual(DIRECT);
  });
  it("códigos cortos y URL final con UTM", () => {
    const codes = new Set(Array.from({ length: 300 }, newShortCode));
    expect(codes.size).toBe(300);
    expect([...codes][0]).toMatch(/^[a-hjkmnp-z2-9]{7}$/);
    expect(destinationUrl("https://app.nexus.co", "simplapp", { path: "", utmSource: "Instagram", utmMedium: "social", utmCampaign: "Octubre 1" })).toBe("https://app.nexus.co/s/simplapp?utm_source=instagram&utm_medium=social&utm_campaign=octubre-1");
  });
  it("valida el enlace", () => {
    const ok = { name: "Lanzamiento", utmSource: "instagram", utmMedium: "social", utmCampaign: "octubre", spend: 100_000, path: "" };
    expect(validateLink(ok)).toBeNull();
    expect(validateLink({ ...ok, name: "x" })).toContain("nombre");
    expect(validateLink({ ...ok, utmSource: "  " })).toContain("origen");
    expect(validateLink({ ...ok, spend: -1 })).toContain("inversión");
    expect(validateLink({ ...ok, path: "/admin" })).toContain("destino");
  });
});

describe("reporte inversión vs. resultados por origen", () => {
  const ig = { source: "instagram", medium: "social", campaign: "octubre" };
  const report = originReport({
    links: [{ utmSource: "instagram", utmMedium: "social", utmCampaign: "octubre", spend: 200_000, clicks: 120 }, { utmSource: "google", utmMedium: "cpc", utmCampaign: "marca", spend: 500_000, clicks: 80 }],
    leads: [{ origin: ig }, { origin: ig }, { origin: ig }, { origin: DIRECT }, { origin: { source: "google", medium: "cpc", campaign: "marca" } }],
    orders: [{ origin: ig, total: 600_000 }, { origin: ig, total: 400_000 }, { origin: DIRECT, total: 90_000 }],
  });
  it("suma por origen y calcula costo por contacto y retorno", () => {
    const by = Object.fromEntries(report.map((r) => [r.label, r]));
    expect(by["instagram / social / octubre"]).toMatchObject({ spend: 200_000, clicks: 120, leads: 3, orders: 2, revenue: 1_000_000, costPerLead: 66_667, roas: 5 });
    expect(by["google / cpc / marca"]).toMatchObject({ leads: 1, orders: 0, revenue: 0, costPerLead: 500_000, roas: 0 });
    expect(by["Directo"]).toMatchObject({ leads: 1, orders: 1, revenue: 90_000, spend: 0, costPerLead: null, roas: null });
  });
  it("ordena por lo que más vendió", () => {
    expect(report.map((r) => r.label)).toEqual(["instagram / social / octubre", "Directo", "google / cpc / marca"]);
  });
});

describe("reseñas", () => {
  it("1–2 estrellas son de alerta", () => {
    expect([1, 2, 3, 4, 5].map(isLowRating)).toEqual([true, true, false, false, false]);
  });
  it("valida estrellas y comentario", () => {
    expect(validateReview({ rating: 5, comment: "Excelente" })).toBeNull();
    for (const r of [0, 6, 3.5]) expect(validateReview({ rating: r, comment: "" })).toContain("estrellas");
    expect(validateReview({ rating: 4, comment: "x".repeat(601) })).toContain("largo");
  });
  it("combina Google e internas por cantidad", () => {
    expect(combineRatings([{ average: 4.6, count: 100 }, { average: 3, count: 10 }])).toEqual({ average: 4.45, count: 110 });
    expect(combineRatings([{ average: 5, count: 0 }])).toBeNull();
    expect(googleReviewUrl("ChIJ abc")).toBe("https://search.google.com/local/writereview?placeid=ChIJ%20abc");
  });
});
