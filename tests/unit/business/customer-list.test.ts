import { describe, expect, it } from "vitest";
import { buildCustomerList } from "@/lib/business/customers/customer-list";
import { customerSearchDefs, type CustomerSearchRow } from "@/lib/business/customers/customer-search";
import { EMPTY_SEARCH } from "@/lib/foundation/list-search";

const NOW = Date.parse("2026-11-08T15:00:00Z");
const base: CustomerSearchRow = {
  id: "", name: "", email: "", phone: "", documentId: "", notes: "", city: "", source: "", ownerId: "", ownerName: "", tags: [],
  createdAt: NOW, active: true, kind: "PERSON", groupIds: [], nextAppointment: null, lastVisit: null, owed: 0,
};
const rows: CustomerSearchRow[] = [
  { ...base, id: "1", name: "María Pérez", city: "Bogotá", createdAt: NOW - 1000, nextAppointment: NOW + 86_400_000, lastVisit: NOW - 86_400_000, groupIds: ["g1"] },
  { ...base, id: "2", name: "Carlos Rodríguez", city: "Medellín", createdAt: NOW - 40 * 86_400_000, owed: 1800 },
  { ...base, id: "3", name: "Ferretería Sol", city: "Bogotá", kind: "COMPANY", owed: 420, groupIds: ["g1"] },
  { ...base, id: "4", name: "Antiguo", active: false },
];
const defs = customerSearchDefs({ groups: [{ id: "g1", name: "VIP", icon: "crown" }], owners: [], rows, now: NOW });
const state = (patch: Partial<typeof EMPTY_SEARCH>) => ({ ...EMPTY_SEARCH, ...patch });
const list = (patch: Partial<typeof EMPTY_SEARCH>, sort = "recent") => buildCustomerList({ rows, defs, state: state(patch), sort, page: 1, pageSize: 20 });

describe("lista de clientes con búsqueda avanzada", () => {
  it("sin filtros muestra solo los activos y los archivados con su filtro", () => {
    expect(list({}).ids).toEqual(["3", "1", "2"]);
    expect(list({ filters: ["archivados"] }).ids).toEqual(["4"]);
  });

  it("filtros de agenda y de tipo", () => {
    expect(list({ filters: ["cita-proxima"] }).ids).toEqual(["1"]);
    expect(list({ filters: ["saldo"] }).ids).toEqual(["3", "2"]);
    expect(list({ filters: ["empresas", "saldo"] }).ids).toEqual(["3"]);
    expect(list({ filters: ["este-mes"] }).total).toBe(2);
    expect(list({ filters: ["sin-visitas-90"] }).ids).toEqual(["3", "2"]);
  });

  it("ordena por nombre", () => {
    expect(list({}, "name_asc").ids).toEqual(["2", "3", "1"]);
  });

  it("agrupa por ciudad con conteo y saldo, y por grupo propio con su icono", () => {
    const byCity = list({ groups: ["ciudad"] });
    expect(byCity.groups?.map((g) => [g.label, g.count, g.owed])).toEqual([["Bogotá", 2, 420], ["Medellín", 1, 1800]]);
    const byGroup = list({ groups: ["grupo"] });
    expect(byGroup.groups?.[0]).toMatchObject({ label: "VIP", icon: "crown", count: 2 });
    expect(byGroup.groups?.[1].label).toBe("Sin asignar");
  });

  it("el saldo de un grupo padre no cuenta dos veces al cliente que está en dos subgrupos", () => {
    const twoGroups = [{ ...rows[2], groupIds: ["g1", "g2"] }];
    const twoDefs = customerSearchDefs({ groups: [{ id: "g1", name: "A", icon: "star" }, { id: "g2", name: "B", icon: "crown" }], owners: [], rows: twoGroups, now: NOW });
    const list = buildCustomerList({ rows: twoGroups, defs: twoDefs, state: state({ groups: ["tipo", "grupo"] }), sort: "recent", page: 1, pageSize: 20 });
    expect(list.groups?.[0]).toMatchObject({ label: "Empresas", count: 1, owed: 420 });
    expect(list.groups?.[0]?.children.map((g) => [g.label, g.owed])).toEqual([["A", 420], ["B", 420]]);
  });

  it("texto con varios términos y sin resultados", () => {
    expect(list({ q: "maria|perez" }).ids).toEqual(["1"]);
    expect(list({ q: "maria|bogota" }).total).toBe(0);
    expect(list({ q: "maria|bogota", fields: ["nombre", "notas"] }).total).toBe(0);
    expect(list({ q: "zzz" }).total).toBe(0);
    expect(list({ q: "maria|perez" }).terms).toEqual(["maria", "perez"]);
  });

  it("pagina y corrige la página pedida", () => {
    const paged = buildCustomerList({ rows, defs, state: state({}), sort: "recent", page: 9, pageSize: 2 });
    expect(paged.page).toBe(2);
    expect(paged.ids).toHaveLength(1);
    expect(paged.totalPages).toBe(2);
  });
});
