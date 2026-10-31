import { describe, expect, test } from "vitest";
import { withinLimit } from "@/lib/foundation/limits";

describe("límites", () => {
  test("límites", () => {
    expect(withinLimit(null, 10_000)).toBe(true);
    expect(withinLimit(3, 2)).toBe(true);
    expect(withinLimit(3, 3)).toBe(false);
  });
});
