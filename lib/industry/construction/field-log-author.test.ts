import { describe, expect, test } from "vitest";
import { buildAuthorFromMember, assertNoAuthorOverride } from "./field-log-author";

describe("buildAuthorFromMember (autor de bitácora desde sesión)", () => {
  test("deriva nombre del miembro y rol del contexto", () => {
    const author = buildAuthorFromMember(
      { name: "Juan Pérez", email: "juan@ejemplo.com" },
      "STAFF",
    );
    expect(author.authorName).toBe("Juan Pérez");
    expect(author.authorRole).toBe("STAFF");
  });

  test("usa email si nombre es null/undefined", () => {
    const author = buildAuthorFromMember(
      { name: null, email: "juan@ejemplo.com" },
      "OWNER",
    );
    expect(author.authorName).toBe("juan@ejemplo.com");
    expect(author.authorRole).toBe("OWNER");
  });

  test("usa 'Usuario' si miembro es null", () => {
    const author = buildAuthorFromMember(null, "SUPERADMIN");
    expect(author.authorName).toBe("Usuario");
    expect(author.authorRole).toBe("SUPERADMIN");
  });

  test("trim del nombre", () => {
    const author = buildAuthorFromMember(
      { name: "  Juan Pérez  ", email: "juan@ejemplo.com" },
      "STAFF",
    );
    expect(author.authorName).toBe("Juan Pérez");
  });
});

describe("assertNoAuthorOverride (anti-suplantación)", () => {
  test("lanza si payload tiene authorName", () => {
    expect(() =>
      assertNoAuthorOverride({ authorName: "Hacker", type: "DIARIO" }),
    ).toThrow("El autor se deriva de la sesión; no se puede sobrescribir.");
  });

  test("lanza si payload tiene authorRole", () => {
    expect(() =>
      assertNoAuthorOverride({ authorRole: "OWNER", type: "DIARIO" }),
    ).toThrow("El autor se deriva de la sesión; no se puede sobrescribir.");
  });

  test("no lanza si payload no tiene campos de autor", () => {
    expect(() =>
      assertNoAuthorOverride({ type: "DIARIO", title: "Test" }),
    ).not.toThrow();
  });
});