import { describe, expect, it } from "vitest";
import { defaultLayout, isCustomized, moveWidget, normalizeLayout, placeWidget, setSpan, toggleWidget } from "./layout";

const IDS = ["kpis", "chart", "activity"] as const;

describe("normalizeLayout", () => {
  it("sin nada guardado devuelve el orden por defecto", () => {
    expect(normalizeLayout(null, IDS)).toEqual(defaultLayout(IDS));
  });
  it("descarta ids desconocidos y agrega los nuevos al final", () => {
    const l = normalizeLayout({ order: ["activity", "viejo"], hidden: ["viejo", "chart"] }, IDS);
    expect(l.order).toEqual(["activity", "kpis", "chart"]);
    expect(l.hidden).toEqual(["chart"]);
  });
  it("lee la v1 (sin tamaños) y la completa", () => {
    const l = normalizeLayout({ order: ["chart", "kpis", "activity"], hidden: [] }, IDS);
    expect(l.v).toBe(2);
    expect(l.spans).toEqual({});
  });
  it("conserva tamaños válidos y descarta los inválidos o de bloques que ya no existen", () => {
    const l = normalizeLayout({ spans: { kpis: 6, chart: 5, viejo: 4, activity: "12" } }, IDS);
    expect(l.spans).toEqual({ kpis: 6 });
  });
  it("tolera datos corruptos", () => {
    expect(normalizeLayout({ order: 5, hidden: [1, null], spans: 3 }, IDS)).toEqual(defaultLayout(IDS));
    expect(normalizeLayout("x", IDS)).toEqual(defaultLayout(IDS));
  });
  it("no repite ids", () => {
    expect(normalizeLayout({ order: ["chart", "chart"] }, IDS).order).toEqual(["chart", "kpis", "activity"]);
  });
});

describe("mover, soltar, ocultar y redimensionar", () => {
  it("moveWidget intercambia con el vecino y en el borde no cambia nada", () => {
    const base = defaultLayout(IDS);
    expect(moveWidget(base, "kpis", 1).order).toEqual(["chart", "kpis", "activity"]);
    expect(moveWidget(base, "kpis", -1)).toBe(base);
    expect(moveWidget(base, "activity", 1)).toBe(base);
  });
  it("placeWidget lleva un bloque a una posición exacta", () => {
    expect(placeWidget(defaultLayout(IDS), "activity", 0).order).toEqual(["activity", "kpis", "chart"]);
    expect(placeWidget(defaultLayout(IDS), "kpis", 2).order).toEqual(["chart", "activity", "kpis"]);
  });
  it("toggleWidget oculta y vuelve a mostrar", () => {
    const hidden = toggleWidget(defaultLayout(IDS), "chart");
    expect(hidden.hidden).toEqual(["chart"]);
    expect(toggleWidget(hidden, "chart").hidden).toEqual([]);
  });
  it("setSpan fija el ancho de un bloque", () => {
    expect(setSpan(defaultLayout(IDS), "kpis", 8).spans).toEqual({ kpis: 8 });
  });
  it("isCustomized detecta cualquier cambio", () => {
    expect(isCustomized(defaultLayout(IDS), IDS)).toBe(false);
    expect(isCustomized(setSpan(defaultLayout(IDS), "kpis", 6), IDS)).toBe(true);
    expect(isCustomized(moveWidget(defaultLayout(IDS), "kpis", 1), IDS)).toBe(true);
  });
});
