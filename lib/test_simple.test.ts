import { describe, test } from "vitest";
import { analyzeFile } from "@/lib/apu-importer";

describe("analyzeFile debug", () => {
  test("analyze simple csv", () => {
    const csv = `code,name,unit,category,unitPrice
CEM-001,Cemento Modificado,BOL,MATERIAL,28000`;

    const buffer = new TextEncoder().encode(csv).buffer;
    const preview = analyzeFile({ buffer, fileName: "test.csv", fileSize: buffer.byteLength });
    
    // Just log the preview
    console.log("=== PREVIEW ===");
    console.log(JSON.stringify(preview, null, 2));
  });
});
