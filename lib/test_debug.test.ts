import { describe, test } from "vitest";
import { parseFile } from "@/lib/apu-importer/parser";

describe("debug parse", () => {
  test("debug parse", () => {
    const csv = `code,name,unit,category,unitPrice
CEM-001,Cemento Modificado,BOL,MATERIAL,28000`;

    const buffer = new TextEncoder().encode(csv).buffer;
    const parsed = parseFile({ buffer, fileName: "test.csv" });
    
    console.log("=== PARSED ROWS ===");
    console.log(JSON.stringify(parsed.rows, null, 2));
    console.log("Row 0:", parsed.rows[0]);
    console.log("Row 1:", parsed.rows[1]);
    console.log("Row 0 type:", typeof parsed.rows[0]);
    console.log("Row 0 length:", parsed.rows[0].length);
    console.log("Row 0[0]:", JSON.stringify(parsed.rows[0][0]));
    console.log("Row 0[1]:", JSON.stringify(parsed.rows[0][1]));
    console.log("Row 0[2]:", JSON.stringify(parsed.rows[0][2]));
    console.log("Row 0[3]:", JSON.stringify(parsed.rows[0][3]));
    console.log("Row 0[4]:", JSON.stringify(parsed.rows[0][4]));
  });
});
