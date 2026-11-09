import { describe, expect, it } from "vitest";
import {
  applySearch,
  countOptions,
  groupRows,
  groupingLabel,
  isAdvanced,
  parseSearchState,
  writeSearchState,
  type SearchDefs,
} from "@/lib/foundation/list-search";

type Row = { name: string; city: string; kind: "PERSON" | "COMPANY"; owed: number; tags: string[] };

const rows: Row[] = [
  { name: "María Pérez", city: "Bogotá", kind: "PERSON", owed: 0, tags: ["vip"] },
  { name: "Carlos Rodríguez", city: "Medellín", kind: "PERSON", owed: 1800, tags: [] },
  { name: "Ferretería Sol", city: "Bogotá", kind: "COMPANY", owed: 420, tags: ["vip", "mayorista"] },
];

const defs: SearchDefs<Row> = {
  fields: [
    { id: "nombre", label: "Nombre", defaultOn: true, get: (r) => r.name },
    { id: "ciudad", label: "Ciudad", defaultOn: false, get: (r) => r.city },
  ],
  filterGroups: [
    { id: "tipo", options: [
      { id: "personas", label: "Personas", test: (r) => r.kind === "PERSON" },
      { id: "empresas", label: "Empresas", test: (r) => r.kind === "COMPANY" },
    ] },
    { id: "cartera", options: [{ id: "saldo", label: "Con saldo", test: (r) => r.owed > 0 }] },
  ],
  groupings: [
    { id: "ciudad", label: "Ciudad", icon: "map-pin", system: true, keys: (r) => [{ key: r.city, label: r.city }] },
    { id: "etiqueta", label: "Etiqueta", icon: "tag", system: true, keys: (r) => r.tags.map((t) => ({ key: t, label: t })) },
  ],
  ruleFields: [{ id: "ciudad", label: "Ciudad", get: (r) => [r.city] }],
};

describe("búsqueda avanzada de listas", () => {
  it("busca sin importar tildes y solo en los campos activos", () => {
    const base = parseSearchState(new URLSearchParams("q=maria"), defs);
    expect(applySearch(rows, defs, base).map((r) => r.name)).toEqual(["María Pérez"]);
    const porCiudad = parseSearchState(new URLSearchParams("q=medellin"), defs);
    expect(applySearch(rows, defs, porCiudad)).toHaveLength(0);
    const conCiudad = parseSearchState(new URLSearchParams("q=medellin&en=nombre,ciudad"), defs);
    expect(applySearch(rows, defs, conCiudad)).toHaveLength(1);
  });

  it("combina con O dentro de un grupo y con Y entre grupos", () => {
    const ambos = parseSearchState(new URLSearchParams("filtros=personas,empresas"), defs);
    expect(applySearch(rows, defs, ambos)).toHaveLength(3);
    const conSaldo = parseSearchState(new URLSearchParams("filtros=personas,empresas,saldo"), defs);
    expect(applySearch(rows, defs, conSaldo).map((r) => r.name)).toEqual(["Carlos Rodríguez", "Ferretería Sol"]);
  });

  it("cuenta cuántos quedarían al activar cada opción", () => {
    const state = parseSearchState(new URLSearchParams("filtros=saldo"), defs);
    expect(countOptions(rows, defs, state)).toEqual({ personas: 1, empresas: 1, saldo: 2 });
  });

  it("agrupa en cascada y una fila puede caer en varios grupos", () => {
    const tree = groupRows(rows, defs, ["etiqueta", "ciudad"]);
    expect(tree.map((n) => [n.label, n.count])).toEqual([["mayorista", 1], ["vip", 2], ["Sin asignar", 1]]);
    expect(tree[1].children.map((n) => [n.label, n.count])).toEqual([["Bogotá", 2]]);
    expect(groupingLabel(defs, ["etiqueta", "ciudad"])).toBe("Etiqueta > Ciudad");
  });

  it("aplica reglas personalizadas y descarta lo desconocido de la URL", () => {
    const state = parseSearchState(new URLSearchParams("regla=ciudad:is:Bogotá&regla=raro:is:x&filtros=nada&grupo=zzz"), defs);
    expect(state.rules).toHaveLength(1);
    expect(state.filters).toEqual([]);
    expect(state.groups).toEqual([]);
    expect(applySearch(rows, defs, state)).toHaveLength(2);
  });

  it("ida y vuelta por la URL y detección de búsqueda avanzada", () => {
    const state = parseSearchState(new URLSearchParams("filtros=personas&grupo=ciudad&q=ma&regla=ciudad:contains:bog&page=3"), defs);
    expect(isAdvanced(state)).toBe(true);
    const url = writeSearchState(new URLSearchParams("status=active&page=3"), state);
    expect(url.get("page")).toBeNull();
    expect(url.get("status")).toBe("active");
    expect(parseSearchState(url, defs)).toEqual(state);
    expect(isAdvanced(parseSearchState(new URLSearchParams("q=ma"), defs))).toBe(false);
  });
});

describe("grupos exclusivos con opción por defecto", () => {
  const withState: SearchDefs<{ active: boolean }> = {
    fields: [],
    filterGroups: [{ id: "estado", exclusive: true, defaultOption: "activos", options: [
      { id: "activos", label: "Activos", test: (r) => r.active },
      { id: "archivados", label: "Archivados", test: (r) => !r.active },
    ] }],
    groupings: [],
    ruleFields: [],
  };
  const data = [{ active: true }, { active: true }, { active: false }];
  it("sin elección rige la de por defecto y cada conteo supone solo esa opción", () => {
    const state = parseSearchState(new URLSearchParams(""), withState);
    expect(applySearch(data, withState, state)).toHaveLength(2);
    expect(countOptions(data, withState, state)).toEqual({ activos: 2, archivados: 1 });
    const arch = parseSearchState(new URLSearchParams("filtros=archivados"), withState);
    expect(applySearch(data, withState, arch)).toHaveLength(1);
  });
});
