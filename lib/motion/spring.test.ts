import { describe, expect, it } from "vitest";
import { springFrames } from "./spring";
import { expoOut } from "./easing";

describe("springFrames", () => {
  it("termina exactamente en el destino", () => {
    const frames = springFrames(0.94, 1);
    expect(frames[0]).toBe(0.94);
    expect(frames.at(-1)).toBe(1);
  });

  it("rebota por encima del destino con poca amortiguación", () => {
    const frames = springFrames(0, 1, { stiffness: 520, damping: 10 });
    expect(Math.max(...frames)).toBeGreaterThan(1);
  });

  it("no pasa de 152 cuadros (≈2,5 s)", () => {
    expect(springFrames(-10, 0, { stiffness: 50, damping: 1 }).length).toBeLessThanOrEqual(152);
  });
});

describe("expoOut", () => {
  it("va de 0 a 1", () => {
    expect(expoOut(0)).toBe(0);
    expect(expoOut(1)).toBe(1);
    expect(expoOut(0.5)).toBeGreaterThan(0.9);
  });
});
