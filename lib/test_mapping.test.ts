import { describe, test } from "vitest";
import { analyzeFile } from "@/lib/apu-importer";

describe("mapping test", () => {
  test("mapping detection", () => {
    const csv = `code,name,unit,category,unitPrice
CEM-001,Cemento Modificado,BOL,MATERIAL,28000`;

    const buffer = new TextEncoder().encode(csv).buffer;
    const preview = analyzeFile({ buffer, fileName: "test.csv", fileSize: buffer.byteLength });
    
    console.log("Mapping:", JSON.stringify(preview.mapping, null, 2));
    console.log("Columns:", JSON.stringify(preview.columns, null, 2));
  });
});
