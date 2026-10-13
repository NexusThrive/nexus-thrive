import { describe, test, expect } from "vitest";
import { parseFile } from "@/lib/apu-importer/parser";

describe("parser test", () => {
  test("parse simple csv", () => {
    const csv = `code,name,unit,category,unitPrice
CEM-001,Cemento Modificado,BOL,MATERIAL,28000`;

    const buffer = new TextEncoder().encode(csv).buffer;
    const parsed = parseFile({ buffer, fileName: "test.csv" });
    console.log("Rows:", JSON.stringify(parsed.rows, null, 2));
    console.log("Block mode:", parsed.blockMode);
    expect(parsed.rows.length).toBe(2); // header + 1 data row
    expect(parsed.rows[0].length).toBe(5); // 5 columns
  });
});
