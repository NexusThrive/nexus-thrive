import { describe, test, expect } from "vitest";

import {
  PROJECT_STATUSES,
  PROJECT_STATUS_TRANSITIONS,
  TERMINAL_PROJECT_STATUSES,
  canChangeProjectStatus,
  canEditProjectContent,
  canTransitionProjectStatus,
  isTerminalProjectStatus,
  isValidProjectStatus,
  nextProjectStatuses,
  projectStatusLabel,
  projectStatusNeedsBaselineWarning,
  type ProjectStatusValue,
} from "./projects";

const CHAIN: ReadonlyArray<ProjectStatusValue> = [
  "DRAFT",
  "BIDDING",
  "APPROVED",
  "IN_EXECUTION",
  "COMPLETED",
];

const ALL: ReadonlyArray<ProjectStatusValue> = PROJECT_STATUSES.map(
  (entry) => entry.value,
);

describe("projects — ciclo de vida del proyecto (ajuste C)", () => {
  test("la cadena completa es válida paso a paso", () => {
    for (let i = 0; i < CHAIN.length - 1; i += 1) {
      expect(canTransitionProjectStatus(CHAIN[i], CHAIN[i + 1])).toBe(true);
    }
  });

  test("no se puede saltear un estado de la cadena", () => {
    expect(canTransitionProjectStatus("DRAFT", "APPROVED")).toBe(false);
    expect(canTransitionProjectStatus("DRAFT", "IN_EXECUTION")).toBe(false);
    expect(canTransitionProjectStatus("DRAFT", "COMPLETED")).toBe(false);
    expect(canTransitionProjectStatus("BIDDING", "IN_EXECUTION")).toBe(false);
    expect(canTransitionProjectStatus("APPROVED", "COMPLETED")).toBe(false);
  });

  test("no se puede retroceder en la cadena", () => {
    expect(canTransitionProjectStatus("BIDDING", "DRAFT")).toBe(false);
    expect(canTransitionProjectStatus("APPROVED", "BIDDING")).toBe(false);
    expect(canTransitionProjectStatus("IN_EXECUTION", "APPROVED")).toBe(false);
    expect(canTransitionProjectStatus("COMPLETED", "IN_EXECUTION")).toBe(false);
  });

  test("CANCELLED es válido desde cualquier estado no terminal", () => {
    for (const status of ["DRAFT", "BIDDING", "APPROVED", "IN_EXECUTION"] as const) {
      expect(canTransitionProjectStatus(status, "CANCELLED")).toBe(true);
    }
    expect(canTransitionProjectStatus("COMPLETED", "CANCELLED")).toBe(false);
    expect(canTransitionProjectStatus("CANCELLED", "CANCELLED")).toBe(false);
  });

  test("COMPLETED y CANCELLED son terminales (ninguna salida)", () => {
    expect(TERMINAL_PROJECT_STATUSES).toEqual(["COMPLETED", "CANCELLED"]);
    expect(isTerminalProjectStatus("COMPLETED")).toBe(true);
    expect(isTerminalProjectStatus("CANCELLED")).toBe(true);
    expect(isTerminalProjectStatus("IN_EXECUTION")).toBe(false);
    for (const terminal of TERMINAL_PROJECT_STATUSES) {
      expect(nextProjectStatuses(terminal)).toHaveLength(0);
      for (const target of ALL) {
        expect(canTransitionProjectStatus(terminal, target)).toBe(false);
      }
    }
  });

  test("cada estado no terminal declara sus salidas (cadena + CANCELLED)", () => {
    expect(PROJECT_STATUS_TRANSITIONS.DRAFT).toEqual(["BIDDING", "CANCELLED"]);
    expect(PROJECT_STATUS_TRANSITIONS.BIDDING).toEqual(["APPROVED", "CANCELLED"]);
    expect(PROJECT_STATUS_TRANSITIONS.APPROVED).toEqual([
      "IN_EXECUTION",
      "CANCELLED",
    ]);
    expect(PROJECT_STATUS_TRANSITIONS.IN_EXECUTION).toEqual([
      "COMPLETED",
      "CANCELLED",
    ]);
    expect(nextProjectStatuses("DRAFT")).toEqual(["BIDDING", "CANCELLED"]);
  });

  test("el grafo cubre los 6 estados del contrato y ninguno más", () => {
    expect(Object.keys(PROJECT_STATUS_TRANSITIONS).sort()).toEqual(
      [...ALL].sort(),
    );
    expect(PROJECT_STATUSES).toHaveLength(6);
    for (const status of ALL) {
      expect(isValidProjectStatus(status)).toBe(true);
    }
    expect(isValidProjectStatus("ARCHIVED")).toBe(false);
    expect(projectStatusLabel("IN_EXECUTION")).toBe("En ejecución");
  });

  test("solo APPROVED e IN_EXECUTION piden advertencia de línea base", () => {
    expect(projectStatusNeedsBaselineWarning("APPROVED")).toBe(true);
    expect(projectStatusNeedsBaselineWarning("IN_EXECUTION")).toBe(true);
    for (const status of ["DRAFT", "BIDDING", "COMPLETED", "CANCELLED"] as const) {
      expect(projectStatusNeedsBaselineWarning(status)).toBe(false);
    }
  });

  test("rol: cambia estado solo OWNER/SUPERADMIN; edita contenido todo miembro", () => {
    expect(canChangeProjectStatus("OWNER")).toBe(true);
    expect(canChangeProjectStatus("SUPERADMIN")).toBe(true);
    expect(canChangeProjectStatus("STAFF")).toBe(false);

    expect(canEditProjectContent("OWNER")).toBe(true);
    expect(canEditProjectContent("STAFF")).toBe(true);
    expect(canEditProjectContent("SUPERADMIN")).toBe(true);
  });
});
