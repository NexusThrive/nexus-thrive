import { describe, test } from "vitest";
import { analyzeFile } from "@/lib/apu-importer";
import * as fs from "fs";

describe("mapping test", () => {
  test("mapping detection", () => {
    const csv = `code,name,unit,category,unitPrice
CEM-001,Cemento Modificado,BOL,MATERIAL,28000`;

    const buffer = new TextEncoder().encode(csv).buffer;
    const preview = analyzeFile({ buffer, fileName: "test.csv", fileSize: buffer.byteLength });
    
    fs.writeFileSync('/tmp/mapping.json', JSON.stringify({
      mapping: preview.mapping,
      columns: preview.columns,
      rows: preview.rows.map(r => ({raw: r.raw, values: r.values}))
    }, null, 2));
  });
});
