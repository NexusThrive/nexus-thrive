import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { parseMasterPack } from "./master-pack";
import { buildMasterPackPlan } from "./master-pack-plan";

/**
 * Verificación contra un pack real. Se salta salvo que exista
 * MASTER_PACK_FILE=/ruta/al/archivo.xlsx (el archivo no se versiona).
 */
const FILE = process.env.MASTER_PACK_FILE;

describe.skipIf(!FILE)("parseMasterPack (archivo real)", () => {
  const buffer = FILE ? readFileSync(FILE) : Buffer.alloc(0);
  const parsed = FILE
    ? parseMasterPack(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
    : null;

  test("lee todas las hojas", () => {
    const p = parsed!;
    console.log({
      chapters: p.chapters.length,
      activities: p.activityRows.length,
      apus: p.apus.length,
      lines: p.apus.reduce((n, a) => n + a.lines.length, 0),
      auxiliaries: p.auxiliaries.length,
      auxLines: p.auxiliaries.reduce((n, a) => n + a.lines.length, 0),
      materials: p.materials.length,
      withImage: p.materials.filter((m) => m.imageSha256).length,
      uniqueImages: p.images.size,
      unassignedImages: p.unassignedImages,
      warnings: p.warnings.slice(0, 5),
    });
    expect(p.apus.length).toBeGreaterThan(0);
    expect(p.warnings).toEqual([]);
  });

  test("cada APU: suma de parciales = costo directo del archivo", () => {
    const p = parsed!;
    const bad = [...p.apus, ...p.auxiliaries].filter((apu) => {
      const sum = apu.lines.reduce((n, l) => n + Number(l.partial), 0);
      return apu.totalCost !== null && Math.abs(sum - Number(apu.totalCost)) > 1;
    });
    expect(bad.map((a) => a.code ?? a.name)).toEqual([]);
  });

  test("plan: el costo calculado de cada APU coincide con el archivo", () => {
    const plan = buildMasterPackPlan(parsed!);
    console.log({
      items: plan.items.length,
      percentItems: plan.items.filter((i) => i.isPercent).length,
      auxLinked: plan.items.filter((i) => i.auxiliarySourceKey).length,
      withImage: plan.items.filter((i) => i.imageSha256).length,
      activities: plan.activities.length,
      lines: plan.lineCount,
      priceConflicts: plan.priceConflicts,
      mismatches: plan.mismatches.slice(0, 5),
      byCategory: plan.items.reduce<Record<string, number>>((acc, i) => {
        acc[i.category] = (acc[i.category] ?? 0) + 1;
        return acc;
      }, {}),
    });
    expect(plan.mismatches).toEqual([]);
    expect(plan.lineCount).toBe(
      parsed!.apus.reduce((n, a) => n + a.lines.length, 0) +
        parsed!.auxiliaries.reduce((n, a) => n + a.lines.length, 0),
    );
  });
});
