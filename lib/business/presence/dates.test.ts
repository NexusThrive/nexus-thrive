import { describe, expect, it } from "vitest";
import { toIso } from "./dates";

describe("toIso", () => {
  it("null y vacío", () => {
    expect(toIso(null)).toBeNull();
    expect(toIso(undefined)).toBeNull();
  });

  it("Date", () => {
    expect(toIso(new Date("2026-10-19T00:02:34.082Z"))).toBe("2026-10-19T00:02:34.082Z");
  });

  it("Temporal por epochMilliseconds", () => {
    const temporal = { epochMilliseconds: 1_761_000_000_000 };
    expect(toIso(temporal)).toBe(new Date(1_761_000_000_000).toISOString());
  });

  it("ISO con nanosegundos (Temporal impreso)", () => {
    expect(toIso("2026-10-19T00:02:34.082877+00:00")).toBe("2026-10-19T00:02:34.082Z");
  });

  it("fecha inválida", () => {
    expect(toIso("no-es-fecha")).toBeNull();
  });
});
