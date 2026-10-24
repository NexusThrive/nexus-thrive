import { describe, expect, it } from "vitest";
import { parseCustomers, parseProducts } from "./rows";

const t = (headers: string[], ...rows: string[][]) => ({ headers, rows });

describe("parseProducts", () => {
  it("acepta alias, formatos colombianos y valores por defecto", () => {
    const r = parseProducts(t(["Producto", "Código", "Valor", "Unidad", "IVA"], ["Café", "C-1", "$ 12.500,50", "kg", "19%"], ["Asesoría", "S-1", "80000", "", ""]));
    expect(r.errors).toEqual([]);
    expect(r.rows[0]?.data).toMatchObject({ name: "Café", sku: "C-1", price: 12500.5, unitCode: "KGM", taxRatePct: 19, kind: "PRODUCT", trackStock: true });
    expect(r.rows[1]?.data).toMatchObject({ unitCode: "EA", taxCategory: "GRAVADO", active: true });
  });
  it("los servicios no controlan existencias", () => {
    const r = parseProducts(t(["Nombre", "Precio", "Tipo", "Controla existencias"], ["Corte", "20000", "Servicio", "Sí"]));
    expect(r.rows[0]?.data.trackStock).toBe(false);
  });
  it("reporta cada error con su fila y sigue con las demás", () => {
    const r = parseProducts(t(["Nombre", "SKU", "Precio", "Unidad", "Activo"], ["A", "x", "10", "", ""], ["Bueno", "k1", "abc", "", ""], ["Otro", "K1", "5", "parsec", "tal vez"], ["Fino", "k1", "5", "", ""], ["Ok", "", "7", "", ""]));
    expect(r.rows.map((x) => x.line)).toEqual([6]);
    expect(r.errors.map((e) => e.line)).toEqual([2, 3, 4, 5]);
    expect(r.errors[0]?.message).toContain("nombre");
    expect(r.errors[1]?.message).toContain("Precio inválido");
    expect(r.errors[2]?.message).toMatch(/Unidad no reconocida.*Activo|Unidad no reconocida/);
    expect(r.errors[3]?.message).toContain("fila 3");
  });
  it("sin columnas obligatorias no procesa filas", () => {
    expect(parseProducts(t(["Marca"], ["x"])).missingColumns).toEqual(["Nombre", "Precio"]);
  });
});

describe("parseCustomers", () => {
  it("normaliza documento, correo y etiquetas", () => {
    const r = parseCustomers(t(["Nombre completo", "Cédula", "Email", "Celular", "Etiquetas"], ["Ana Gómez", "1.020.304-050", "ANA@Correo.com", "300 123 4567", "VIP; vip; referido"]));
    expect(r.rows[0]?.data).toEqual({ name: "Ana Gómez", documentId: "1020304050", email: "ana@correo.com", phone: "300 123 4567", city: null, tags: ["VIP", "vip", "referido"] });
  });
  it("detecta correo/teléfono inválidos y documentos repetidos en el archivo", () => {
    const r = parseCustomers(t(["Nombre", "Documento", "Correo", "Teléfono"], ["Ana", "10", "malo", "12"], ["Beto", "20", "", ""], ["Beto Dos", "20", "", ""]));
    expect(r.errors.map((e) => e.line)).toEqual([2, 4]);
    expect(r.errors[0]?.message).toContain("Correo inválido");
    expect(r.errors[0]?.message).toContain("Teléfono inválido");
    expect(r.errors[1]?.message).toContain("fila 3");
  });
});
