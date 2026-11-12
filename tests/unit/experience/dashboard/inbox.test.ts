import { describe, expect, it } from "vitest";
import { filterInbox, groupByDay, inboxCounts, kindsPresent, readKey, type InboxItem } from "@/lib/experience/dashboard/inbox";

const item = (over: Partial<InboxItem> & { id: string }): InboxItem => ({ kind: "payment", title: "Cobro registrado", detail: "Laura", at: "2026-11-12T15:00:00.000Z", href: "/finanzas", read: false, archived: false, ...over });

describe("buzón de notificaciones", () => {
  const items = [
    item({ id: "a", severity: "urgent", kind: "task", title: "2 tareas vencidas", detail: "Hazlas hoy" }),
    item({ id: "b", read: true }),
    item({ id: "c", kind: "booking", title: "Cita hoy · Corte", detail: "Camila" }),
    item({ id: "d", archived: true, title: "Gasto antiguo", kind: "expense" }),
  ];

  it("la pestaña «todas» no muestra lo archivado y «archivadas» solo eso", () => {
    expect(filterInbox(items, { filter: "all", kind: "all", text: "" }).map((n) => n.id)).toEqual(["a", "b", "c"]);
    expect(filterInbox(items, { filter: "archived", kind: "all", text: "" }).map((n) => n.id)).toEqual(["d"]);
  });

  it("sin leer, urgentes, tipo y búsqueda", () => {
    expect(filterInbox(items, { filter: "unread", kind: "all", text: "" }).map((n) => n.id)).toEqual(["a", "c"]);
    expect(filterInbox(items, { filter: "urgent", kind: "all", text: "" }).map((n) => n.id)).toEqual(["a"]);
    expect(filterInbox(items, { filter: "all", kind: "booking", text: "" }).map((n) => n.id)).toEqual(["c"]);
    expect(filterInbox(items, { filter: "all", kind: "all", text: "  CAMILA " }).map((n) => n.id)).toEqual(["c"]);
  });

  it("cuenta cada pestaña sin contar lo archivado como pendiente", () => {
    expect(inboxCounts(items)).toEqual({ all: 3, unread: 2, urgent: 1, archived: 1 });
  });

  it("solo ofrece los tipos que hay, ordenados", () => {
    expect(kindsPresent(items)).toEqual(["booking", "payment", "expense", "task"].sort((a, b) => ({ booking: "Citas", payment: "Cobros", expense: "Gastos", task: "Tareas" } as Record<string, string>)[a]!.localeCompare(({ booking: "Citas", payment: "Cobros", expense: "Gastos", task: "Tareas" } as Record<string, string>)[b]!, "es")));
    expect(new Set(kindsPresent(items))).toEqual(new Set(["task", "payment", "booking", "expense"]));
  });

  it("agrupa por día de Bogotá con Hoy y Ayer, lo más reciente primero", () => {
    const now = new Date("2026-11-12T20:00:00.000Z");
    const groups = groupByDay(
      [
        { at: "2026-11-11T14:00:00.000Z" },
        { at: "2026-11-12T16:00:00.000Z" },
        { at: "2026-11-12T10:00:00.000Z" },
        { at: "2026-11-09T14:00:00.000Z" },
      ],
      now,
    );
    expect(groups.map((g) => g.day)).toEqual(["Hoy", "Ayer", "Lunes, 9 de noviembre"]);
    expect(groups[0]!.items.map((i) => i.at)).toEqual(["2026-11-12T16:00:00.000Z", "2026-11-12T10:00:00.000Z"]);
  });

  it("la marca de leída usa un prefijo propio", () => {
    expect(readKey("abc")).toBe("read:abc");
  });
});
