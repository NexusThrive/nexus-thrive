import { describe, expect, it } from "vitest";
import { allDone, canMoveStage, isStage } from "@/lib/business/store/production";

describe("producción (HU-produccion-01)", () => {
  it("las etapas avanzan y una terminada es final", () => {
    expect(canMoveStage("QUEUED", "IN_PROGRESS")).toBe(true);
    expect(canMoveStage("IN_PROGRESS", "DONE")).toBe(true);
    expect(canMoveStage("DONE", "QUEUED")).toBe(false);
    expect(canMoveStage("QUEUED", "QUEUED")).toBe(false);
    expect(isStage("X")).toBe(false);
  });
  it("el pedido está listo solo cuando todas las órdenes están terminadas", () => {
    expect(allDone(["DONE", "DONE"])).toBe(true);
    expect(allDone(["DONE", "IN_PROGRESS"])).toBe(false);
    expect(allDone([])).toBe(false);
  });
});
