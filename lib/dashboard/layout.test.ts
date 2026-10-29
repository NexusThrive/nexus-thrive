import { describe, expect, it } from "vitest";
import { addWidget, defaultLayout, isCustomized, moveWidget, normalizeLayout, placeWidget, removeWidget, setHeight, setSpan, spanFromWidth, stepSpan, toggleWidget } from "./layout";

const IDS = ["kpis", "chart", "activity"] as const;

describe("normalizeLayout", () => {
  it("sin nada guardado devuelve el orden por defecto", () => {
    expect(normalizeLayout(null, IDS)).toEqual(defaultLayout(IDS));
  });
  it("descarta ids desconocidos y coloca los nuevos tras el que los precede por defecto", () => {
    const l = normalizeLayout({ order: ["activity", "viejo"], hidden: ["viejo", "chart"] }, IDS);
    expect(l.order).toEqual(["kpis", "chart", "activity"]);
    expect(l.hidden).toEqual(["chart"]);
  });
  it("lee la v1 (sin tamaños) y la completa", () => {
    const l = normalizeLayout({ order: ["chart", "kpis", "activity"], hidden: [] }, IDS);
    expect(l.v).toBe(3);
    expect(l.spans).toEqual({});
    expect(l.heights).toEqual({});
    expect(l.added).toEqual([]);
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
    expect(normalizeLayout({ order: ["chart", "chart"] }, IDS).order).toEqual(["kpis", "chart", "activity"]);
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

describe("bloques que se dividen", () => {
  it("un diseño guardado con un bloque que ya no existe recibe sus partes en su sitio", () => {
    const ids = ["presence", "kpi-a", "kpi-b", "chart"];
    const l = normalizeLayout({ order: ["chart", "presence", "kpis"], hidden: ["kpis"] }, ids);
    expect(l.order).toEqual(["chart", "presence", "kpi-a", "kpi-b"]);
    expect(l.hidden).toEqual([]);
  });
});

describe("gráficos agregados y redimensionado por esquinas", () => {
  it("addWidget agrega al final con su tamaño y numera sin repetir", () => {
    const a = addWidget(defaultLayout(IDS), "bars", 6, 8);
    expect(a.id).toBe("bars-1");
    expect(a.layout.order).toEqual([...IDS, "bars-1"]);
    expect(a.layout.spans["bars-1"]).toBe(6);
    expect(a.layout.heights["bars-1"]).toBe(8);
    expect(addWidget(a.layout, "bars", 6, 8).id).toBe("bars-2");
  });
  it("lo agregado sobrevive a normalizeLayout y lo inválido se descarta", () => {
    const { layout } = addWidget(defaultLayout(IDS), "donut", 4, 8);
    expect(normalizeLayout(JSON.parse(JSON.stringify(layout)), IDS)).toEqual(layout);
    const l = normalizeLayout({ added: [{ id: "donut-1", type: "donut" }, { id: "x-1", type: "x" }, { id: "bars-2", type: "line" }, { id: "kpis", type: "bars" }] }, IDS);
    expect(l.added).toEqual([{ id: "donut-1", type: "donut" }]);
  });
  it("removeWidget quita solo los agregados y limpia su tamaño", () => {
    const { layout, id } = addWidget(defaultLayout(IDS), "gauge", 4, 6);
    const back = removeWidget(layout, id);
    expect(back).toEqual(defaultLayout(IDS));
    expect(removeWidget(layout, "kpis")).toBe(layout);
  });
  it("setHeight limita el alto entre el mínimo y el máximo", () => {
    expect(setHeight(defaultLayout(IDS), "kpis", 1).heights.kpis).toBe(5);
    expect(setHeight(defaultLayout(IDS), "kpis", 99).heights.kpis).toBe(14);
    expect(setHeight(defaultLayout(IDS), "kpis", 7.4).heights.kpis).toBe(7);
  });
  it("stepSpan avanza por los anchos permitidos y se detiene en los bordes", () => {
    expect(stepSpan(6, 1)).toBe(8);
    expect(stepSpan(6, -1)).toBe(4);
    expect(stepSpan(12, 1)).toBe(12);
    expect(stepSpan(3, -1)).toBe(3);
  });
  it("spanFromWidth se ajusta a la columna más cercana", () => {
    expect(spanFromWidth(600, 100)).toBe(6);
    expect(spanFromWidth(710, 100)).toBe(8);
    expect(spanFromWidth(100, 100)).toBe(3);
    expect(spanFromWidth(5000, 100)).toBe(12);
  });
  it("agregar un gráfico cuenta como personalizado", () => {
    expect(isCustomized(addWidget(defaultLayout(IDS), "line", 6, 8).layout, IDS)).toBe(true);
  });
});
