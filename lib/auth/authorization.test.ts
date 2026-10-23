import { describe, expect, test } from "vitest";
import { createAuth, canGovernBudgetRole, type NexusRole } from "./authorization";

const makeCtx = (role: NexusRole) => ({
  userId: "u1",
  tenantId: "t1",
  role,
});

describe("createAuth (guarda unificado de roles D7)", () => {
  const roles: NexusRole[] = ["SUPERADMIN", "OWNER", "STAFF"];

  for (const role of roles) {
    const ctx = makeCtx(role);
    const auth = createAuth(ctx);

    describe(`rol: ${role}`, () => {
      // --- Presupuesto ---
      test("canApproveBaseline", () => {
        const expected = role === "SUPERADMIN" || role === "OWNER";
        expect(auth.canApproveBaseline().ok).toBe(expected);
      });

      test("canToggleLock", () => {
        const expected = role === "SUPERADMIN" || role === "OWNER";
        expect(auth.canToggleLock().ok).toBe(expected);
      });

      test("canEditAiu", () => {
        const expected = role === "SUPERADMIN" || role === "OWNER";
        expect(auth.canEditAiu().ok).toBe(expected);
      });

      test("canCreateChapter", () => {
        // STAFF y arriba
        const expected = role !== "STAFF" || role === "STAFF"; // todos los roles válidos
        expect(auth.canCreateChapter().ok).toBe(true);
      });

      test("canCreateItem", () => {
        expect(auth.canCreateItem().ok).toBe(true);
      });

      test("canUpdateChapter", () => {
        expect(auth.canUpdateChapter().ok).toBe(true);
      });

      test("canUpdateItem", () => {
        expect(auth.canUpdateItem().ok).toBe(true);
      });

      test("canDeleteChapter", () => {
        expect(auth.canDeleteChapter().ok).toBe(true);
      });

      test("canDeleteItem", () => {
        expect(auth.canDeleteItem().ok).toBe(true);
      });

      test("canVerifyTotals", () => {
        expect(auth.canVerifyTotals().ok).toBe(true);
      });

      // --- Proyecto ---
      test("canChangeProjectStatus", () => {
        const expected = role === "SUPERADMIN" || role === "OWNER";
        expect(auth.canChangeProjectStatus().ok).toBe(expected);
      });

      test("canEditProjectContent", () => {
        // OWNER, STAFF, SUPERADMIN
        expect(auth.canEditProjectContent().ok).toBe(true);
      });

      test("canCreateProject", () => {
        const expected = role === "SUPERADMIN" || role === "OWNER";
        expect(auth.canCreateProject().ok).toBe(expected);
      });

      test("canUpdateProjectHeader", () => {
        expect(auth.canUpdateProjectHeader().ok).toBe(true);
      });

      // --- Bitácora ---
      test("canCreateFieldLogEntry", () => {
        expect(auth.canCreateFieldLogEntry().ok).toBe(true);
      });

      test("canDeleteFieldLogEntry", () => {
        const expected = role === "SUPERADMIN" || role === "OWNER";
        expect(auth.canDeleteFieldLogEntry().ok).toBe(expected);
      });

      // --- Lean ---
      test("canCreateLookaheadTask", () => {
        expect(auth.canCreateLookaheadTask().ok).toBe(true);
      });

      test("canCreateWeeklyCommitment", () => {
        expect(auth.canCreateWeeklyCommitment().ok).toBe(true);
      });
    });
  }

  test("razón correcta en denegación", () => {
    const staff = createAuth(makeCtx("STAFF"));
    expect(staff.canApproveBaseline()).toEqual({ ok: false, reason: "FORBIDDEN" });
    expect(staff.canChangeProjectStatus()).toEqual({ ok: false, reason: "NOT_OWNER" });
  });
});

describe("canGovernBudgetRole (helper directo)", () => {
  test("SUPERADMIN y OWNERS gobiernan", () => {
    expect(canGovernBudgetRole("SUPERADMIN")).toBe(true);
    expect(canGovernBudgetRole("OWNER")).toBe(true);
  });
  test("STAFF no gobierna", () => {
    expect(canGovernBudgetRole("STAFF")).toBe(false);
  });
});