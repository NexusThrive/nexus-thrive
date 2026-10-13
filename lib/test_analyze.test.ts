import { describe, test, expect } from "vitest";
import { analyzeFile } from "@/lib/apu-importer";

describe("analyzeFile test", () => {
  test("analyze simple csv", () => {
    const csv = `code,name,unit,category,unitPrice
CEM-001,Cemento Modificado,BOL,MATERIAL,28000`;

    const buffer = new TextEncoder().encode(csv).buffer;
    const preview = analyzeFile({ buffer, fileName: "test.csv", fileSize: buffer.byteLength });
    console.log("Preview:", JSON.stringify(preview, null, 2));
    expect(preview.rows.length).toBe(1); // 1 data row
    expect(preview.mapping.length).toBeGreaterThan(0);
  });
});
