import { describe, test } from "vitest";

describe("header detection test", () => {
  test("find header row logic", () => {
    const rows = [
      ["code", "name", "unit", "category", "unitPrice"],
      ["CEM-001", "Cemento Modificado", "BOL", "MATERIAL", "28000"]
    ];

    const candidateFields = ["code", "name", "unit", "unitPrice", "quantity", "category"];
    const HEADER_SCORE_MIN = 50;
    const HEADER_MIN_MATCHES = 2;

    for (let r = 0; r < Math.min(2, 15); r += 1) {
      const cells = r === 0 ? ["code", "name", "unit", "category", "unitPrice"] : ["CEM-001", "Cemento Modificado", "BOL", "MATERIAL", "28000"];
      let score = 0;
      let matches = 0;
      for (const cell of r === 0 ? ["code", "name", "unit", "category", "unitPrice"] : ["CEM-001", "Cemento Modificado", "BOL", "MATERIAL", "28000"]) {
        if (!cell.trim()) continue;
        const fieldScore = Math.max(
          ...["code", "name", "unit", "unitPrice", "quantity", "category"].map((f) => {
            const h = cell.toLowerCase().trim();
            const f_lower = f.toLowerCase();
            if (h === f_lower) return 100;
            if (h.includes(f) || f.includes(h)) return 75;
            return 0;
          })
        );
        if (fieldScore >= 50) {
          matches += 1;
        }
      }
      console.log(`Row: score, matches`);
    }
  });
});
