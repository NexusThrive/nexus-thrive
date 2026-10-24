import { describe, expect, it } from "vitest";
import { mapColumns, normalizeHeader, parseBool, parseNumber, readTable, safeCell, toCsv } from "./table";

const buf = (text: string) => new TextEncoder().encode(text).buffer as ArrayBuffer;

describe("parseNumber", () => {
  it.each([
    ["1500", 1500],
    ["1500.5", 1500.5],
    ["1.500,50", 1500.5],
    ["1,500.50", 1500.5],
    ["$ 2.000", 2000],
    ["1.234.567", 1234567],
    ["12,5", 12.5],
    ["0,500", 0.5],
    ["-3", -3],
  ])("%s → %s", (raw, expected) => expect(parseNumber(raw)).toBe(expected));
  it.each(["", "abc", "12a", "1e5", "--1"])("«%s» no es número", (raw) => expect(parseNumber(raw)).toBeNull());
});

describe("parseBool y encabezados", () => {
  it("entiende sí/no", () => {
    expect(parseBool("Sí")).toBe(true);
    expect(parseBool("NO")).toBe(false);
    expect(parseBool("tal vez")).toBeNull();
  });
  it("normaliza encabezados y los mapea por alias", () => {
    expect(normalizeHeader("Teléfono (móvil)")).toBe("telefono movil");
    expect(mapColumns(["Nombre", "Teléfono"], { name: ["nombre"], phone: ["telefono"], city: ["ciudad"] })).toEqual({ name: 0, phone: 1, city: -1 });
  });
});

describe("readTable", () => {
  it("lee un CSV, descarta filas vacías y recorta", () => {
    const r = readTable(buf("nombre,precio\n Café ,1000\n,\nTe,2000\n"), "a.csv");
    expect(r).toEqual({ ok: true, table: { headers: ["nombre", "precio"], rows: [["Café", "1000"], ["Te", "2000"]] } });
  });
  it("rechaza vacío, solo encabezados, extensión rara y exceso de filas", () => {
    expect(readTable(buf(""), "a.csv").ok).toBe(false);
    expect(readTable(buf("a,b\n"), "a.csv")).toMatchObject({ ok: false });
    expect(readTable(buf("a\n1"), "a.exe")).toMatchObject({ ok: false });
    const big = `a\n${Array.from({ length: 5001 }, (_, i) => i + 1).join("\n")}`;
    expect(readTable(buf(big), "a.csv")).toMatchObject({ ok: false, message: expect.stringContaining("5000") });
  });
});

describe("toCsv", () => {
  it("escapa comillas y comas, antepone BOM y neutraliza fórmulas", () => {
    const csv = toCsv(["a", "b"], [['x,"y"', "=SUM(A1)"], ["-5", "-cmd"]]);
    expect(csv.startsWith("﻿a,b\r\n")).toBe(true);
    expect(csv).toContain('"x,""y""",\'=SUM(A1)');
    expect(csv).toContain("-5,'-cmd");
    expect(safeCell("normal")).toBe("normal");
  });
});

describe("codificación", () => {
  it("lee CSV en Windows-1252 (Excel en Windows)", () => {
    const latin1 = new Uint8Array([...new TextEncoder().encode("nombre\n"), 0x43, 0x61, 0x66, 0xe9]).buffer as ArrayBuffer;
    expect(readTable(latin1, "a.csv")).toMatchObject({ ok: true, table: { rows: [["Café"]] } });
  });
});
