import { describe, test } from "vitest";
import { analyzeFile } from "@/lib/apu-importer";

describe("analyzeFile debug", () => {
  test("analyze simple csv", () => {
    const csv = `code,name,unit,category,unitPrice
CEM-001,Cemento Modificado,BOL,MATERIAL,28000`;

    const buffer = new TextEncoder().encode(csv).buffer;
    const preview = analyzeFile({ buffer, fileName: "test.csv", fileSize: buffer.byteLength });
    
    // Use vitest's built-in logging
    console.info("=== PREVIEW ===");
    console.info(JSON.stringify(preview, null, 2));
  });
});
