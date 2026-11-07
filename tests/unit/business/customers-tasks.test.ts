import { describe, expect, it } from "vitest";
import { isTaskOverdue, sortTasks, validateTask } from "@/lib/business/customers/tasks";
import { buildNotifications } from "@/lib/experience/dashboard/notifications";

describe("tareas (HU-actividades-01)", () => {
  it("exige qué hay que hacer y una fecha válida", () => {
    expect(validateTask({ title: "Llamar a Camila", dueDay: "2026-11-09" })).toBeNull();
    expect(validateTask({ title: "ab" })).toContain("hacer");
    expect(validateTask({ title: "Llamar", dueDay: "09/11/2026" })).toContain("fecha");
  });
  it("hoy no está vencida; ayer sí; una completada o sin fecha nunca", () => {
    expect(isTaskOverdue({ status: "OPEN", dueDay: "2026-11-06" }, "2026-11-07")).toBe(true);
    expect(isTaskOverdue({ status: "OPEN", dueDay: "2026-11-07" }, "2026-11-07")).toBe(false);
    expect(isTaskOverdue({ status: "DONE", dueDay: "2026-11-01" }, "2026-11-07")).toBe(false);
    expect(isTaskOverdue({ status: "OPEN", dueDay: null }, "2026-11-07")).toBe(false);
  });
  it("las más atrasadas van primero y las sin fecha al final", () => {
    const rows = [{ id: "a", dueDay: null, createdAt: "1" }, { id: "b", dueDay: "2026-11-09", createdAt: "2" }, { id: "c", dueDay: "2026-11-01", createdAt: "3" }];
    expect(sortTasks(rows).map((r) => r.id)).toEqual(["c", "b", "a"]);
  });
  it("la campana avisa las vencidas de la persona, y solo si las hay", () => {
    const base = { movements: [], bookings: [], expiring: 0, expired: 0, todayStart: "2026-11-07T05:00:00.000Z", modules: { finance: false, bookings: false, memberships: false } };
    expect(buildNotifications({ ...base, overdueTasks: 0 })).toEqual([]);
    const n = buildNotifications({ ...base, overdueTasks: 3 });
    expect(n).toHaveLength(1);
    expect(n[0]).toMatchObject({ kind: "task", severity: "urgent", title: "3 tareas vencidas", href: "/tareas" });
    expect(buildNotifications({ ...base, overdueTasks: 1 })[0]!.title).toBe("1 tarea vencida");
  });
});
