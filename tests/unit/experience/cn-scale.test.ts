import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn con la escala tipográfica (DR-02)", () => {
  it("text-ui y text-2xs no pisan el color", () => {
    expect(cn("text-muted-foreground", "text-ui")).toBe("text-muted-foreground text-ui");
    expect(cn("text-foreground text-2xs")).toBe("text-foreground text-2xs");
  });
  it("son tamaños: el último gana entre tamaños", () => {
    expect(cn("text-xs", "text-ui")).toBe("text-ui");
    expect(cn("text-ui", "text-sm")).toBe("text-sm");
  });
});
