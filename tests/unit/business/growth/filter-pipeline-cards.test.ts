import { describe, expect, it } from "vitest";
import { filterPipelineCards } from "@/lib/business/growth/pipeline";

const card = (over: Partial<Parameters<typeof filterPipelineCards>[0][number]> = {}) => ({
  name: "Uniformes",
  value: 1000,
  tags: ["Mayorista"],
  priority: 2,
  expectedClose: "2026-12-01",
  customer: { id: "c1", name: "Colegio San José" },
  owner: { id: "u1", name: "Santiago" },
  ...over,
});

describe("filterPipelineCards (los filtros de siempre, sobre lo ya cargado)", () => {
  const cards = [
    card(),
    card({ name: "Dotación", value: 5000, tags: [], priority: 0, expectedClose: null, customer: null, owner: null }),
    card({ name: "Eventos", value: 9000, tags: ["Empresa"], priority: 3, expectedClose: "2027-01-10", customer: { id: "c2", name: "Banco" }, owner: { id: "u2", name: "Camila" } }),
  ];

  it("sin filtros deja todo y no modifica la lista original", () => {
    const out = filterPipelineCards(cards, {});
    expect(out).toHaveLength(3);
    expect(out).not.toBe(cards);
  });

  it("«mis oportunidades» deja las mías y las que no tienen responsable", () => {
    expect(filterPipelineCards(cards, { mine: true, me: "u1" }).map((c) => c.name)).toEqual(["Uniformes", "Dotación"]);
  });

  it("busca por nombre, cliente, responsable o etiqueta sin importar tildes de mayúsculas", () => {
    expect(filterPipelineCards(cards, { q: "BANCO" }).map((c) => c.name)).toEqual(["Eventos"]);
    expect(filterPipelineCards(cards, { q: "mayorista" }).map((c) => c.name)).toEqual(["Uniformes"]);
    expect(filterPipelineCards(cards, { q: "camila" }).map((c) => c.name)).toEqual(["Eventos"]);
  });

  it("filtra por responsable, etiqueta, prioridad mínima y cliente", () => {
    expect(filterPipelineCards(cards, { ownerId: "u2" }).map((c) => c.name)).toEqual(["Eventos"]);
    expect(filterPipelineCards(cards, { tag: "Empresa" }).map((c) => c.name)).toEqual(["Eventos"]);
    expect(filterPipelineCards(cards, { priority: 2 }).map((c) => c.name)).toEqual(["Uniformes", "Eventos"]);
    expect(filterPipelineCards(cards, { customerId: "c1" }).map((c) => c.name)).toEqual(["Uniformes"]);
  });

  it("las fechas de cierre excluyen lo que no tiene fecha", () => {
    expect(filterPipelineCards(cards, { closeFrom: "2026-12-01", closeTo: "2026-12-31" }).map((c) => c.name)).toEqual(["Uniformes"]);
  });

  it("filtra por rango de valor", () => {
    expect(filterPipelineCards(cards, { valueMin: 2000, valueMax: 6000 }).map((c) => c.name)).toEqual(["Dotación"]);
  });

  it("combina filtros", () => {
    expect(filterPipelineCards(cards, { mine: true, me: "u1", priority: 1 }).map((c) => c.name)).toEqual(["Uniformes"]);
  });
});
