import { describe, expect, test } from "vitest";
import { normalizeDocument } from "./parties-db";

describe("normalizeDocument", () => {
  test.each([
    ["1.023.456-789", "1023456789"],
    [" 900 123 456 ", "900123456"],
    ["ab-12", "AB12"],
    ["", null],
    ["  ", null],
    ["---", null],
    [null, null],
    [undefined, null],
  ])("%j → %j", (raw, expected) => expect(normalizeDocument(raw)).toBe(expected));
});
